# 🏋️ Practice: Array Utilities

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. `mostCommon` — compose two utilities (warm-up)

Write `mostCommon(items)` that returns the value appearing most often, by *composing* the existing utilities: `countBy` to tally, then `sortBy` on the counts. Expected: `mostCommon(['a','b','a'])` returns `'a'`, `mostCommon(['x','y','x','y','y'])` returns `'y'`, and `mostCommon([])` returns `undefined`. On a tie, the first-seen value wins.

**Practices:** composing small utilities instead of writing new loops.

**Hint:** a Map spreads into `[key, count]` pairs: `[...countBy(items, x => x)]`. Sort those pairs by their count, descending.

### ⭐⭐ 2. `uniqueBy` — dedupe by derived key (core)

`unique` can only dedupe by the values themselves. Write `uniqueBy(items, keyOf)` that keeps the *first* item for each distinct key and never mutates the input. Expected: with the players list from the tests, `uniqueBy(players, p => p.team)` keeps `ana` (first red) and `bo` (only blue) and drops `cy` — and `players` still has length 3 afterwards.

**Practices:** house rule #2 — `keyOf` functions make one utility fit every data shape.

**Hint:** a `Set` of keys already seen, plus a result array you push into. One pass.

### ⭐⭐ 3. `partition` — one pass, two piles (core)

Write `partition(items, predicate)` that returns a pair of new arrays `[pass, fail]`: items where `predicate(item)` is true, then everything else, both in original order. Expected: `partition([1,2,3,4,5], n => n % 2 === 0)` returns `[[2,4],[1,3,5]]`. Add a test asserting the input array is untouched — house rule #1.

**Practices:** higher-order functions (a predicate is a function parameter) and the never-mutate rule.

**Hint:** you can pick which array to push into with one expression: `(predicate(item) ? pass : fail).push(item)`.

### ⭐⭐ 4. `sortByMany` — tie-breaker sorting (core)

`sortBy` can't express "by team, then by score within a team". Write `sortByMany(items, keyOfs)` taking an *array* of keyOf functions: compare by the first key; on a tie, fall through to the next. Expected: sorting `[{team:'red',score:12,name:'cy'}, {team:'blue',score:80,name:'ana'}, {team:'red',score:5,name:'bo'}]` with `[p => p.team, p => p.score]` gives names `['ana','bo','cy']` — and the input order is unchanged.

**Practices:** the comparator contract (negative / zero / positive) and looping until a non-tie.

**Hint:** inside the comparator, loop over `keyOfs`; return `-1`/`1` as soon as one key differs, and `0` only after all keys tie.

### ⭐⭐⭐ 5. `groupByNested` — grouping at any depth (challenge)

Generalize `groupBy`: write `groupByNested(items, keyOfs)` that groups by the first keyOf, then groups each bucket by the next, recursively, returning Maps inside Maps. Expected with four log objects (`error/db`, `warn/web`, `error/db`, `error/web`) and keys `[l => l.level, l => l.source]`: `g.get('error').get('db')` has length 2, `g.get('error').get('web')` has length 1, and `g.get('warn').get('db')` is `undefined`.

**Practices:** recursion over a shrinking list of key functions — the same base-case thinking as project 25.

**Hint:** with one keyOf left, plain `groupBy` is your base case. Otherwise, `groupBy` by the first keyOf, then replace each bucket with a recursive call on the rest.

## Solutions

### 1. `mostCommon`

```js
export function mostCommon(items) {
  const counts = countBy(items, (x) => x);
  const ranked = sortBy([...counts], ([, count]) => count, { descending: true });
  return ranked[0]?.[0];
}
```

**Why:** zero new loops — `countBy` tallies, `sortBy` ranks, destructuring (`[, count]`) is just a `keyOf` that reads the pair's second slot. Ties go to the first-seen value because Maps remember insertion order and `.sort()` is stable. `?.` handles the empty-input case without a guard clause.

### 2. `uniqueBy`

```js
export function uniqueBy(items, keyOf) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
```

**Why:** same O(n) `Set` bookkeeping as `unique`, but the *caller* decides what "same" means — the `keyOf` house rule. A fresh `result` array keeps house rule #1: the input is never reordered or shortened.

### 3. `partition`

```js
export function partition(items, predicate) {
  const pass = [];
  const fail = [];
  for (const item of items) {
    (predicate(item) ? pass : fail).push(item);
  }
  return [pass, fail];
}
```

Test: `const nums = [1,2,3]; partition(nums, n => n > 1); assert.deepEqual(nums, [1,2,3]);`

**Why:** one pass, two fresh arrays — compare with calling `.filter()` twice, which walks the data twice. The predicate parameter is the same higher-order-function design as `keyOf`: the utility supplies the loop, the caller supplies the judgment.

### 4. `sortByMany`

```js
export function sortByMany(items, keyOfs) {
  return [...items].sort((a, b) => {
    for (const keyOf of keyOfs) {
      const keyA = keyOf(a);
      const keyB = keyOf(b);
      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
    }
    return 0;
  });
}
```

**Why:** the comparator contract scales: each key gets a chance to break the tie, and only a full tie returns 0. Comparing with `<`/`>` (not subtraction) keeps it correct for strings like team names — the README's exact warning. `[...items]` preserves house rule #1.

### 5. `groupByNested`

```js
export function groupByNested(items, keyOfs) {
  const [first, ...rest] = keyOfs;
  const groups = groupBy(items, first);
  if (rest.length === 0) return groups; // base case: one level left
  const nested = new Map();
  for (const [key, members] of groups) {
    nested.set(key, groupByNested(members, rest));
  }
  return nested;
}
```

**Why:** recursion with a shrinking problem — each call consumes one keyOf, and the base case is plain `groupBy`. Because it's built *on* `groupBy`, it inherits the Map safety (hostile keys like `"constructor"` are fine) for free. Verified with node: `g.get('error').get('db').length === 2`, missing combinations come back `undefined` rather than throwing.
