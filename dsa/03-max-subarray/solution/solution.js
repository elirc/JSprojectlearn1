/**
 * Return the largest sum of any contiguous subarray of `nums`.
 * A subarray may be a single element; `nums` is never empty.
 *
 * Kadane's algorithm: one pass, carrying two facts.
 *
 * @param {number[]} nums - non-empty array of integers
 * @returns {number} the largest sum of any contiguous subarray
 */
export function maxSubarraySum(nums) {
  // Both start at nums[0], NOT 0 — with an all-negative array, a 0 start
  // would "win" without corresponding to any real subarray.
  let endingHere = nums[0]; // best sum of a subarray that ENDS at position i
  let best = nums[0]; // best sum seen anywhere so far

  for (let i = 1; i < nums.length; i++) {
    // Either extend the previous stretch, or start fresh at nums[i].
    // If endingHere went negative, it can only drag us down — restart.
    endingHere = Math.max(nums[i], endingHere + nums[i]);
    best = Math.max(best, endingHere);
  }

  return best;
}
