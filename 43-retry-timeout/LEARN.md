# 📘 Learning Guide: Retry with Timeout & Backoff

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A payments API that sometimes fails. The first two calls return an error ("503 service unavailable"), the third succeeds. Our job: call it again when it fails — but *the right way*.

Run the original:

```
{ charged: 100 }
gave up on: 404 no such customer
```

It works... on the surface. Underneath it commits four classic mistakes: it retries instantly (hammering a struggling server), retries hopeless errors (a 404 will never become a 200), waits forever if the server hangs, and hardcodes "3 attempts" into the very *shape* of the code. The refactor builds two tiny reusable tools — `retry` and `withTimeout` — that fix all four.

## 2. Concepts you need first

### Promises, resolve, and reject

A **Promise** is an object standing for a value that arrives later. It either **resolves** (succeeds) or **rejects** (fails with an error):

```js
const good = Promise.resolve("yay");
const bad = Promise.reject(new Error("nope"));
good.then((v) => console.log(v)); // prints: yay
bad.catch((e) => console.log(e.message)); // prints: nope
```

A promise that *never* settles (`new Promise(() => {})`) just... hangs. Remember that one — it plays a villain later.

### async / await / try / catch

`await` pauses an `async` function until a promise settles. If the promise rejects, `await` **throws** — which you catch with try/catch, just like a normal error:

```js
async function demo() {
  try {
    await Promise.reject(new Error("boom"));
  } catch (e) {
    console.log("caught:", e.message); // prints: caught: boom
  }
}
demo();
```

### setTimeout and sleep

