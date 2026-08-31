# 🏋️ Practice: Debounce & Throttle

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Test that debounce forwards ALL arguments (warm-up)

The tests only ever pass one argument. Write a mock-timer test where the debounced function takes *two* parameters — `save('draft', 1); save('draft', 2);` then `tick(300)`. Expected: the inner function ran once and received `['draft', 2]` — both arguments of the last call, none of the earlier ones.

**Practices:** the `...args` + `fn.apply` forwarding contract, and reading mock-timer tests.

**Hint:** collect with `calls.push([name, version])` and assert `deepEqual(calls, [['draft', 2]])`.

### ⭐⭐ 2. Add `cancel()` (core)

Build `debounceControllable(fn, waitMs)` — like `debounce`, but the returned function carries a `cancel()` method that drops any pending call. Test with mock timers: `save('a'); save.cancel(); tick(200);` — expected: nothing ever fires. (Real use: the user navigates away, so the pending autosave must die.)

**Practices:** attaching methods that share the wrapper's closure — project 27's `clear()` trick, now aimed at a timer.

**Hint:** declare `function wrapped(...)` instead of returning an arrow, then `wrapped.cancel = () => { clearTimeout(timeoutId); timeoutId = null; };`.

### ⭐⭐ 3. Add `flush()` (core)

Extend exercise 2 with `flush()`: if a call is pending, fire it *right now* and cancel the timer; if nothing is pending, do nothing. Test: `save('a'); save.flush();` fires immediately with `'a'`; then `tick(200)` must NOT fire it a second time; a second `flush()` is a silent no-op. (Real use: "Save now" button next to an autosaving editor.)

**Practices:** remembering the last call's arguments in the closure so they can be replayed.

**Hint:** you'll need `lastArgs` (and `lastThis`) saved on every call — the timer callback and `flush()` both read them. Track "is anything pending?" with `timeoutId === null`.

### ⭐⭐ 4. Prove throttle independence with a test (core)

The suite proves two *debounced* functions are independent, but never checks throttle. Write the parallel test: two throttled functions (`scrollBar`, `minimap`, both 100ms), call each once at the same instant. Expected: both fire — `['bar:10', 'map:10']`. Then convince yourself it's a real test: it should fail if `lastFiredAt` were a module-level variable shared by all throttles.

**Practices:** spotting the untested claim in a suite and pinning it.

**Hint:** enable mock `Date` (`apis: ['Date']`) — throttle never uses `setTimeout`.

### ⭐⭐⭐ 5. Throttle with a trailing call (challenge)

Plain throttle *drops* calls during cooldown, so a scroll bar can freeze short of its final position. Write `throttleTrailing(fn, intervalMs)`: calls during cooldown are remembered (newest args win), and when the cooldown ends, the remembered call fires once and starts a new cooldown. Expected with mock timers (`['setTimeout', 'Date']`): `track(1)` fires; `track(2)` then `tick(50)` then `track(3)` fire nothing yet; `tick(50)` fires `3`; another `tick(500)` fires nothing. Final calls: `[1, 3]`.

**Practices:** combining both timer patterns — throttle's timestamp *and* debounce's `setTimeout` — in one closure.

**Hint:** three pieces of state: `lastFiredAt`, `pendingArgs`, `timerId`. Only schedule a timer if one isn't already running; the delay is `intervalMs - (now - lastFiredAt)`.

## Solutions

### 1. Arguments test

```js
test('debounce forwards multiple arguments', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const save = debounce((name, version) => calls.push([name, version]), 300);
  save('draft', 1);
  save('draft', 2);
  t.mock.timers.tick(300);
  assert.deepEqual(calls, [['draft', 2]]);
});
```

**Why:** `...args` captures however many arguments arrive and `fn.apply(this, args)` replays them all — the wrapper is transparent. "Last call's arguments win" applies to the whole argument list, not just the first one.

### 2 & 3. `cancel()` and `flush()`

```js
export function debounceControllable(fn, waitMs) {
  let timeoutId = null;
  let lastArgs = null;
  let lastThis = null;
  function wrapped(...args) {
    lastArgs = args;
    lastThis = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { timeoutId = null; fn.apply(lastThis, lastArgs); }, waitMs);
  }
  wrapped.cancel = () => { clearTimeout(timeoutId); timeoutId = null; };
  wrapped.flush = () => {
    if (timeoutId === null) return;      // nothing pending
    clearTimeout(timeoutId);
    timeoutId = null;
    fn.apply(lastThis, lastArgs);
  };
  return wrapped;
}
```

**Why:** all three functions close over the same four variables — one private state, three doors into it, no globals. Setting `timeoutId = null` when the timer fires (or is cancelled) is what makes `flush()` safely idempotent: "pending" has an explicit representation instead of being guessed. Verified with node's mock timers: cancel kills the call, flush fires exactly once, double-flush is a no-op.

### 4. Throttle independence test

```js
test('two throttled functions are independent', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const log = [];
  const scrollBar = throttle((p) => log.push(`bar:${p}`), 100);
  const minimap = throttle((p) => log.push(`map:${p}`), 100);
  scrollBar(10);
  minimap(10);
  assert.deepEqual(log, ['bar:10', 'map:10']);
});
```

**Why:** independence is throttle's closure guarantee too — each factory call creates a fresh `lastFiredAt`. If that variable lived at module level, `minimap(10)` would land inside `scrollBar`'s cooldown and be dropped, and this test would fail with `['bar:10']`.

### 5. `throttleTrailing`

```js
export function throttleTrailing(fn, intervalMs) {
  let lastFiredAt = -Infinity;
  let pendingArgs = null;
  let timerId = null;
  return function (...args) {
    const now = Date.now();
    if (now - lastFiredAt >= intervalMs) {
      lastFiredAt = now;
      fn.apply(this, args);
    } else {
      pendingArgs = args;                 // newest dropped call wins
      if (timerId === null) {
        timerId = setTimeout(() => {
          timerId = null;
          lastFiredAt = Date.now();
          const argsToFire = pendingArgs;
          pendingArgs = null;
          fn.apply(this, argsToFire);
        }, intervalMs - (now - lastFiredAt));
      }
    }
  };
}
```

**Why:** this merges the two twins: throttle's "when did I last fire?" timestamp decides *whether* to fire now, and debounce's `setTimeout` machinery delivers the leftovers *later*. Overwriting `pendingArgs` on every dropped call gives the debounce-style "last args win" rule; scheduling the timer only when `timerId === null` guarantees at most one trailing shot per cooldown. Verified with mock `setTimeout` + `Date`: output `[1]` mid-cooldown, `[1, 3]` at 100ms, unchanged after 500ms more.
