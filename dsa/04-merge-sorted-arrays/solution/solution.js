/**
 * Merge two sorted arrays into one new sorted array.
 * Inputs are not modified; duplicates are kept.
 *
 * @param {number[]} a - sorted ascending (may be empty, may hold duplicates)
 * @param {number[]} b - sorted ascending (may be empty, may hold duplicates)
 * @returns {number[]} new sorted array with every element of a and b
 */
export function mergeSorted(a, b) {
  const merged = [];

  // Two bookmarks: the next unread position in each array.
  let i = 0;
  let j = 0;

  // While BOTH arrays still have something left, the smaller of the two
  // "fronts" is the smallest unplaced element anywhere: everything behind
  // it in its own array is >= it, and it just beat the other array's front.
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      merged.push(a[i]);
      i++; // advance ONLY the array we took from
    } else {
      merged.push(b[j]);
      j++;
    }
  }

  // One array ran out. The other's leftovers are already sorted and are all
  // >= everything placed so far, so they can be appended as-is. Exactly one
  // of these two loops does any work.
  while (i < a.length) {
    merged.push(a[i]);
    i++;
  }
  while (j < b.length) {
    merged.push(b[j]);
    j++;
  }

  return merged;
}
