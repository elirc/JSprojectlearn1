/**
 * Container With Most Water — two pointers, greedy narrowing.
 *
 * Start with the widest possible container (both ends). Every step,
 * record the area, then move the pointer at the SHORTER line inward:
 * keeping the shorter line while shrinking the width can never win,
 * so we lose nothing by abandoning it.
 *
 * Time O(n) — each pointer only moves inward, n steps total.
 * Space O(1) — three variables.
 *
 * @param {number[]} heights - non-negative line heights
 * @returns {number} the maximum area (0 if fewer than two lines)
 */
export function maxArea(heights) {
  let left = 0;
  let right = heights.length - 1;
  let best = 0;

  while (left < right) {
    const width = right - left;
    const shorter = Math.min(heights[left], heights[right]);
    const area = shorter * width;
    if (area > best) best = area;

    // Advance the pointer standing at the shorter line.
    // (On a tie either move is safe — neither end can improve alone.)
    if (heights[left] <= heights[right]) {
      left++;
    } else {
      right--;
    }
  }

  return best;
}
