# 🏋️ Practice: Deep Equality Checker

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Pin the `-0` decision with tests (warm-up)

The header comment says `Object.is` treats `0` and `-0` as different — but no test pins that down. Add a test block to `refactored/deep-equal.test.js` asserting that `deepEqual(0, -0)` is `false`, `deepEqual(-0, -0)` is `true`, and `deepEqual([0], [-0])` is `false`.

**Practices:** turning an undocumented design decision into a test that guards it.

**Hint:** copy the shape of the existing NaN test. `node --test 25-deep-equal/` should show your new test passing.

### ⭐⭐ 2. Find and fix the RegExp bug (core)

Run `deepEqual(/cat/, /dog/)` in a scratch file. Surprise: it returns `true`! A RegExp is an object with *zero* own enumerable keys, so two totally different patterns sail through the key check. First write a test asserting `deepEqual(/cat/, /dog/)` is `false` (it should FAIL against the current code), then add a guard clause — in the same style as the Date guard — so the test passes. Two RegExps are equal when their `.source` and `.flags` strings match.

**Practices:** the guard-clause ladder pattern, and test-first bug fixing.

**Hint:** `(/cat/g).source` is `"cat"` and `(/cat/g).flags` is `"g"`. Your finished code should give `true` for `/cat/g` vs `/cat/g` and `false` for `/cat/g` vs `/cat/i`.

### ⭐⭐ 3. Write `deepClone` in the same style (core)

Write `deepClone(value)` — a new exported function that returns a copy of a value with no shared references, using the same guard-clause ladder: primitives out first, then Dates, then arrays, then plain objects. Verify it with your own `deepEqual`: the clone must deep-equal the original, but `clone !== original` for every object inside.

**Practices:** recursion with base cases; the difference between copying a value and copying a reference.

**Hint:** primitives can be returned as-is — they're copied by value automatically. Check: mutate `clone.a[1].b` and confirm the original is untouched.

### ⭐⭐ 4. `diffKeys` — say WHICH keys differ (core)

`deepEqual` only answers yes/no. Write `diffKeys(a, b)` that compares two plain objects and returns a sorted array of top-level key names that differ: a key counts as different if it's missing from either side, or if its values are not `deepEqual`. Expected: `diffKeys({a:1, b:2, c:3}, {a:1, b:9, d:4})` returns `['b', 'c', 'd']`, and `diffKeys({a:[1]}, {a:[1]})` returns `[]`.

**Practices:** reusing `deepEqual` as a building block, and `Object.hasOwn` vs reading a value.

**Hint:** collect the union of both key lists with a `Set`, then `filter`.

### ⭐⭐⭐ 5. Cycle-safe deepEqual (challenge)

LEARN.md showed that comparing two *different* cyclic objects crashes with "Maximum call stack size exceeded". Fix it: write `deepEqualSafe(a, b)` that carries a `Map` of object pairs it has already started comparing; when it meets the same `(a, b)` pair again, it returns `true` instead of recursing forever. Expected: for `p = {}; p.self = p;` and `q = {}; q.self = q;`, `deepEqualSafe(p, q)` returns `true` — and it still returns `false` for `{n:1, self:…}` vs `{n:2, self:…}` cycles.

**Practices:** breaking infinite recursion by remembering visited state — the same trick real libraries (and `assert.deepStrictEqual`) use.

**Hint:** give the function a third parameter `seen = new Map()`, check `seen.get(a) === b` before walking keys, and pass `seen` down into every recursive call.

## Solutions

### 1. Pinning `-0`

```js
test('0 and -0 are different values', () => {
  assert.equal(deepEqual(0, -0), false);
  assert.equal(deepEqual(-0, -0), true);
  assert.equal(deepEqual([0], [-0]), false);
});
```

**Why:** the README's big idea is that deep-equal semantics are *decisions*, and every decision deserves a test pinning it. `Object.is(0, -0)` is `false`, then the "only objects can still be equal" guard rejects two numbers — so the answer is `false`, even inside an array.

### 2. RegExp guard

```js
// place this right after the Date guard
if (a instanceof RegExp || b instanceof RegExp) {
  return a instanceof RegExp && b instanceof RegExp
    && a.source === b.source && a.flags === b.flags;
}
```

Test: `assert.equal(deepEqual(/cat/, /dog/), false);` plus `assert.equal(deepEqual(/cat/g, /cat/g), true);`

**Why:** same principle as Dates — some objects carry their meaning in internal state, not in enumerable keys, so the key-walk finale never sees it. The guard-clause ladder makes adding a new "kind" a three-line, low-risk change. Writing the failing test first proves you actually reproduced the bug.

### 3. `deepClone`

```js
export function deepClone(value) {
  if (value === null || typeof value !== 'object') return value; // primitives: by value
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(deepClone);
  const copy = {};
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key]);
  return copy;
}
```

**Why:** it's the mirror image of `deepEqual` — the same guard ladder, but each branch *builds* instead of *compares*. Primitives need no copying because they're value types; only references need opening. Verified: the clone deep-equals the original, shares no references, and mutating the clone leaves the original at `b === 2`.

### 4. `diffKeys`

```js
export function diffKeys(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys]
    .filter((key) =>
      !Object.hasOwn(a, key) || !Object.hasOwn(b, key) || !deepEqual(a[key], b[key]))
    .sort();
}
```

**Why:** composition — `deepEqual` becomes a building block for a richer tool, exactly how project 45's test framework will use it. `Object.hasOwn` matters here for the same reason as in the original: a missing key and a key holding `undefined` must not be confused.

### 5. Cycle-safe deepEqual

```js
export function deepEqualSafe(a, b, seen = new Map()) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (seen.get(a) === b) return true; // already comparing this pair — break the loop
  seen.set(a, b);
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && deepEqualSafe(a[key], b[key], seen));
}
```

**Why:** infinite recursion happens because the same comparison question comes back around ("does p.self equal q.self?" *is* "does p equal q?"). Recording in-progress pairs turns the endless loop into a base case: if we're already answering this exact question, assuming "equal" is safe — any real difference will be found on some other path. Verified with node: two empty cycles compare `true`, cycles differing in a normal key compare `false`, and flat objects behave exactly as before.
