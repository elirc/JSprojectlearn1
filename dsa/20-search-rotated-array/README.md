# 20 — Search in a Rotated Sorted Array

Take a sorted array and *rotate* it: cut it somewhere and swap the two
pieces, so `[0,1,2,4,5,6,7]` becomes `[4,5,6,7,0,1,2]`. Now find a
value in it in **O(log n)** anyway.

## Signature

```js
/** @param {number[]} nums @param {number} target @returns {number} */
export function searchRotated(nums, target)
```

Return the **index** of `target`, or `-1` if it isn't there.

## Worked examples

**Example 1 — the classic.** On `[4,5,6,7,0,1,2]`:
`searchRotated(nums, 0)` → `4`, `searchRotated(nums, 6)` → `2`,
`searchRotated(nums, 3)` → `-1`.

**Example 2 — why plain binary search breaks.** Searching that same
array for `0`, the middle element is `7`. Since `7 > 0`, ordinary
binary search goes **left** — and `0` is on the right. Sortedness is
only *locally* true here, and the naive comparison reads it globally.

**Example 3 — not rotated at all.** `searchRotated([1,2,3,4,5], 4)` →
`3`. Rotation by `0` is still a valid rotation.

**Example 4 — degenerate.** `searchRotated([], 5)` → `-1`;
`searchRotated([1], 1)` → `0`; `searchRotated([3,1], 1)` → `1`.

## Constraints & edge cases

- `nums` was sorted **ascending** with **distinct** values, then
  rotated left by some amount (possibly `0`).
- May be empty, or a single element.
- **O(log n)** time — a linear scan defeats the purpose.
- One pass of a modified binary search; don't find the seam in a
  separate O(n) loop.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

Cut a rotated array anywhere and look at the two halves. One of them
always contains the "wrap" point where the values drop — and the
**other half is perfectly sorted**. Always. Convince yourself with
`[4,5,6,7,0,1,2]` cut at every position.
</details>

<details><summary>Hint 2 (direction)</summary>

So each turn: work out which half is the clean, sorted one. Compare the
first element of the window with the middle — if
`nums[low] <= nums[mid]` the left half is the sorted one, otherwise the
right half is.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Inside a sorted half you can decide **exactly** whether the target
lives there — just check whether it lies between that half's two ends.
If it does, search there; if it doesn't, it can only be in the other
half. Either way you discard half the array, so it stays O(log n).
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

```
low = 0; high = nums.length - 1
while low <= high:
    mid = floor((low + high) / 2)
    if nums[mid] === target: return mid
    if nums[low] <= nums[mid]:                       // left half sorted
        if nums[low] <= target < nums[mid]: high = mid - 1
        else:                               low  = mid + 1
    else:                                            // right half sorted
        if nums[mid] < target <= nums[high]: low  = mid + 1
        else:                                high = mid - 1
return -1
```

Note the asymmetric `<=` / `<`: `mid` was already ruled out above, but
the ends `low`/`high` are still live candidates.
</details>

## Run

```
node --test dsa/20-search-rotated-array/attempt.test.js
```
