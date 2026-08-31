# 📘 Learning Guide: Rate Limiter

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **rate limiter**: the thing that decides whether a request is allowed through or gets a "429 Too Many Requests". Every API you have ever used has one — it's what stops a single client (or a bug, or an attack) from consuming the whole server.

```
allow("ada") -> true    (1/5 this second)
allow("ada") -> true    (2/5)
...
allow("ada") -> true    (5/5)
allow("ada") -> false   BLOCKED
```

The obvious implementation counts requests and resets the count each second. That version lets **double** the limit through at the exact moment the second changes — and, more importantly, it is *impossible to test* without sitting and waiting. Both problems have the same root, and fixing the root fixes both.

## 2. Concepts you need first

### `Date.now()` and milliseconds

`Date.now()` returns the number of milliseconds since 1 January 1970 — a big integer that goes up:

```js
console.log(Date.now()); // prints something like: 1787000000000
```

Divide by 1000 and floor it and you get "which second are we in":

```js
console.log(Math.floor(1787000000999 / 1000)); // prints: 1787000000
console.log(Math.floor(1787000001001 / 1000)); // prints: 1787000001  <- ticked over
```

Those two moments are **2 milliseconds apart** and land in different seconds. Hold onto that; it's the entire bug.

### Fixed window vs sliding window

A **fixed window** chops time into buckets the calendar chose and counts inside each:

```
   second 0            second 1
|.....5 used....|.....5 used....|
              ^^^^^^^^^^
              10 requests in ~20ms
```

Nothing is wrong with either bucket individually — 5 in second 0, 5 in second 1. But a user who saves their budget for the seam gets **twice the limit** in a blink.

A **sliding window** asks the question relative to *now*:

```
                    [<-- last 1000ms -->]
                                        ^ now
```

There is no seam to aim at, because the window moves with you. The refactor implements this by keeping the **timestamp of every recent request** and counting how many are newer than `now - windowMs`.

### Filtering by a cutoff

The sliding window is one `filter` away:

```js
const now = 1500;
const windowMs = 1000;
const hits = [200, 700, 1400];
console.log(hits.filter((at) => at > now - windowMs)); // prints: [ 700, 1400 ]
```

The request at 200 is older than 500ms-ago-minus-a-second, so it drops out. Nothing is "reset"; things simply age out one at a time.

### Token buckets, and computing state from elapsed time

A **token bucket** holds up to `capacity` tokens, refills steadily, and each request spends one. The clever part: **no timer refills it**. You compute the tokens when someone asks:

```js
const refillPerMs = 2 / 1000;         // 2 tokens per second
let tokens = 0, updatedAt = 0;
const now = 1500;
tokens = Math.min(5, tokens + (now - updatedAt) * refillPerMs);
console.log(tokens); // prints: 3
```

1500ms of idling bought 3 tokens. This is project 46's lesson exactly: **derive state from the clock at read time; never accumulate it from ticks.** A `setInterval` that adds a token every 500ms would drift, break in a throttled tab, and keep the process alive; this arithmetic cannot.

`Math.min(capacity, ...)` is what stops a client from idling all week and then firing 600,000 requests.

### Dependency injection — passing the clock in

This is the idea the project exists to teach.

```js
// Untestable: the function reaches out and grabs the clock.
function allow() { const second = Math.floor(Date.now() / 1000); /* ... */ }

// Testable: the clock is handed to it.
class Limiter {
  constructor({ now = Date.now } = {}) { this.#now = now; }
}
```

Notice `now = Date.now` as a **default parameter**: production code calls `new Limiter({ limit: 5, windowMs: 1000 })` and never thinks about it. Tests pass `now: () => clock`. Same class, no test-only branches, no `if (process.env.TESTING)`.

Then a test can do this:

```js
let clock = 0;
const now = () => clock;
clock = 970;  /* five requests */
clock = 1010; /* five more     */
```

An hour of elapsed time, zero seconds of waiting, identical every run. Compare that with `original.js`, which has to **busy-wait for a real clock boundary** to demonstrate its own bug — and would still be flaky on a slow machine.

