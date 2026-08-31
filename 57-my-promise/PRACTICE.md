# 🏋️ Practice: MyPromise

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

The README leaves `finally` and the static combinators "as exercises" — here they are. You don't need to edit `my-promise.js`: in a scratch file, `import { MyPromise } from './refactored/my-promise.js'` and attach your additions from outside (`MyPromise.prototype.finally = ...`, `MyPromise.all = ...`). Everything must be buildable from the public pieces: `then`, `catch`, `MyPromise.resolve/reject`, `new MyPromise(executor)`. Runs offline with `node` — and note you can `await` a MyPromise directly, because `await` adopts any thenable.

## Exercises

### ⭐ 1. Resolve-with-a-promise flattens (warm-up)

Write a test showing that `MyPromise.resolve(innerPromise)` gives you the inner promise's *value*, not a promise-in-a-promise. Make the inner one settle late (a `setTimeout`) so you prove adoption waits.

What it practices: thenable adoption — the rule `#resolveWith` implements.
Expected: `await MyPromise.resolve(inner)` is `5` (not a MyPromise object), even though `inner` resolves 10 ms later.
Hint: build `inner` with `new MyPromise(resolve => setTimeout(() => resolve(5), 10))`.

### ⭐⭐ 2. `finally(onFinally)`

Implement `finally`: runs the callback whether the promise fulfilled or rejected, **passes the original outcome through** (value stays, reason still throws), and if `onFinally` itself throws, *that* error wins. Bonus rule (the real spec's): if `onFinally` returns a promise, wait for it before passing the outcome on.

What it practices: building a new combinator purely out of `then` — no access to private state needed.
Expected: `MyPromise.resolve(7).finally(() => log.push('cleanup'))` resolves `7`; a rejected chain still rejects with the *original* error after cleanup ran; a throwing `onFinally` replaces the outcome with its own rejection.
Hint: two-handler `then`; in each handler run `onFinally()`, wrap it in `MyPromise.resolve(...)`, and chain the pass-through after it.

### ⭐⭐ 3. `MyPromise.all(items)`

Implement `all`: resolves with an array of values **in input order** (not settle order), rejects with the first rejection, and resolves `[]` for an empty array. Mix a slow item, a fast item, and a plain non-promise value in your test.

What it practices: coordinating N promises with a counter in a closure — and why the microtask queue makes that counter safe.
Expected: `await MyPromise.all([slow10msA, fastB, 'plain'])` is `['A', 'B', 'plain']`; if one item rejects, the whole thing rejects with that error.
Hint: `values[i] = v` with the loop's own index, plus a `remaining` counter; resolve when it hits 0. `MyPromise.resolve(item)` normalizes plain values.

### ⭐⭐ 4. `MyPromise.race(items)`

Implement `race`: settles exactly like the *first* item to settle, value or error. Then answer in a comment: why does the "loser" calling `resolve` later cause no bug, with no extra guard code from you?

What it practices: seeing the settle-once state machine do the work — the guard you built in the constructor *is* the feature.
Expected: fast rejection beats slow fulfillment → `race` rejects with the fast error; swap the speeds → it fulfills.
Hint: the whole body is one loop calling `.then(resolve, reject)` on each item. That's not a trick — that's the point.

### ⭐⭐⭐ 5. `MyPromise.any(items)`

Implement `any`: fulfills with the **first fulfillment**; rejects only if *all* items reject, with an `AggregateError` whose `errors` array holds every reason **in input order**. An empty input rejects immediately with an empty `AggregateError`.

What it practices: the mirror image of `all` — count rejections instead of fulfillments, and keep per-slot bookkeeping for the error report.
Expected: `[rejectFast, fulfillSlow('ok')]` → fulfills `'ok'`; `[rejectA, rejectB]` → rejects with `err.errors.map(e => e.message)` equal to `['A', 'B']` even if B rejected first.
Hint: `errors[i] = reason` (input order!), `remaining--`, reject with `new AggregateError(errors, ...)` at 0. First fulfillment just calls `resolve` — settle-once ignores the rest.

## Solutions

### 1. Adoption test

```js
const inner = new MyPromise((resolve) => setTimeout(() => resolve(5), 10));
const outer = MyPromise.resolve(inner);
assert.equal(await outer, 5);
```

WHY: `MyPromise.resolve(inner)` hands `inner` to `#resolveWith`, which finds a callable `.then` and *adopts* — the outer promise stays pending until the inner one settles, then takes its value. That single rule is why chains flatten instead of nesting, and this test shows it working across real time, not just synchronously.

### 2. `finally`

```js
MyPromise.prototype.finally = function (onFinally) {
  return this.then(
    (value) => MyPromise.resolve(onFinally()).then(() => value),
    (reason) => MyPromise.resolve(onFinally()).then(() => { throw reason; }),
  );
};
```

```js
const log = [];
assert.equal(await MyPromise.resolve(7).finally(() => log.push('cleanup')), 7);
await MyPromise.reject(new Error('boom'))
  .finally(() => log.push('cleanup2'))
  .catch((e) => log.push('caught ' + e.message));
// log: ['cleanup', 'cleanup2', 'caught boom']
```

WHY: `finally` is pure composition — both `then` handlers run the callback, then re-emit the original outcome (`() => value` or re-`throw reason`). Wrapping `onFinally()`'s return in `MyPromise.resolve` makes a returned thenable delay the pass-through (adoption again), and if `onFinally` throws, the throw happens inside a handler, which — by the machinery you built — rejects the next promise, correctly replacing the outcome.

### 3. `MyPromise.all`

```js
MyPromise.all = function (items) {
  return new MyPromise((resolve, reject) => {
    const values = [];
    let remaining = 0;
    let index = 0;
    for (const item of items) {
      const i = index++;
      remaining++;
      MyPromise.resolve(item).then((v) => {
        values[i] = v;
        if (--remaining === 0) resolve(values);
      }, reject);
    }
    if (index === 0) resolve([]);
  });
};
```

```js
const slow = new MyPromise((r) => setTimeout(() => r('A'), 10));
assert.deepEqual(await MyPromise.all([slow, MyPromise.resolve('B'), 'plain']),
  ['A', 'B', 'plain']);
await MyPromise.all([MyPromise.reject(new Error('bad')), slow])
  .catch((e) => assert.equal(e.message, 'bad'));
assert.deepEqual(await MyPromise.all([]), []);
```

WHY: `values[i] = v` stores by *input slot*, so order is by position, not by finish time. The `remaining` counter is safe from a subtle race because of exercise-0 knowledge: handlers run on the microtask queue, never synchronously inside `then`, so the loop finishes incrementing before any handler can decrement — your own `#schedule` guarantees it. Any rejection calls `reject` directly, and settle-once makes later results no-ops.

### 4. `MyPromise.race`

```js
MyPromise.race = function (items) {
  return new MyPromise((resolve, reject) => {
    for (const item of items) MyPromise.resolve(item).then(resolve, reject);
  });
};
```

```js
const slowWin = new MyPromise((r) => setTimeout(() => r('slow'), 30));
const fastFail = new MyPromise((_, j) => setTimeout(() => j(new Error('fast')), 5));
await MyPromise.race([slowWin, fastFail]).catch((e) => assert.equal(e.message, 'fast'));
```

WHY: every item gets to call `resolve` or `reject`, but the constructor's `settled` guard means only the first call counts — the losers' later calls hit `if (settled) return` and vanish. No extra bookkeeping is needed because the state machine already enforces "one way, one time". `race` is the exercise that proves the guard isn't defensive clutter; it's load-bearing API.

### 5. `MyPromise.any`

```js
MyPromise.any = function (items) {
  return new MyPromise((resolve, reject) => {
    const errors = [];
    let remaining = 0;
    let index = 0;
    for (const item of items) {
      const i = index++;
      remaining++;
      MyPromise.resolve(item).then(resolve, (reason) => {
        errors[i] = reason;
        if (--remaining === 0) {
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
    }
    if (index === 0) reject(new AggregateError([], 'All promises were rejected'));
  });
};
```

```js
const ok = new MyPromise((r) => setTimeout(() => r('ok'), 10));
assert.equal(await MyPromise.any([MyPromise.reject(new Error('no')), ok]), 'ok');
await MyPromise.any([MyPromise.reject(new Error('A')), MyPromise.reject(new Error('B'))])
  .catch((e) => assert.deepEqual(e.errors.map((x) => x.message), ['A', 'B']));
```

WHY: `any` mirrors `all` with the roles swapped — fulfillments short-circuit via bare `resolve` (settle-once absorbs duplicates), rejections are *counted and recorded by slot* so the final `AggregateError` reports every failure in input order regardless of timing. It reuses all three of the project's big ideas at once: adoption (`MyPromise.resolve(item)` normalizes anything), microtask scheduling (the counter can't race the loop), and the settle-once state machine (first fulfillment wins cleanly).
