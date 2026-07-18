/**
 * Small, general array utilities. Two house rules, applied to all:
 *   1. NEVER mutate the input — return a new array/Map.
 *   2. Take a `keyOf` function instead of hardcoding a property, so
 *      one groupBy serves teams today and log levels tomorrow.
 */

/** De-duplicate. A Set does the O(n) bookkeeping the manual scan did in O(n²). */
export function unique(items) {
  return [...new Set(items)];
}

/**
 * Sort by a derived key, WITHOUT mutating the input.
 * Handles the classic trap: sort() with no comparator sorts numbers
 * alphabetically. Comparing keys explicitly makes numbers numeric.
 */
export function sortBy(items, keyOf, { descending = false } = {}) {
  const order = descending ? -1 : 1;
  return [...items].sort((a, b) => {
    const keyA = keyOf(a);
    const keyB = keyOf(b);
    if (keyA < keyB) return -order;
    if (keyA > keyB) return order;
    return 0;
  });
}

/** Group items into a Map of key -> items. (Map: project 02's lesson.) */
export function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

/** Count items per key — groupBy's little sibling. */
export function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Split into pages: chunk([1,2,3,4,5], 2) -> [[1,2],[3,4],[5]] */
export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`chunk size must be a positive integer, got ${size}`);
  }
  const chunks = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}
