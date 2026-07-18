/**
 * Count how many times each character appears in `text`.
 * Returns a Map of character -> count.
 *
 * Why a Map and not a plain object?
 * - A Map is a real dictionary: no inherited keys, no `__proto__` surprises.
 * - Keys keep insertion order and `.size` is free.
 *
 * Why `for...of` and not `text[i]`?
 * - `for...of` iterates *code points*, so "💩" is one character, not two
 *   broken surrogate halves.
 */
export function countCharacters(text, { ignoreCase = false } = {}) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }

  const counts = new Map();
  for (const char of text) {
    const key = ignoreCase ? char.toLowerCase() : char;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Most frequent character first — handy for display. */
export function sortedByCount(counts) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
