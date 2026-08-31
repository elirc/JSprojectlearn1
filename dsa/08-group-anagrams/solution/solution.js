/**
 * Group words that are anagrams of each other.
 * Groups come back in first-appearance order; within a group, words keep
 * their input order. Duplicates are kept. Comparison is case-sensitive.
 *
 * @param {string[]} words - list of words (may be empty; may contain "")
 * @returns {string[][]} groups of mutual anagrams
 */
export function groupAnagrams(words) {
  // key (letters in sorted order) -> the words that produced it.
  // Two words are anagrams exactly when their sorted letters match, so the
  // key is a perfect group label.
  const groups = new Map();

  for (const word of words) {
    // split/sort/join builds a NEW array, so the word itself is untouched.
    const key = word.split("").sort().join("");

    if (!groups.has(key)) {
      groups.set(key, []); // first word of a new group
    }
    groups.get(key).push(word); // input order preserved within the group
  }

  // A Map iterates in INSERTION order, and a key is inserted the first time
  // its group is opened — so this is exactly first-appearance order.
  return [...groups.values()];
}
