# 09 — Longest Consecutive Sequence

Given an unsorted array of integers, return the **length of the longest run
of consecutive numbers** that appear in it (numbers that step up by exactly
1). The numbers do **not** have to be next to each other in the array —
only their *values* have to be consecutive.

## Signature

```js
/**
 * @param {number[]} nums - unsorted integers (may be empty, may repeat)
 * @returns {number} length of the longest consecutive value-run present
 */
export function longestConsecutive(nums) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `longestConsecutive([100, 4, 200, 1, 3, 2])` | `4` | `1, 2, 3, 4` are all present (scattered) |
| `longestConsecutive([1, 2, 0, 1])` | `3` | `0, 1, 2`; the duplicate `1` adds nothing |
| `longestConsecutive([1, 3, 5])` | `1` | no two values are adjacent; the best run is a single number |
| `longestConsecutive([-3, -2, -1, 0])` | `4` | negatives are consecutive like anything else |

## Constraints & edge cases

- Empty array → `0`. Any non-empty array → at least `1`.
- **Duplicates count once**: `[1, 1, 1]` → `1`, not `3`.
- Negative numbers and zero are ordinary values; runs may cross zero.
- The array is unsorted and must not be mutated or reordered.
- A "gap" of 2 breaks a run: `[1, 3]` is two runs of length 1.
- Target: **O(n) time.** Sorting first gives an easy O(n log n) solution —
  get it working if you like, then find the linear one.

## Hints (take them one at a time!)

1. Sorting makes this easy: walk the sorted values, extending a counter
   when the next value is exactly one more, resetting when it isn't (and
   skipping equal neighbours). But sorting costs O(n log n) — and you don't
   actually need the values *in order*, you only need to ask "is `x + 1`
   also here?" What structure answers that instantly?
2. Put every number in a `Set`. Now, for any `x`, `set.has(x + 1)` is O(1),
   so you can walk a run upward: `x`, `x+1`, `x+2`, … counting as you go.
   But if you do that starting from *every* number, you re-walk the same
   run over and over — `[1,2,3,4]` gets walked from 1, then from 2, then…
3. Only walk a run from its **start**. `x` starts a run exactly when
   `x - 1` is *not* in the set. Skip every other number instantly. Because
   each run is walked exactly once, the total work across all runs is O(n)
   even though there's a loop inside a loop.

## Run it

```
node --test dsa/09-longest-consecutive-sequence/attempt.test.js
```
