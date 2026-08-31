# 🏋️ Practice: Retry & Timeout

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. attempts: 1 means "don't retry" (warm-up)

`retry` with `attempts: 1` should behave exactly like calling the function directly — one call, no waiting, the error straight through. Add a test using a recording sleep that asserts a permanently-failing function is called exactly once and the recorded delay list is `[]`. Then pin the validation: `attempts: 0` and `attempts: 2.5` both reject with `RangeError`, and a *succeeding* function with `attempts: 1` still returns `'success'`.

What it practices: testing the degenerate case of a loop — the setting that turns a feature off must be safe.

Hint: the loop's `const outOfAttempts = attempt >= attempts;` is `1 >= 1` on the very first pass, so it throws before reaching the `sleep`. Note that `retry` is async, so use `await assert.rejects(...)`, not `assert.throws`.

### ⭐⭐ 2. Jitter — stop the thundering herd (core)

When a server goes down, every client retries at exactly 100ms, then 200ms, then 400ms — so the recovering server is hit by synchronized waves. The fix is jitter: randomize each delay a little. Add `jitter` (0 = off, 0.5 = ±50%) and an injectable `random` defaulting to `Math.random`. Check offline with a recording sleep and `baseDelayMs: 100`, `jitter: 0.5`: `random: () => 0.5` gives `[100, 200, 400]` (dead centre), `random: () => 0` gives `[50, 100, 200]`, `random: () => 1` gives `[150, 300, 600]`, and omitting `jitter` still gives `[100, 200, 400]`.

What it practices: injecting randomness so a random feature is exactly testable — project 06 and project 11's trick.

Hint: map `random()` from `[0,1)` onto `[-1,1)` with `random() * 2 - 1`, then `Math.round(backoff * (1 + jitter * that))`.

### ⭐⭐ 3. maxDelayMs — cap the doubling (core)

Exponential backoff doubles forever: attempt 10 waits 51 seconds, attempt 15 waits 27 minutes. Add `maxDelayMs` (default `Infinity`) that caps each delay. Check offline with a recording sleep: `attempts: 6, baseDelayMs: 100, maxDelayMs: 500` against an always-failing function records exactly `[100, 200, 400, 500, 500]` — note five delays for six attempts, and note where the cap bites.

What it practices: bounding an exponential — and reading a schedule carefully enough to predict it before running.

Hint: `Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)`. The uncapped values would be 100, 200, 400, 800, 1600.

### ⭐⭐ 4. onRetry — make the waiting visible (core)

Silent retries are a debugging nightmare: a request that took 3 seconds looks identical to one that took 3 seconds *and failed twice*. Add an `onRetry(err, attempt, delayMs)` hook, called just before each sleep — never after the final failure, and never at all on success. Check offline: a function failing twice then succeeding, with `baseDelayMs: 100`, produces exactly two log lines — attempt 1 waiting 100ms and attempt 2 waiting 200ms — and a function that succeeds immediately produces none.

What it practices: an observation hook placed where it can't change behavior, and being precise about "how many times does this fire?".

Hint: put the call between the `shouldRetry` check and the `await sleep(...)`. Default it to `() => {}` so nothing existing changes.

### ⭐⭐⭐ 5. withDeadline — a timeout that actually cancels (challenge)

`withTimeout` admits its limit in a comment: the losing operation isn't cancelled, it just runs on unwatched. Write `withDeadline(operation, ms)` where `operation` is a *function* receiving an `AbortSignal`, and the deadline aborts that signal. Then write a `fakeRequest(signal, durationMs)` that resolves after a delay but clears its timer and rejects with `signal.reason` on abort. Check offline: a 5ms request with a 200ms deadline returns `'data'`; a 5000ms request with a 20ms deadline rejects with `TimeoutError` *and* its cleanup runs.

What it practices: the difference between ignoring a result and stopping the work — and how `AbortSignal` carries a cancellation reason.

