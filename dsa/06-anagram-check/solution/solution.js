/**
 * Are the two strings anagrams — the same characters with the same counts?
 * Comparison is exact: case-sensitive, spaces and punctuation count.
 *
 * @param {string} a - first string (may be empty)
 * @param {string} b - second string (may be empty)
 * @returns {boolean} true if b is a rearrangement of a
 */
export function isAnagram(a, b) {
  // Cheapest possible rejection: rearranging can't change how many
  // characters there are. This also lets the loops below stay simple.
  if (a.length !== b.length) return false;

  // character -> how many times it appears in `a`
  const counts = new Map();
  for (const ch of a) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }

  // Walk `b` spending the tally. Any character that isn't there, or that
  // has already been used up, means the strings differ.
  for (const ch of b) {
    const left = counts.get(ch) ?? 0;
    if (left === 0) return false;
    counts.set(ch, left - 1);
  }

  // Equal lengths + every character of `b` paid for = the tally is exactly
  // empty. No final sweep over the map needed.
  return true;
}
