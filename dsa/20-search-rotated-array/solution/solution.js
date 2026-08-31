/**
 * Search a rotated sorted array — binary search that first works out
 * which half it can trust.
 *
 * Key fact: however you cut a rotated sorted array in two, at most one
 * half can contain the "wrap" where values drop — so the OTHER half is
 * plainly sorted. In a plainly sorted half you can tell instantly
 * whether the target is inside (is it between the two ends?). If it
 * is, search there; if it isn't, search the other half. Either way
 * half the array is discarded, so the cost stays logarithmic.
 *
 * Time: O(log n). Space: O(1).
 *
 * @param {number[]} nums - sorted ascending then rotated; distinct values
 * @param {number} target
 * @returns {number} the index of target, or -1 if it isn't there
 */
export function searchRotated(nums, target) {
  let low = 0;
  let high = nums.length - 1; // -1 for an empty array: the loop never runs

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (nums[mid] === target) return mid;

    if (nums[low] <= nums[mid]) {
      // The LEFT half [low..mid] is sorted (<= covers a 1-wide half).
      if (nums[low] <= target && target < nums[mid]) {
        high = mid - 1; // inside the sorted half
      } else {
        low = mid + 1; // must be in the messy half, if anywhere
      }
    } else {
      // Otherwise the RIGHT half [mid..high] is the sorted one.
      if (nums[mid] < target && target <= nums[high]) {
        low = mid + 1; // inside the sorted half
      } else {
        high = mid - 1; // must be in the messy half, if anywhere
      }
    }
    // The bounds are asymmetric on purpose: mid was already tested for
    // equality above, so it is excluded; low and high are not.
  }

  return -1; // window emptied — target was never in the array
}