The general rule: anything a function *reaches out and grabs* — the clock, `Math.random`, the network, the filesystem — is something your tests cannot control. You saw injected time in projects 28 (debounce), 39 (undo history), 43 (retry backoff) and 46 (stopwatch); this is the same habit, applied where it matters most.

### Deterministic vs flaky tests

A **deterministic** test gives the same answer every time. A **flaky** one passes on your laptop and fails in CI at 3am. Tests that use real time are the single biggest source of flakiness in the industry — a `setTimeout(..., 50)` that "should be enough" is a bug waiting for a busy build machine. Injected clocks make time-dependent tests as deterministic as arithmetic, because that's all they are.

### Keys, `Map`, and not leaking memory

A limiter tracks each user separately, so state lives in a `Map` keyed by user. That raises a question the original never asks: what happens to the entry for someone who visited once and never came back? The refactor deletes a key when its list empties — otherwise a busy public API accumulates one entry per IP address, forever. There is a test for it.

## 3. Walking through the original code

Two parallel objects and a limit:

```js
var LIMIT = 5;
var counts = {};   // user -> requests so far this second
var seconds = {};  // user -> which second we were counting
```

Already a project-41 smell: two structures that must agree. Then:

```js
function allow(user) {
  var second = Math.floor(Date.now() / 1000);
  if (seconds[user] !== second) {
    seconds[user] = second;
    counts[user] = 0;      // new second -> throw the count away
  }
  if (counts[user] < LIMIT) {
    counts[user]++;
    console.log("  ALLOWED " + user + ...);
    return true;
  }
  ...
}
```

Read the reset line again: **the count is discarded entirely** whenever the second changes. Not aged, not decayed — deleted. Whatever you did at 0.99s is forgotten at 1.00s.

And `allowLogin` is the same function pasted for a different limit, with one line lost in the edit:

```js
if (loginSeconds[user] !== second) {
  loginSeconds[user] = second;
  // ...the counts reset never made it into the copy
}
```

Run the file: `ada` uses her 2 logins and is blocked forever.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the boundary burst.** The limiter promises 5 per second and delivers 10 in 55 milliseconds. That is not a rounding error; it's a 2x failure of the single promise the component makes. Any client that notices — and load generators notice immediately — can simply aim at the seam. The cause is that the *reset* is triggered by the calendar rather than by the age of the requests themselves.

**Flaw 2: a second endpoint became a second copy, and the copy lost a line.** Nobody wrote a bug here; someone copied working code and edited it slightly. Now the login limiter locks people out permanently. This is the disease projects 41, 74 and 75 all show in different costumes: duplicated logic doesn't stay duplicated, it *diverges*, and the divergence is silent.

**Flaw 3 (the root cause of the first two): time is grabbed, not given.** Because `Date.now()` is called inside the decision, there is no way to ask "what happens at the boundary?" except to *be there* when it happens. So the demo busy-waits, spinning the CPU, to make its own bug reproducible. No sane person writes that test, which means the bug was never going to be caught. And because the answer is printed rather than returned, even a test that *could* run has nothing to assert on. Untestable code isn't merely inconvenient — it's code whose bugs are structurally protected from discovery.

## 5. Try it yourself first!

1. **Vague hint:** The counter is reset by the clock's boundaries. Whose boundaries should matter — the calendar's, or each individual request's?
2. **Warmer:** What if you never reset anything, and instead remembered *when* each request happened?
3. **Warmer still:** Then "requests in the last second" is a `filter` over those timestamps, computed fresh each time. No reset exists to be mistimed.
4. **Almost the answer:** `allow(key)`: drop timestamps older than `now() - windowMs`; if what's left is under the limit, push `now()` and return `true`.
5. **The testing question (the real one):** How would you test "5 at 0.97s then 5 at 1.01s" without waiting a second? Write down what would have to change about the function's *signature* before that test is even writable. That answer is the whole project.
6. **Design question:** exact-but-heavy (a list of timestamps) or cheap-but-approximate (a token count plus a last-updated stamp)? The refactor ships both, on purpose — decide which you'd default to and why.

## 6. Understanding the refactored solution

**The clock arrives through the constructor:**

```js
constructor({ limit, windowMs, now = Date.now } = {}) {
  ...
  this.#now = validateNow(now);
}
```

One default parameter is the difference between untestable and trivially testable. Production never passes `now`; every test does.

