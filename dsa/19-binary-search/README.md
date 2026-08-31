# 19 — Binary Search

Find a value in a **sorted** array by halving the search space every
step. Twenty questions, for arrays. Simple to describe, notoriously
fiddly to get exactly right — which is why you write it by hand.

## Signature

```js
/** @param {number[]} nums @param {number} target @returns {number} */
export function binarySearch(nums, target)
```

Return the **index** of `target`, or `-1` if it isn't there.

## Worked examples

**Example 1 — found immediately.** `binarySearch([1,3,5,7,9], 5)` →
`2`. The middle element *is* the target: one comparison instead of
five.

**Example 2 — narrowing.** `binarySearch([1,3,5,7,9], 9)` → `4`. Middle
is `5`, too small, so only indexes 3..4 remain. Middle of those is `7`,
still too small, so only index 4 remains. That's `9`.

**Example 3 — absent.** `binarySearch([1,3,5,7,9], 4)` → `-1`, and so
is target `10`. The window shrinks until it is empty and nothing was
found.

**Example 4 — degenerate.** `binarySearch([], 1)` → `-1`;
`binarySearch([7], 7)` → `0`; `binarySearch([7], 3)` → `-1`.

## Constraints & edge cases

- `nums` is sorted **ascending** with **distinct** values, so "the"
  index is unambiguous.
- Values may be negative; the array may be empty.
- **Use a loop — no recursion.**
- O(log n) time, O(1) space. `indexOf`/`includes` miss the point
  entirely: they are O(n).

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

Track the part of the array still worth looking at with two indexes,
`low` and `high` — the first and last positions of the live window.
Start with the whole array: `0` and `nums.length - 1`.
</details>

<details><summary>Hint 2 (direction)</summary>

Compare `target` with the middle element. Three outcomes: equal (done),
middle too small (the answer can only be to the *right*), middle too
big (only to the *left*). Each step throws away half the window.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Move *past* the middle, never onto it: `low = mid + 1` or
`high = mid - 1`. Writing `low = mid` leaves the window unchanged when
`mid === low`, and the loop spins forever. The `± 1` is what guarantees
progress — the element at `mid` has just been ruled out anyway.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

```
low = 0; high = nums.length - 1
while low <= high:                    // <=, so a 1-element window is checked
    mid = Math.floor((low + high) / 2)
    if nums[mid] === target: return mid
    if nums[mid] < target: low = mid + 1
    else: high = mid - 1
return -1
```

Two details worth staring at: `<=` (not `<`) and `Math.floor`
(indexes must be whole numbers).
</details>

## Run

```
node --test dsa/19-binary-search/attempt.test.js
```
