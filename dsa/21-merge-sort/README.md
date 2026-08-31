# 21 — Merge Sort

Sort an array of numbers in ascending order by writing **merge sort** from
scratch. Return a **new** sorted array — the input must not be modified.

No `Array.prototype.sort()` allowed (that would be the whole point gone).
This is the classic *divide & conquer* algorithm: split the array in half,
sort each half (recursively), then merge the two sorted halves.

## Signature

```js
/**
 * @param {number[]} arr - array of numbers (may be empty)
 * @returns {number[]} a NEW array with the same numbers, ascending
 */
export function mergeSort(arr) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `mergeSort([5, 2, 8, 1])` | `[1, 2, 5, 8]` | split → `[5,2]` `[8,1]` → sort halves → merge |
| `mergeSort([3, 1, 2])` | `[1, 2, 3]` | odd length is fine — halves of size 1 and 2 |
| `mergeSort([7])` | `[7]` | one element is already sorted (base case!) |
| `mergeSort([])` | `[]` | nothing to sort |

## Constraints & edge cases

- Values can be negative, zero, or duplicated — duplicates must all survive.
- Return a **new** array; the original array must be unchanged afterwards
  (the tests check this).
- Empty array and single-element array must work — they are your base case.
- Target complexity: O(n log n) time, O(n) extra space.

## Hints (take them one at a time!)

1. What's the *smallest* array you literally cannot sort wrong? Arrays of
   length 0 or 1 are already sorted. Everything bigger, you split.
2. You already solved the hard half of this problem: dsa/04 was "merge two
   sorted arrays with two pointers." Merge sort is just: split in half,
   *trust the recursion* to sort each half, then do dsa/04 on the results.
3. `if (arr.length <= 1) return [...arr];` then
   `const mid = Math.floor(arr.length / 2);`,
   recurse on `arr.slice(0, mid)` and `arr.slice(mid)`, and merge the two
   sorted results with two index pointers, taking the smaller front element
   each time, then appending whatever is left over.

## Run it

```
node --test dsa/21-merge-sort/attempt.test.js
```
