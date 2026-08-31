/**
 * Valid Parentheses — a stack of the currently-open brackets.
 *
 * Openers are pushed. A closer must match the most recently opened
 * bracket, which is exactly the top of the stack: pop and compare.
 * Balanced means every closer matched AND nothing is left open.
 *
 * Time O(n) — one push or pop per character.
 * Space O(n) — worst case all openers, e.g. "((((((".
 */

/** For each closer, the opener it requires. */
const MATCHING_OPENER = { ")": "(", "]": "[", "}": "{" };

/**
 * @param {string} s - contains only the characters ( ) [ ] { }
 * @returns {boolean} true if balanced (empty string counts as balanced)
 */
export function isValidParentheses(s) {
  const open = []; // stack of unclosed openers, most recent on top

  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") {
      open.push(ch);
    } else {
      // pop() on an empty array returns undefined — a closer with
      // nothing open fails this comparison automatically.
      if (open.pop() !== MATCHING_OPENER[ch]) return false;
    }
  }

  // Anything still open never closed.
  return open.length === 0;
}
