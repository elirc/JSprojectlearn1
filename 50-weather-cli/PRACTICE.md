# 🏋️ Practice: CLI Weather App

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Prove the trim (warm-up)

`getWeather` calls `city.trim()` before building the URL, but no test pins that down. Using the test file's `fakeFetch` helper, write a test that calls `getWeather('  Manila  ', ...)` and asserts the recorded URL contains `city=Manila&` — spaces gone, not encoded as `+`. Run it with `node --test` and watch it pass; then (temporarily, in your head) imagine deleting `.trim()` and check the test would catch it.

What it practices: using a recording fake to assert *what was asked*, not just what came back.
Hint: the fake returns `{ fn, calls }` — the URL you want is `calls[0]`.

### ⭐⭐ 2. Cover the forgotten branch (core)

The generic `if (!res.ok)` branch — the one that catches 500s — has no test at all. Write one: a fake returning status `500` must reject with an `ApiError` whose `status` is `500` and whose message matches `/HTTP 500/`. Use the same `assert.rejects` + predicate-function style as the 404 and 401 tests.

What it practices: adding a test for an uncovered edge case at the HTTP boundary.
Hint: copy the 401 test and change three things — the status, the predicate, the message pattern.

### ⭐⭐ 3. A units option (core)

Let callers pick units: `getWeather(city, { apiKey, units, fetchFn })` should add `units=metric` to the query string by default, or `units=imperial` when passed. Write two tests with `fakeFetch`: one asserting the default URL matches `/units=metric/`, one asserting `/units=imperial/` when the option is given. All existing tests must still pass.

What it practices: extending the boundary layer while keeping the URL built by `URLSearchParams`, never by hand.
Hint: a default parameter value in the destructuring (`units = 'metric'`) plus one more key in the `URLSearchParams` object.

### ⭐⭐ 4. A fake that changes its mind (core)

`fakeFetch` always answers the same way, so it can't simulate "failed once, then recovered". Write `sequenceFetch(responses)` — it takes an array like `[{ status: 503 }, { status: 200, body }]`, answers each call with the next entry, and repeats the last entry once the list runs out. It still records `calls`. Check it in a scratch file: first call has status 503, second and third have status 200.

What it practices: building a richer test fake — stateful, but still tiny, offline, and deterministic.
Hint: keep an index `i` in the closure; pick `responses[Math.min(i, responses.length - 1)]` and then increment.

### ⭐⭐⭐ 5. Retry the weather (challenge)

Write `getWeatherWithRetry(city, options)` that wraps `getWeather` without modifying it. Rules: retry only on `ApiError` with `status >= 500` (server trouble is weather; 404/401/ConfigError are facts — rethrow immediately); at most `retries` extra attempts (default 2); wait via an injected `sleep(delayMs)` between attempts (default 500). Test with `sequenceFetch([{status: 503}, {status: 200, body: manila}])` and a recording sleep: it must return the data, have made exactly 2 calls, and have slept exactly `[500]`. A 404 must fail after exactly 1 call.

What it practices: composing retry logic around an untouched function, with both fetch *and* sleep injected.
Hint: a `for` loop over attempts with `try/catch` inside; only `await sleep(...)` when another attempt is still coming.

## Solutions

### 1. Prove the trim

```js
test('city whitespace is trimmed out of the URL', async () => {
  const { fn, calls } = fakeFetch({ body: manila });
  await getWeather('  Manila  ', { apiKey: 'k', fetchFn: fn });
  assert.match(calls[0], /city=Manila&/);
});
```

WHY: the recording fake is the project's key trick — because `calls` captures every URL, you can test the *request*, which the original (fetch welded to formatting) could never do. The `&` in the pattern matters: it proves the value ends cleanly at `Manila` with no stray encoded spaces.

### 2. Cover the forgotten branch

