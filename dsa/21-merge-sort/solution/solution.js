/**
 * Merge sort: divide & conquer.
 *
 * 1. Base case: arrays of length 0 or 1 are already sorted — return a copy.
 * 2. Divide: split the array into two halves.
 * 3. Conquer: recursively sort each half.
 * 4. Combine: merge the two sorted halves with two pointers (dsa/04!).
 *
 * Time  O(n log n): log n levels of splitting, O(n) merging work per level.
 * Space O(n): the merged output arrays (plus O(log n) recursion stack).
 *
 * @param {number[]} arr - array of numbers (may be empty)
 * @returns {number[]} a new array with the same numbers, ascending
 */
export function mergeSort(arr) {
  // Base case: nothing to split. Copy so callers can't alias our input.
  if (arr.length <= 1) return [...arr];

  // Divide: two halves (sizes differ by at most 1 for odd lengths).
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid)); // trust the recursion:
  const right = mergeSort(arr.slice(mid)); // both halves come back sorted

  // Combine: merge two sorted arrays into one sorted array.
  return merge(left, right);
}

/**
 * Merge two already-sorted arrays into one sorted array (two pointers).
 * `<=` keeps the sort *stable*: on ties, the left half's element goes first.
 *
 * @param {number[]} a - sorted ascending
 * @param {number[]} b - sorted ascending
 * @returns {number[]} all elements of a and b, sorted ascending
 */
function merge(a, b) {
  const out = [];
  let i = 0; // next unused element of a
  let j = 0; // next unused element of b

  // While both sides have elements, take the smaller front one.
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      out.push(a[i++]);
    } else {
      out.push(b[j++]);
    }
  }

  // One side ran out — the other side's leftovers are already sorted
  // and all >= everything in `out`, so append them as-is.
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);

  return out;
}
