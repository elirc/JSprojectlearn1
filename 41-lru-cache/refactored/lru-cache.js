/**
 * LRU cache built on ONE structure: a Map.
 *
 * The trick: JavaScript Maps remember INSERTION ORDER, and deleting +
 * re-inserting a key moves it to the end. So:
 *
 *   - most recently used  = last in the Map
 *   - least recently used = FIRST in the Map = keys().next().value
 *   - "touch" an entry    = delete it, set it again
 *
 * One structure means there's nothing to keep in sync — the original's
 * cache/order disagreements are unrepresentable (project 40's lesson,
 * applied to a data structure). All operations are O(1).
 */
export class LruCache {
  #entries = new Map();
  #capacity;

  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`Capacity must be a positive integer, got ${capacity}`);
    }
    this.#capacity = capacity;
  }

  /** Read a value AND mark it recently used — that's what the U means. */
  get(key) {
    if (!this.#entries.has(key)) return undefined;
    const value = this.#entries.get(key);
    this.#entries.delete(key); // move to the end:
    this.#entries.set(key, value);
    return value;
  }

  set(key, value) {
    this.#entries.delete(key); // updating a key also refreshes it
    this.#entries.set(key, value);

    if (this.#entries.size > this.#capacity) {
      const leastRecent = this.#entries.keys().next().value;
      this.#entries.delete(leastRecent);
    }
  }

  /** Check without refreshing recency (peeking shouldn't change fate). */
  has(key) {
    return this.#entries.has(key);
  }

  get size() {
    return this.#entries.size;
  }

  /** Keys from least to most recently used — handy for tests/debugging. */
  keys() {
    return [...this.#entries.keys()];
  }
}
