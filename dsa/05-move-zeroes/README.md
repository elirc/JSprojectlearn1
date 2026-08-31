# 05 — Move Zeroes

Given an array of numbers, move **every zero to the end** while keeping the
non-zero values in their original relative order. Do it **in place** —
modify the array you were given, don't build a new one — and return that
same array so calls can be chained.

## Signature

```js
/**
 * @param {number[]} nums - array of integers (may be empty)
 * @returns {number[]} the SAME array, mutated: non-zeros first (original
 *                     order), then all the zeros
 */
export function moveZeroes(nums) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `moveZeroes([0, 1, 0, 3, 12])` | `[1, 3, 12, 0, 0]` | 1, 3, 12 keep their order; two zeros land at the back |
| `moveZeroes([0, 0, 1])` | `[1, 0, 0]` | leading zeros all slide right |
| `moveZeroes([1, 2, 3])` | `[1, 2, 3]` | nothing to move |
| `moveZeroes([0, -1, 0, -2, 3])` | `[-1, -2, 3, 0, 0]` | negatives are non-zero like anything else |

## Constraints & edge cases

- The array may be empty (`[]` → `[]`), all zeros, or contain no zeros.
- Length must **not** change — you're rearranging, not removing.
- **Return the very same array object** you were handed
  (`moveZeroes(nums) === nums` must be true), and the caller's variable
  must see the new arrangement.
- Relative order of the non-zero values must be preserved exactly.
- Aim for one pass, O(n) time and O(1) extra space. Building a filtered
  array and copying it back works, but see if you can avoid the extra
  array entirely.

## Hints (take them one at a time!)

1. Two things are happening at different speeds: you're *reading* every
   slot, but you're only *writing* the slots that survive. What if reading
   and writing had separate positions?
2. Keep a second index — call it `write` — that starts at 0 and marks
   "where the next non-zero belongs". Scan with `read` from left to right;
   every time `nums[read]` is non-zero, put it at `nums[write]` and bump
   `write`. Because `write` never gets ahead of `read`, you only ever
   overwrite slots you've already looked at.
3. After that scan, the first `write` slots hold every non-zero value in
   order, and everything from index `write` to the end is leftover garbage.
   Fill that tail with zeros: `for (let i = write; i < nums.length; i++)
   nums[i] = 0;`. Then `return nums`.

## Run it

```
node --test dsa/05-move-zeroes/attempt.test.js
```
