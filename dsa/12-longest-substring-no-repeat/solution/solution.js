/**
 * Longest Substring Without Repeating Characters — sliding window.
 *
 * Keep a window [left..right] that never contains a duplicate, plus a
 * Set of the characters currently inside it. Each new character either
 * extends the window or forces the left edge to slide right until the
 * duplicate has been evicted. Track the widest the window ever gets.
 *
 * Time O(n) — each character enters the Set once and leaves at most once.
 * Space O(min(n, alphabet)) — the Set holds one window's characters.
 *
 * @param {string} s - any string (letters, digits, spaces, symbols)
 * @returns {number} length of the longest repeat-free substring
 */
export function lengthOfLongestSubstring(s) {
  const seen = new Set(); // characters inside the current window
  let left = 0;
  let best = 0;

  for (let right = 0; right < s.length; right++) {
    // Evict from the left until s[right] is no longer a duplicate.
    while (seen.has(s[right])) {
      seen.delete(s[left]);
      left++;
    }
    seen.add(s[right]);
    best = Math.max(best, right - left + 1);
  }

  return best;
}
