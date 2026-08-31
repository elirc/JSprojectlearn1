# 03 — Maximum Subarray (Kadane's algorithm)

Given a non-empty array of integers, find the **contiguous** stretch
(subarray) with the largest sum, and return that sum. "Contiguous" means
the elements sit next to each other in the array — no skipping.

A subarray can be as short as a single element, so even an all-negative
array has an answer: its least-negative element.

## Signature

```js
/**
 * @param {number[]} nums - non-empty array of integers
 * @returns {number} the largest sum of any contiguous subarray
 */
export function maxSubarraySum(nums) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `maxSubarraySum([-2,1,-3,4,-1,2,1,-5,4])` | `6` | best stretch is `[4,-1,2,1]` |
| `maxSubarraySum([5])` | `5` | single element is its own best |
| `maxSubarraySum([-3,-1,-2])` | `-1` | all negative → take the biggest single one |
| `maxSubarraySum([1,2,3,4])` | `10` | all positive → take everything |

## Constraints & edge cases

- `nums.length >= 1` — never empty.
- Values may be negative, zero, or positive.
- **All-negative arrays are the classic trap**: the answer is negative,
  so starting a "best" tracker at `0` gives a wrong answer.
- Return the **sum**, not the subarray itself.
- Aim for one pass, O(n) time, O(1) extra space.

## Hints (take them one at a time!)

1. Brute force: try every start index and every end index, sum each
   stretch. That's O(n²) (or worse). Before optimizing, ask: walking left
   to right, what *one number* would you need to remember about
   everything you've already passed?
2. Imagine ending a subarray exactly at position `i`. Its best possible
   sum is either: `nums[i]` alone, or `nums[i]` plus the best subarray
   ending at `i - 1`. When would you choose "alone"?
3. Keep two variables while looping: `endingHere` (best sum of a subarray
   ending at the current position) and `best` (best seen anywhere).
   At each element: `endingHere = Math.max(nums[i], endingHere + nums[i])`
   — i.e. if the running sum has gone negative it's dead weight, restart
   fresh — then `best = Math.max(best, endingHere)`. Initialize **both to
   `nums[0]`**, loop from index 1.

## Run it

```
node --test dsa/03-max-subarray/attempt.test.js
```