```js
test('unexpected 500 becomes a generic ApiError with the status', async () => {
  const { fn } = fakeFetch({ status: 500 });
  await assert.rejects(
    () => getWeather('Manila', { apiKey: 'k', fetchFn: fn }),
    (e) => e instanceof ApiError && e.status === 500 && /HTTP 500/.test(e.message),
  );
});
```

WHY: the README's core rule is "check `res.ok` once, at the boundary" — but an unchecked branch is an untrusted branch. This test completes the boundary's coverage: every non-2xx path (404, 401, and now everything else) provably converts to a typed error instead of leaking a half-valid response downstream.

### 3. A units option

```js
export async function getWeather(city, { apiKey, units = 'metric', fetchFn = fetch } = {}) {
  // ...validation unchanged...
  const params = new URLSearchParams({ city: city.trim(), key: apiKey, units });
  // ...rest unchanged...
}
```

```js
test('units default to metric and can be set to imperial', async () => {
  const a = fakeFetch({ body: manila });
  await getWeather('Manila', { apiKey: 'k', fetchFn: a.fn });
  assert.match(a.calls[0], /units=metric/);

  const b = fakeFetch({ body: manila });
  await getWeather('Manila', { apiKey: 'k', units: 'imperial', fetchFn: b.fn });
  assert.match(b.calls[0], /units=imperial/);
});
```

WHY: the option rides the same rails as everything else — a plain parameter into `URLSearchParams`, so even a hostile value like `"a&b=c"` would be encoded, not spliced into the URL. Note what *didn't* change: `cli.js` and `formatReport` — layering means a query-string feature touches only the network layer.

### 4. A fake that changes its mind

```js
function sequenceFetch(responses) {
  const calls = [];
  let i = 0;
  const fn = async (url) => {
    calls.push(url);
    const { status = 200, body = {} } = responses[Math.min(i, responses.length - 1)];
    i++;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fn, calls };
}
```

WHY: dependency injection is only as good as the fakes you can hand in, and a one-note fake can't exercise recovery paths. The closure variable `i` is the same closure trick the parser project used for its `position` counter — private state shared by one function. Repeating the last entry keeps tests honest when code makes more calls than you listed.

### 5. Retry the weather

```js
import { getWeather, ApiError } from './weather.js';

export async function getWeatherWithRetry(city, options = {}) {
  const {
    retries = 2,
    delayMs = 500,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    ...rest
  } = options;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getWeather(city, rest);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status < 500) throw err; // facts fail fast
      lastError = err;
      if (attempt < retries) await sleep(delayMs);
    }
  }
  throw lastError;
}
```

```js
test('503 then 200: retries once and returns the data', async () => {
  const delays = [];
  const sleep = (ms) => { delays.push(ms); return Promise.resolve(); };
  const { fn, calls } = sequenceFetch([{ status: 503 }, { status: 200, body: manila }]);
  const data = await getWeatherWithRetry('Manila', { apiKey: 'k', fetchFn: fn, sleep });
  assert.deepEqual(data, manila);
  assert.equal(calls.length, 2);
  assert.deepEqual(delays, [500]);
});

test('404 is a fact: one call, no retry', async () => {
  const { fn, calls } = sequenceFetch([{ status: 404 }, { status: 200 }]);
  await assert.rejects(
    () => getWeatherWithRetry('Atlantis', { apiKey: 'k', fetchFn: fn, sleep: () => {} }),
    (e) => e instanceof ApiError && e.status === 404,
  );
  assert.equal(calls.length, 1);
});
```

WHY: this is the payoff of *typed* errors — the retry loop can tell "server trouble" (`status >= 500`, retryable) from "facts" (404, 401, ConfigError) by inspecting the error itself, something a single catch-all message could never support. Injecting `sleep` beside `fetchFn` makes the waiting testable exactly like the fetching: the test asserts `[500]` without waiting 500ms. (Verified with node: 503→200 recovers in 2 calls with one 500ms sleep; a lone 503 gives up after 3 calls and delays `[500, 500]`; 404 and ConfigError are never retried.)
