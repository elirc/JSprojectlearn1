/**
 * Move every zero to the end of the array, in place, keeping the relative
 * order of the non-zero values. Returns the same array it was given.
 *
 * @param {number[]} nums - array of integers (may be empty)
 * @returns {number[]} the SAME array, mutated
 */
export function moveZeroes(nums) {
  // `write` marks where the next surviving (non-zero) value belongs.
  // It only advances when we actually keep something, so it always trails
  // (or equals) `read` — which is why overwriting is safe.
  let write = 0;

  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      nums[write] = nums[read];
      write++;
    }
    // Zeros are simply not copied; `write` stays where it is and the next
    // non-zero will land on top of this slot.
  }

  // Everything from `write` onward is stale leftovers from before the
  // compaction. That's exactly how many zeros we skipped, so fill it.
  for (let i = write; i < nums.length; i++) {
    nums[i] = 0;
  }

  // Return the same array so callers can chain; the mutation is the point.
  return nums;
}
