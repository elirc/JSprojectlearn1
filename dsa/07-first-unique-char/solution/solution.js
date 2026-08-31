/**
 * Index of the first character that appears exactly once in `s`.
 * Returns -1 when every character repeats (or the string is empty).
 *
 * @param {string} s - any string (may be empty)
 * @returns {number} index of the first non-repeating character, or -1
 */
export function firstUniqChar(s) {
  // Pass 1: how many times does each character appear? Order is irrelevant
  // here — we just want the facts, computed once.
  const counts = new Map();
  for (const ch of s) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }

  // Pass 2: walk the ORIGINAL string left to right. The first character
  // whose tally is 1 is, by construction, the leftmost unique one — and we
  // already have its index for free. (Scanning the Map instead would hand
  // back a character, not a position, costing an extra indexOf.)
  for (let i = 0; i < s.length; i++) {
    if (counts.get(s[i]) === 1) return i;
  }

  // Fell off the end: every character repeats, or the string was empty.
  return -1;
}