Hint: `controller.abort(new TimeoutError(ms))` sets `signal.reason` to your own error, so the rejection is a `TimeoutError` rather than a generic `AbortError`. Keep the `.finally(() => clearTimeout(timer))` — the leak lesson still applies.

### ⭐⭐⭐ 6. A circuit breaker (challenge)

Retrying is polite for one call; when a service is *down*, a thousand clients retrying is an attack. A circuit breaker fixes that: after N consecutive failures it "opens" and fails fast without calling the service at all, until a cooldown passes and it allows one probe through. Write `createBreaker({ failureThreshold, cooldownMs, now })` with a `state` getter (`'closed' | 'open' | 'half-open'`) and `call(fn)`. Any success resets everything. Check offline with a fake clock: three failures open it; the fourth call throws `Circuit is open` *without* invoking the function; at cooldown the state reads `half-open` and one probe gets through; a failed probe re-opens it; a later success closes it and resets the counter.

What it practices: a state machine (project 40) driving an async policy, with the clock injected so the whole thing tests in microseconds.

Hint: two variables are enough — `failures` and `openedAt` (null when closed). Derive `state` from them in the getter instead of storing it, and there's no third variable to keep in sync.

## Solutions

### 1. attempts: 1

```js
test('attempts: 1 calls once and never sleeps', async () => {
  const delays = [];
  const { fn, calls } = makeFlaky(99);
  await assert.rejects(
    () => retry(fn, { attempts: 1, sleep: recordingSleep(delays) }),
    /503/,
  );
  assert.equal(calls(), 1);
  assert.deepEqual(delays, []); // no wait after the last attempt
});

test('nonsense attempt budgets are rejected', async () => {
  await assert.rejects(() => retry(async () => {}, { attempts: 0 }), RangeError);
  await assert.rejects(() => retry(async () => {}, { attempts: 2.5 }), RangeError);
});
```

WHY: the "no wait after the last attempt" rule is easy to get wrong — a naive loop sleeps after every failure, so the caller waits an extra 400ms to be told about a failure that already happened. `attempts >= attempt` is checked *before* the sleep, so the schedule for N attempts always has N−1 waits. Note `await assert.rejects` rather than `assert.throws`: `retry` is async, so it returns a rejected promise instead of throwing, and `assert.throws` would pass vacuously. Verified by running: 1 call, `[]` delays, both `RangeError`s.

### 2. Jitter

```js
export async function retry(fn, {
  attempts = 3,
  baseDelayMs = 100,
  jitter = 0,
  random = Math.random,
  shouldRetry = () => true,
  sleep = defaultSleep,
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`attempts must be >= 1, got ${attempts}`);
  }

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= attempts || !shouldRetry(err)) throw err;
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      // random() in [0,1) -> spread in [-jitter, +jitter)
      await sleep(Math.round(backoff * (1 + jitter * (random() * 2 - 1))));
    }
  }
}
```

WHY: jitter exists because synchronized clients are worse than slow ones — a service that just came back up gets flattened by a thousand retries arriving in the same millisecond, and it goes down again. Spreading each client's delay over a band breaks the synchronization for free. Making `random` an injectable parameter turns an untestable feature into three exact assertions: feed it 0, 0.5 and 1 and you get the bottom, middle and top of the band. With `jitter: 0` (the default), the multiplier is exactly 1 and every existing test still sees `[100, 200, 400]`. Verified by running: `[50,100,200]`, `[100,200,400]`, `[150,300,600]` for random 0, 0.5, 1.

### 3. maxDelayMs

```js
const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
```

```js
test('the cap stops the doubling', async () => {
  const delays = [];
  const { fn } = makeFlaky(99);
  await assert.rejects(
    () => retry(fn, { attempts: 6, baseDelayMs: 100, maxDelayMs: 500, sleep: recordingSleep(delays) }),
    /503/,
  );
  assert.deepEqual(delays, [100, 200, 400, 500, 500]);
});
```

