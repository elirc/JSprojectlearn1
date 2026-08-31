# 01 — Two Sum

Given an array of numbers and a target, find the **two different positions**
in the array whose values add up to the target. Return those two positions
(indices) as an array `[i, j]` with `i < j`.

You may assume every input has **exactly one** valid answer, and you may not
use the same element twice (the same index twice — two *equal values* at
different indices are fine).

## Signature

```js
/**
 * @param {number[]} nums  - array of integers (length >= 2)
 * @param {number} target  - the sum we want
 * @returns {number[]} [i, j] with i < j and nums[i] + nums[j] === target
 */
export function twoSum(nums, target) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `twoSum([2, 7, 11, 15], 9)` | `[0, 1]` | 2 + 7 = 9 |
| `twoSum([3, 2, 4], 6)` | `[1, 2]` | 2 + 4 = 6 (not 3 + 3 — you can't reuse index 0) |
| `twoSum([3, 3], 6)` | `[0, 1]` | two equal values at *different* indices is allowed |
| `twoSum([-1, -2, -3, -4, -5], -8)` | `[2, 4]` | -3 + -5 = -8; negatives work like any number |

## Constraints & edge cases

- `nums.length >= 2`; exactly one answer exists.
- Values can be negative, zero, or repeated.
- Return indices in ascending order: `[smaller, larger]`.
- Don't sort the array — sorting scrambles the indices you must return.
- Aim for a solution that walks the array **once** (O(n) time).

## Hints (take them one at a time!)

1. The slow way checks every pair (a loop inside a loop). It works — get it
   passing first if you want — but for each element you're re-scanning
   everything. What question are you really asking at each element?
2. At element `x` the question is: "have I already *seen* the number
   `target - x`?" That's a lookup question. What data structure answers
   "have I seen this before, and where?" instantly?
3. Walk the array once with a `Map` from value → index. For each `nums[i]`,
   compute `need = target - nums[i]`. If the map already has `need`, return
   `[map.get(need), i]`. Otherwise store `map.set(nums[i], i)` and move on.

## Run it

```
node --test dsa/01-two-sum/attempt.test.js
```
