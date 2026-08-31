/**
 * Reverse the order of the words in `str`. Output is trimmed and
 * single-spaced regardless of the input's spacing.
 *
 * @param {string} str - any string; words separated by one or more spaces
 * @returns {string} words in reverse order, single-spaced, trimmed
 */
export function reverseWords(str) {
  return (
    str
      .split(" ")
      // Splitting "a  b" on one space yields ["a", "", "b"] — every extra
      // space becomes an empty string. Filtering them out is what
      // "collapse the spacing" actually means in code.
      .filter((word) => word !== "")
      .reverse()
      // join(" ") on [] returns "" — the empty/all-spaces case handles
      // itself, no special-casing needed.
      .join(" ")
  );
}
