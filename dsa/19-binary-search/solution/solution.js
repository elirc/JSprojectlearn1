/**
 * Binary search — halve the live window until the value shows up.
 *
 * `low` and `high` are the first and last indexes still worth
 * checking. The invariant: if `target` is in the array at all, its
 * index is somewhere in [low, high]. Every turn rules out half of
 * that range, so the window empties in about log2(n) steps.
 *
 * Time: O(log n). Space: O(1).
 *
 * @param {number[]} nums - sorted ascending, distinct values
 * @param {number} target
 * @returns {number} the index of target, or -1 if it isn't there
 */
export function binarySearch(nums, target) {
  let low = 0;
  let high = nums.length - 1; // -1 for an empty array: the loop never runs

  // `<=` (not `<`) so a one-element window still gets inspected.
  while (low <= high) {
    // Math.floor keeps mid an integer; it lands left of centre on
    // even-sized windows, which is fine — both halves still shrink.
    const mid = Math.floor((low + high) / 2);

    if (nums[mid] === target) return mid;

    if (nums[mid] < target) {
      low = mid + 1; // everything at mid and left of it is too small
    } else {
      high = mid - 1; // everything at mid and right of it is too big
    }
    // The ±1 is what guarantees progress: mid has just been ruled out,
    // so excluding it makes the window strictly smaller every turn.
  }

  return -1; // window emptied — target was never in the array
}