**Aging out replaces resetting:**

```js
#recent(key) {
  const cutoff = this.#now() - this.#windowMs;
  const timestamps = (this.#hits.get(key) ?? []).filter((at) => at > cutoff);
  if (timestamps.length === 0) this.#hits.delete(key); // don't leak keys
  else this.#hits.set(key, timestamps);
  return timestamps;
}
```

`allow`, `count` and `retryAfterMs` all call this one method, so the definition of "recent" exists exactly once — the `allowLogin` divergence has nowhere to live. And the `delete` on an empty list is the memory-leak fix, tested by `trackedKeys`.

**The token bucket derives instead of accumulating:**

```js
const earned = (at - bucket.updatedAt) * this.#refillPerMs;
bucket.tokens = Math.min(this.#capacity, bucket.tokens + earned);
bucket.updatedAt = at;
```

Three lines, no timer, O(1) memory per key. It permits a burst up to `capacity` — often exactly what you want, since real users click things in clumps — while holding the long-run average to the refill rate. There's a test that runs 10 simulated seconds and asserts the total is exactly 25: five free at the start plus two per second.

**The tests read like a specification of time**: at the boundary (the original's bug, by name), expiry at exactly `windowMs`, an hour of idling capped at capacity, fractional tokens not rounding up, a refused request spending nothing. Every one of them would have needed a real `sleep` before the refactor; now they're assignments.

## 7. Words you learned (glossary)

- **Rate limiter** — a component that decides whether a request is allowed right now.
- **Throttle / 429** — to slow a client down / the HTTP status meaning "too many requests".
- **Fixed window** — counting inside calendar-aligned buckets; leaks a burst at the seam.
- **Sliding window log** — keeping timestamps and counting those newer than a cutoff.
- **Boundary burst** — up to 2x the limit, delivered at the moment a fixed window resets.
- **Token bucket** — a refilling allowance; permits controlled bursts, O(1) memory.
- **Capacity / refill rate** — the maximum burst / the sustained long-run average.
- **Lazy refill** — computing tokens from elapsed time when asked, instead of on a timer.
- **`retryAfterMs`** — how long the caller should wait before trying again.
- **Dependency injection** — passing a collaborator (here, the clock) in as an argument.
- **Default parameter** — `now = Date.now`: the real thing unless a caller says otherwise.
- **Fake clock** — a test-controlled `now` you move by assignment.
- **Deterministic / flaky** — same result every run / passes and fails at random.
- **Key** — the thing being limited (user, IP, API token).
- **Memory leak** — state that accumulates and is never released.

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the seam.** Run `original.js` a few times. Expected: 10 requests allowed in well under 100ms, every time. Now notice what it took to demonstrate that — a busy-wait loop burning CPU — and that this is the *easy* case to reproduce.
2. **Time travel for free.** In a scratch file, make a `SlidingWindowLimiter` with `now: () => clock`, allow 3 requests, set `clock = 999999`, and check `count`. Expected: `0` — you just skipped 16 minutes without waiting.
3. **Find the exact expiry moment.** With `limit: 1, windowMs: 1000`, allow at `clock = 500`, then try at `1499` and at `1500`. Expected: `false` then `true`. Change `at > cutoff` to `at >= cutoff` in your copy and re-run: the boundary shifts by 1ms. Decide which you'd document, then put it back.
4. **Give the bucket the seam test.** Run the boundary-burst sequence (5 at t=970, 5 at t=1010) against a `TokenBucket({ capacity: 5, refillPerSecond: 5 })`. Expected: all five of the second batch are refused, and `tokens('grace')` reads `0.2` — because 40ms of idling buys exactly a fifth of a token. A different mechanism, the same protection, and no seam to aim at.
5. **Prove the leak fix.** Comment out the `this.#hits.delete(key)` line in your copy and rerun the tests. Expected: the "expired keys are forgotten" test fails with 50 tracked keys — proof that the test is guarding a real memory bug and not just describing one.
6. **Break the injection.** In your copy, replace `this.#now()` with `Date.now()` in one method and rerun the suite. Expected: several tests fail immediately. That failure *is* the argument for injection — the code became untestable the moment it reached for the clock itself.
