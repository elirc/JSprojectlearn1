/**
 * Find the two indices whose values add up to `target`.
 * Exactly one answer exists; return [i, j] with i < j.
 *
 * @param {number[]} nums  - array of integers (length >= 2)
 * @param {number} target  - the sum we want
 * @returns {number[]} [i, j] with nums[i] + nums[j] === target
 */
export function twoSum(nums, target) {
  // value -> index of where we saw it. This is the "memory" we trade for speed.
  const seen = new Map();

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];

    // If the partner was seen EARLIER, its index is smaller — so the
    // ascending order [seen index, current index] comes for free.
    if (seen.has(need)) {
      return [seen.get(need), i];
    }

    // Record AFTER checking, so we never pair an element with itself
    // (important when need === nums[i], e.g. target 8 and nums[i] 4).
    seen.set(nums[i], i);
  }

  // The problem guarantees an answer, so we only get here on bad input.
  throw new Error("no two numbers add up to the target");
}
