# 🏋️ Practice: Search As You Type

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

All exercises run offline: work in a scratch file next to `refactored/` that does `import { makeLatestOnly, STALE } from './latest.js'`, and reuse the `controllable()` helper from `latest.test.js` so you control resolution order by hand. Run with `node --test` or plain `node`.

## Exercises

### ⭐ 1. Even in-order arrivals go stale (warm-up)

The existing tests scramble resolution order. Write a new test where two overlapping calls resolve **in the order they were fired** — the older one first, then the newer one. Predict what the older call yields before running it.

What it practices: the ticket rule — "am I still newest?" — not "did I arrive last?".
Hint: fire `latest('ba')` then `latest('ban')`, resolve `pending[0]` first. The older call's ticket is already outdated the moment the second call was *fired*.

### ⭐⭐ 2. Tell me what I missed: an `onStale` callback

Write `makeLatestOnly2(fn, { onStale })` — same behavior as the original, but every time a call is discarded as stale (result *or* error), it calls `onStale(...args)` with the arguments of the discarded call. Real apps use this for logging and metrics ("we threw away 40% of search responses").

What it practices: extending a closure wrapper without breaking its contract.
Expected: overlap `'ba'` then `'ban'`, resolve both → `onStale` was called exactly once, with `'ba'`.
Hint: there are exactly two places in the wrapper where `STALE` is returned — both need the callback. Use `onStale?.(...)`.

### ⭐⭐ 3. Two search boxes, one wrapper: `makeKeyedLatestOnly`

A page has a fruit search *and* a vegetable search sharing one wrapped API. With plain `makeLatestOnly`, a new vegetable query wrongly stales a pending fruit query. Write `makeKeyedLatestOnly(fn, keyFn)` that keeps an **independent ticket counter per key** (`keyFn(...args)` picks the key, default: first argument).

What it practices: generalizing the closure state from one counter to a `Map` of counters.
Expected: fire `latest('fruit', 'ba')` then `latest('veg', 'ca')`, resolve both → **both** deliver real results; but two overlapping `'fruit'` calls still stale the older one.
Hint: `Map` of `key -> newestTicket`. Read the map again *after* awaiting — that's the whole point.

### ⭐⭐ 4. A truthful spinner: `trackPending`

The README says loading must be a rendered state. Write `trackPending(fn)` returning `{ wrapped, pending }` where `wrapped` behaves like `fn` and `pending()` reports how many calls are currently in flight — the number a spinner would watch (`pending() > 0` = show it).

What it practices: closure state again, plus `try/finally` so errors can't corrupt the count.
Expected: fire two controllable calls → `pending()` is `2`; resolve one and await it → `1`; reject the other (catch it) → `0`.
Hint: increment before calling `fn`, decrement in a `finally`. Return `await fn(...args)` *inside* the `try`.

### ⭐⭐⭐ 5. Clearing the box: a `cancel()` switch

When the user empties the input, results from still-flying requests must never paint — there is no "newest call" anymore. Write `makeCancellableLatest(fn)`: like `makeLatestOnly`, but the returned function also has a `.cancel()` method that invalidates **every** in-flight call, so each one settles as `STALE` — even ones that would otherwise *reject*.

What it practices: the monotonic-ticket trick as a general invalidation tool.
Expected: fire one call, `cancel()`, then resolve it → yields `STALE`. Fire another, `cancel()`, reject it → yields `STALE` (no throw). A fresh call after cancel still delivers normally.
Hint: `cancel` just does `newestTicket++`. Once no live call holds the newest ticket, the existing checks do all the work.

## Solutions

### 1. Even in-order arrivals go stale

```js
test('in-order arrival still stales the older overlapping call', async () => {
  const { fn, pending } = controllable();
  const latest = makeLatestOnly(fn);
  const first = latest('ba');
  const second = latest('ban');
  pending[0].resolve('results for ba');   // older resolves FIRST this time
  pending[1].resolve('results for ban');
  assert.equal(await first, STALE);
  assert.equal(await second, 'results for ban');
});
```

WHY: staleness is decided by *tickets issued*, not arrival order. The moment `latest('ban')` ran, `newestTicket` became 2, so call 1 was doomed regardless of when its answer arrived. This is the project's core idea: relevance is checked on arrival against "newest asked", never inferred from timing.

### 2. `onStale` callback

```js
export function makeLatestOnly2(fn, { onStale } = {}) {
  let newestTicket = 0;
  return async (...args) => {
    const ticket = ++newestTicket;
    try {
      const result = await fn(...args);
      if (ticket === newestTicket) return result;
      onStale?.(...args);
      return STALE;
    } catch (err) {
      if (ticket === newestTicket) throw err;
      onStale?.(...args);
      return STALE;
    }
  };
}
```

WHY: both the success path and the error path can discard a call, so both must report — mirroring how the original swallows a stale *error* too. The `?.()` call keeps the option optional without changing the wrapper's contract for existing callers.

### 3. `makeKeyedLatestOnly`

```js
export function makeKeyedLatestOnly(fn, keyFn = (...args) => args[0]) {
  const tickets = new Map(); // key -> newest ticket for that key
  return async (...args) => {
    const key = keyFn(...args);
    const ticket = (tickets.get(key) ?? 0) + 1;
    tickets.set(key, ticket);
    try {
      const result = await fn(...args);
      return ticket === tickets.get(key) ? result : STALE;
    } catch (err) {
      if (ticket === tickets.get(key)) throw err;
      return STALE;
    }
  };
}
```

WHY: the single closure counter generalizes to a `Map` of counters — one independent race per key. Note the check re-reads `tickets.get(key)` *after* the `await`: the map may have moved on while this call was in flight, and that late read is exactly the "decide on arrival" rule from the README.

### 4. `trackPending`

```js
export function trackPending(fn) {
  let inFlight = 0;
  const wrapped = async (...args) => {
    inFlight++;
    try {
      return await fn(...args);
    } finally {
      inFlight--;
    }
  };
  return { wrapped, pending: () => inFlight };
}
```

WHY: `finally` guarantees the counter comes back down on success *and* failure — without it, one rejected request would leave the spinner on forever. The `await` inside the `try` matters: `return fn(...args)` would run the `finally` before the promise settled, and `pending()` would lie.

### 5. `makeCancellableLatest`

```js
export function makeCancellableLatest(fn) {
  let newestTicket = 0;
  const call = async (...args) => {
    const ticket = ++newestTicket;
    try {
      const result = await fn(...args);
      return ticket === newestTicket ? result : STALE;
    } catch (err) {
      if (ticket === newestTicket) throw err;
      return STALE;
    }
  };
  call.cancel = () => { newestTicket++; };
  return call;
}
```

Test sketch (all three expectations):

```js
const { fn, pending } = controllable();
const latest = makeCancellableLatest(fn);
const a = latest('ba');
latest.cancel();
pending[0].resolve('results for ba');
assert.equal(await a, STALE);                 // cancelled result ignored

const b = latest('ban');
latest.cancel();
pending[1].reject(new Error('timeout'));
assert.equal(await b, STALE);                 // cancelled error swallowed

const c = latest('cherry');
pending[2].resolve('results for cherry');
assert.equal(await c, 'results for cherry');  // life goes on after cancel
```

WHY: `cancel()` is one line because the machinery already exists — bumping the counter means *no live call* holds the newest ticket, so every pending call fails its own "am I newest?" check and neutralizes itself, errors included. Functions are objects in JavaScript, so attaching `.cancel` to the returned function keeps wrapper and switch in one closure. This is the same move a real UI makes when the input empties: don't chase responses, just invalidate them.
