/**
 * Length of the longest run of consecutive integers present in `nums`.
 * Values may appear in any order; duplicates count once.
 *
 * @param {number[]} nums - unsorted integers (may be empty, may repeat)
 * @returns {number} length of the longest consecutive value-run
 */
export function longestConsecutive(nums) {
  // A Set gives O(1) "is this value present?" and drops duplicates for
  // free — which is exactly the two things this problem needs.
  const values = new Set(nums);

  let longest = 0;

  for (const value of values) {
    // Only walk a run from its START. If value - 1 is present, this value
    // is in the middle of a run that some earlier (smaller) value will
    // handle — skip it. This guard is what keeps the whole thing linear.
    if (values.has(value - 1)) continue;

    // Walk upward as far as the run goes.
    let current = value;
    let length = 1;
    while (values.has(current + 1)) {
      current++;
      length++;
    }

    if (length > longest) longest = length;
  }

  // Empty input never enters the loop, so 0 falls out naturally.
  return longest;
}
