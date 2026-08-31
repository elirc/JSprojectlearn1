# 04 — Merge Sorted Arrays

Given **two arrays that are each already sorted** (ascending), return a
**new** array containing all elements of both, still sorted. Don't modify
the inputs, and don't just concatenate-and-sort — the whole point is to
exploit the sortedness with **two pointers**.

## Signature

```js
/**
 * @param {number[]} a - sorted ascending (may be empty, may hold duplicates)
 * @param {number[]} b - sorted ascending (may be empty, may hold duplicates)
 * @returns {number[]} new sorted array with every element of a and b
 */
export function mergeSorted(a, b) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `mergeSorted([1,3,5], [2,4,6])` | `[1,2,3,4,5,6]` | perfect interleave |
| `mergeSorted([1,2,3], [4,5,6])` | `[1,2,3,4,5,6]` | one array entirely first |
| `mergeSorted([], [1,2])` | `[1,2]` | empty side contributes nothing |
| `mergeSorted([1,2,2], [2,3])` | `[1,2,2,2,3]` | duplicates are all kept |

## Constraints & edge cases

- Either or both arrays may be empty (`mergeSorted([], [])` → `[]`).
- Duplicates within one array *and* across the two arrays must all
  appear in the output (merging keeps everything, it never dedupes).
- Negative numbers are fine; the arrays may have very different lengths.
- **Do not mutate `a` or `b`.** Return a brand-new array.
- Target: O(n + m) time — each element looked at once. (`[...a, ...b]
  .sort(...)` works but is O((n+m) log(n+m)) and learns you nothing.)

## Hints (take them one at a time!)

1. Picture the two arrays as two face-up piles of cards, each pile
   sorted with smallest on top. How would you physically build one
   sorted pile from them, glancing at only the top cards?
2. Keep one index per array — `i` into `a`, `j` into `b`. Compare
   `a[i]` and `b[j]`; the smaller one is *guaranteed* to be the smallest
   unplaced element anywhere (why? everything behind it in its own array
   is bigger, and it just beat the other pile's smallest). Push it, and
   advance only that index.
3. Loop while **both** indexes are in bounds, comparing with `<=` (take
   from `a` on ties — either side is correct, but pick one and be
   consistent). When one array runs out, the other's remainder is
   already sorted: push the rest of it in one final sweep (two small
   while-loops, or `result.push(...a.slice(i))`).

## Run it

```
node --test dsa/04-merge-sorted-arrays/attempt.test.js
```