WHY: uncapped exponential backoff is a real outage pattern — a background job that retries fifteen times ends up sleeping for half an hour, long after a human would have wanted it to give up or keep trying gently. The cap converts the tail of the schedule into a steady poll. Reading the expected list is the exercise: six attempts means five delays, and the cap first bites at the fourth (which would have been 800). `Infinity` as the default keeps every existing schedule identical. Verified by running: exactly `[100, 200, 400, 500, 500]`.

### 4. onRetry

```js
// between the give-up check and the sleep:
const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
onRetry(err, attempt, delayMs);
await sleep(delayMs);
```

```js
test('onRetry fires once per retry, never on success or final failure', async () => {
  const log = [];
  const { fn } = makeFlaky(2);
  await retry(fn, {
    attempts: 4,
    baseDelayMs: 100,
    sleep: instantSleep,
    onRetry: (err, attempt, delay) => log.push(`${attempt}: ${err.message} -> waiting ${delay}ms`),
  });
  assert.deepEqual(log, [
    '1: 503 unavailable -> waiting 100ms',
    '2: 503 unavailable -> waiting 200ms',
  ]);
});
```

WHY: placement is the whole design. After the give-up check means it never fires for the final error — which the caller receives anyway, so logging it here would double-report. Before the sleep means the log line appears *while* the wait is happening, which is what makes a hanging job diagnosable in real time. Computing `delayMs` once into a variable and passing it also removes the chance of the log and the actual sleep disagreeing. Verified by running: exactly two lines for two retries, zero lines on immediate success.

### 5. withDeadline

```js
export function withDeadline(operation, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError(ms)), ms);

  return Promise.resolve()
    .then(() => operation(controller.signal))
    .finally(() => clearTimeout(timer));
}

// an abortable operation looks like this:
function fakeRequest(signal, durationMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('data'), durationMs);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);   // the real cleanup
      reject(signal.reason); // the TimeoutError we passed to abort()
    }, { once: true });
  });
}
```

WHY: `withTimeout` and `withDeadline` solve different halves of the same problem. `Promise.race` can stop you *waiting*, but a promise is a result, not a process — there is no handle to cancel. `AbortSignal` is that missing handle: the operation opts in by listening, and now the socket really closes, the timer really clears, the work really stops. Passing your own error into `abort(reason)` is the detail that keeps the API honest — `signal.reason` becomes your `TimeoutError` instead of a generic `AbortError`, so callers can still write `err instanceof TimeoutError`. `withTimeout` remains useful for promises you didn't create and can't cancel. Verified by running: fast request returns `'data'`, slow request rejects with `TimeoutError`, and the abort listener's cleanup ran.

### 6. Circuit breaker

```js
export function createBreaker({ failureThreshold = 3, cooldownMs = 1000, now = Date.now } = {}) {
  let failures = 0;
  let openedAt = null; // null == closed

  return {
    get state() {
      if (openedAt === null) return 'closed';
      return now() - openedAt >= cooldownMs ? 'half-open' : 'open';
    },

    async call(fn) {
      if (this.state === 'open') {
        throw new Error(
          `Circuit is open — refusing to call for another ${cooldownMs - (now() - openedAt)}ms`,
        );
      }
      try {
        const result = await fn();
        failures = 0;      // any success is a full reset
        openedAt = null;
        return result;
      } catch (err) {
        failures++;
        if (failures >= failureThreshold) openedAt = now();
        throw err;
      }
    },
  };
}
```

WHY: deriving `state` from `openedAt` instead of storing it is project 41's "the best sync rule is the one that doesn't exist" — there's no moment where a stored state could disagree with the clock, and `half-open` needs no timer to fire. The `half-open` state is what makes a breaker self-healing: exactly one call slips through after the cooldown, so a recovered service gets noticed without a stampede, and a still-broken one re-opens on the first failure (`failures` is already at the threshold, so `openedAt` refreshes). Wrapping `retry` in a breaker is the production combination: retry the individual blip, break on the sustained outage. Verified by running: three failures open it, the fourth call never invokes the function, the state reads `half-open` at the cooldown, a failed probe re-opens, and a later success closes it and resets the counter.