`setTimeout(fn, ms)` schedules `fn` to run after `ms` milliseconds. Wrap it in a promise and you get `sleep` — an awaitable pause:

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(100); // waits 100ms, then continues
```

`clearTimeout(timer)` cancels a scheduled timeout before it fires.

### HTTP error codes: transient vs permanent

Servers answer with status codes. Two families matter here:
- **503 Service Unavailable** — "I'm overloaded right now." Temporary. Trying again later may work. This kind of error is **transient**.
- **404 Not Found** — "that thing doesn't exist." A fact. Asking again won't create it. This kind is **permanent**.

The golden rule: retry transient errors, fail fast on permanent ones.

### Exponential backoff

**Backoff** means waiting between retries. **Exponential** backoff doubles the wait each time: 100ms, 200ms, 400ms, 800ms... In code: `baseDelay * 2 ** (attempt - 1)`, where `**` is the power operator (`2 ** 3` is 8). Why double? A server that's struggling needs *room to recover* — clients that instantly re-hammer it turn a hiccup into an outage.

### Promise.race

`Promise.race([a, b])` settles as soon as the *first* of its promises settles — winner takes all:

```js
const fast = new Promise((r) => setTimeout(() => r("fast"), 10));
const slow = new Promise((r) => setTimeout(() => r("slow"), 500));
console.log(await Promise.race([fast, slow])); // prints: fast
```

Race your real work against a timer that rejects, and you've built a **timeout** — a deadline that turns "hangs forever" into a catchable error.

### Custom error classes

`class TimeoutError extends Error` creates your own error *type*. Why bother? So catchers can tell errors apart with `err instanceof TimeoutError` instead of parsing message strings.

### Options objects and default parameters

A function taking many settings usually accepts one **options object** with **defaults**:

```js
function greet({ name = "friend", loud = false } = {}) {
  console.log(loud ? `HI ${name}!` : `hi ${name}`);
}
greet();                      // prints: hi friend
greet({ name: "Sam", loud: true }); // prints: HI Sam!
```

The `= {}` at the end means "if no object is passed at all, use an empty one."

### Dependency injection (making time testable)

**Dependency injection** = passing a function's tools in as parameters instead of hardcoding them. Here, `retry` receives its `sleep` function as an option. In production it's the real sleep; in tests you pass a fake that returns instantly (tests run in milliseconds) or one that *records* the delays it was asked for (so you can assert they were 100, 200, 400). A stand-in like that is called a **mock**.

## 3. Walking through the original code

The flaky API simulator:

```js
var attempt = 0;
function chargeCard(amount) {
  attempt++;
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      if (attempt < 3) reject(new Error("503 service unavailable"));
      else resolve({ charged: amount });
    }, 50);
  });
}
```

A counter makes calls 1 and 2 reject with a 503, call 3 succeed. Each takes ~50ms.

The retry "logic":

```js
try {
  return await chargeCard(amount);
} catch (e1) {
  try {
    return await chargeCard(amount);       // retry immediately!
  } catch (e2) {
    try {
      return await chargeCard(amount);     // AGAIN, immediately!
    } catch (e3) {
      throw e3;
    }
  }
}
```

Try. If it throws, try again — *immediately*. If that throws, once more. If that throws, give up and rethrow. Three attempts = three pyramid levels of try/catch. The rest of `main()` demos the flaws: it retries a 404 twice more (pointless — the customer will never exist), and the comments point out there's no timeout and no way to say "5 attempts" without two more nesting levels.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: zero delay between retries.** The server said "I'm overwhelmed" and got asked again 50ms later, then again. Now multiply by every user of your app during an outage: thousands of clients all instantly re-hammering a struggling server. Your retries *are* the outage. Polite clients back off exponentially, giving the server air.

**Flaw 2: it retries everything.** A 404 means "no such customer" — a fact about the world, not a temporary glitch. Retrying it is asking the same question louder. How it bites you: a typo'd customer ID turns into 3 API calls, 3 log entries, and 3× the wait before the user sees the real error. At scale, half your API budget is spent re-asking questions with known answers.

**Flaw 3: no timeout.** The demo's failures are polite — they *reject*, which triggers `catch`. But real servers sometimes just never answer. Then `await` waits forever, no catch fires, no retry happens, and the user stares at a spinner until they close the tab. Hangs are sneakier than errors precisely because *nothing happens*.

**Flaw 4: the attempt count is written in indentation.** Three attempts = three nested try/catches. Config-by-code-shape. A number should be a number: `attempts: 5`.

## 5. Try it yourself first!

1. **Vague hint:** Replace the pyramid with a loop. What does one iteration of "attempt, and on failure maybe try again" look like?
2. **Warmer:** `for (let attempt = 1; attempt <= attempts; attempt++) { try { return await fn(); } catch (e) { ... } }` — when do you rethrow instead of continuing?
3. **Backoff:** before the next iteration, `await sleep(base * 2 ** (attempt - 1))`. Write `sleep` from `setTimeout` (see section 2).
4. **Classification:** accept a `shouldRetry(err)` callback option. In the catch: if out of attempts *or* `!shouldRetry(err)`, rethrow.
5. **Timeout (separate tool!):** write `withTimeout(promise, ms)` using `Promise.race` between the promise and a timer that rejects. Don't build it into `retry` — keep them separate and compose: `retry(() => withTimeout(call(), 2000))`.

## 6. Understanding the refactored solution

**Tool 1 — `withTimeout`:**

```js
export function withTimeout(promise, ms) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, deadline])
    .finally(() => clearTimeout(timer));
}
```

A race between your work and a deadline promise that rejects after `ms`. Whichever settles first wins. Two details worth stealing: (1) `.finally(() => clearTimeout(timer))` — always cancel the timer afterwards, or you leak a live timer on every successful call; (2) the rejection is a typed `TimeoutError`, so downstream code can *recognize* timeouts. One honest limitation, stated right in the comment: the losing operation isn't cancelled — JavaScript can't force-stop a promise — but nobody waits on it anymore, which is what matters.

**Tool 2 — `retry`:**

```js
for (let attempt = 1; ; attempt++) {
  try {
    return await fn(attempt);
  } catch (err) {
    const outOfAttempts = attempt >= attempts;
    if (outOfAttempts || !shouldRetry(err)) throw err;
    await sleep(baseDelayMs * 2 ** (attempt - 1));
  }
}
```

The whole pyramid became one loop. Success returns immediately. On error: out of attempts, or an error the caller says isn't worth retrying → rethrow. Otherwise sleep (doubling each time: 100, 200, 400...) and go around again. Every design decision is now a *parameter*: `attempts` is a number, `shouldRetry` is the caller's policy (they know their API's error shapes), `sleep` is injectable for tests.

**The composition:** `retry(() => withTimeout(flakySlowApi(), 20))`. Neither tool knows the other exists — `withTimeout` turns hangs into errors, and `retry` treats those errors like any other failure. Small single-purpose tools snap together; one big "retryWithTimeoutAndBackoff" monolith wouldn't.

**The tests:** `makeFlaky(n)` builds a function that fails n times then succeeds, and counts its calls. Highlights: the backoff test injects a `recordingSleep` and asserts the delays were exactly `[100, 200, 400]` — testing *time* without waiting any; the 404 test asserts exactly **one** call (no pointless hammering); the hung-promise test feeds `new Promise(() => {})` to `withTimeout` and expects a `TimeoutError`; and the finale walks the full story — first call hangs, times out, retry succeeds, total calls: 2.

## 7. Words you learned (glossary)

- **Promise / resolve / reject** — a future value / succeeding / failing.
- **Hang** — a promise that never settles; `await` on it waits forever.
- **Timeout / deadline** — a time limit that converts a hang into an error.
- **Promise.race** — first promise to settle wins.
- **`.finally`** — runs after a promise settles, success or failure.
- **clearTimeout** — cancels a scheduled setTimeout.
- **503 / 404** — "server overloaded (temporary)" / "doesn't exist (permanent)".
- **Transient error** — temporary; retrying may help.
- **Permanent error** — a fact; retrying is waste.
- **Fail fast** — surface a permanent error immediately instead of stalling.
- **Backoff / exponential backoff** — waiting between retries / doubling the wait each time.
- **`**`** — the power operator; `2 ** 3` is 8.
- **Custom error class** — your own error type, recognizable via `instanceof`.
- **Options object** — one parameter object holding named settings with defaults.
- **Dependency injection** — passing tools (like `sleep`) in as parameters.
- **Mock** — a fake stand-in used in tests (instant sleep, recording sleep).
- **Composition** — small independent tools combined: `retry(() => withTimeout(...))`.

## 8. Experiments to try on the plane (no internet needed)

1. **Print the schedule.** In a scratch file, call `retry` on a function that always throws, with `attempts: 5, baseDelayMs: 100` and a recording sleep (`(ms) => { console.log("waiting", ms); return Promise.resolve(); }`). Expected: `waiting 100, 200, 400, 800` — four waits for five attempts (no wait after the last).
2. **Feel a hang.** Run `await new Promise(() => {})` in a small async main. Expected: the program never prints anything after it and never exits (Ctrl+C to kill). Now wrap it in `withTimeout(..., 500)` with try/catch. Expected: after half a second, "Timed out after 500ms".
3. **Swap the backoff strategy.** Change the sleep line to `baseDelayMs * attempt` (linear: 100, 200, 300). Expected: the recording-sleep test's `[100, 200, 400]` becomes `[100, 200, 300]` — one line changed one policy; nothing else moved.
4. **Write a smarter `shouldRetry`.** `(err) => err instanceof TimeoutError || err.message.startsWith("503")`. Test it against a 404, a 503, and a hang wrapped in `withTimeout`. Expected: 404 → 1 call; 503 and timeout → retried.
5. **Leak a timer on purpose.** Remove the `.finally(() => clearTimeout(timer))` line, call `withTimeout(Promise.resolve("fast"), 5000)`, and print the result. Expected: you get "fast" immediately — but node keeps running ~5 more seconds before exiting, because the forgotten timer is still alive. Put the line back and it exits instantly.
