# 22 — Quick Select (kth smallest)

Given an unsorted array, return the **k-th smallest** value in it — without
sorting the whole array. `Array.prototype.sort()` is off limits again.

**`k` is 1-based.** `k = 1` means the minimum, `k = arr.length` means the
maximum, `k = 3` means "third smallest." Read that twice: the off-by-one
between a 1-based rank and a 0-based index is where this problem bites.

The technique is *partitioning* — the same move that powers quicksort — used
here to throw away half the array on every step instead of sorting both halves.

## Signature

```js
/**
 * @param {number[]} arr - non-empty array of numbers
 * @param {number} k - 1-based rank (1 <= k <= arr.length)
 * @returns {number} the k-th smallest value in arr
 */
export function quickSelect(arr, k) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `quickSelect([7, 2, 9, 4], 1)` | `2` | sorted is `[2,4,7,9]`; 1st smallest is the min |
| `quickSelect([7, 2, 9, 4], 3)` | `7` | 3rd smallest — index 2 of the sorted array |
| `quickSelect([7, 2, 9, 4], 4)` | `9` | k = n is the maximum |
| `quickSelect([3, 3, 1], 2)` | `3` | duplicates count positionally: sorted is `[1,3,3]` |

## Constraints & edge cases

- `k` is guaranteed valid (`1 <= k <= arr.length`), so you never need to
  handle a bad `k`. The array is never empty.
- Duplicates are counted **positionally**, not as distinct values: the 2nd
  *and* 3rd smallest of `[3, 3, 1]` are both `3`.
- Values can be negative or zero.
- The caller's array must be **unchanged** when you return (the tests check
  this). Partitioning moves elements around — so work on a copy.
- A single-element array with `k = 1` must work.
- Target complexity: **O(n) average** time, O(n²) worst case, O(n) space for
  the defensive copy.

## Hints (take them one at a time!)

1. dsa/21 split the array in half and sorted **both** halves. Here you only
   need one number. After you split, do you actually care about both sides?
2. *Partition* the array around some chosen `pivot` value: shuffle elements
   so everything smaller than the pivot sits to its left and everything else
   to its right. The pivot is now at its **final sorted index** `p` — you got
   that for free, without sorting anything else. Compare `p` to `k - 1`: if
   they match you are done; otherwise recurse (or loop) into the one side
   that can still contain the answer, exactly like dsa/19 discards a half.
3. Copy first: `const a = [...arr];`. Track a window `lo = 0`, `hi = a.length - 1`
   and loop while `lo < hi`. Inside: pick the middle element as pivot, swap it
   to `a[hi]`, then walk `read` from `lo` to `hi - 1` with a `write` pointer
   (dsa/05's move-zeroes pattern), swapping every element `< pivot` down to
   `write++`. Finally `swap(write, hi)` and treat `write` as `p`. Then
   `p === k - 1` → return `a[p]`; `k - 1 < p` → `hi = p - 1`; else `lo = p + 1`.

## Run it

```
node --test dsa/22-quick-select-kth/attempt.test.js
```
