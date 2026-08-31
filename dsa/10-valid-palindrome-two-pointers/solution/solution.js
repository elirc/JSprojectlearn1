/**
 * Is a single character a letter or a digit?
 * @param {string} ch - one character
 * @returns {boolean}
 */
function isAlnum(ch) {
  return /[a-z0-9]/i.test(ch);
}

/**
 * Is `s` a palindrome, ignoring case and every non-alphanumeric character?
 * Alphanumeric means a-z, A-Z, 0-9.
 *
 * @param {string} s - any string (may be empty)
 * @returns {boolean} true if s reads the same forwards and backwards
 */
export function isPalindrome(s) {
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    // Skip anything that doesn't count, from both ends. The `left < right`
    // guard inside each loop is what stops an all-punctuation string from
    // walking off the end of the string.
    while (left < right && !isAlnum(s[left])) left++;
    while (left < right && !isAlnum(s[right])) right--;

    // Compare case-folded. If the skipping collapsed the two pointers onto
    // the same character, this compares it with itself — harmlessly true.
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;

    left++;
    right--;
  }

  // The pointers met or crossed without ever disagreeing.
  // Empty strings and single characters never enter the loop at all.
  return true;
}
