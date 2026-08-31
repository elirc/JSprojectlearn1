/**
 * A trie (say "try", from re-TRIE-val): a tree where the PATH spells the word.
 *
 * Inserting "car", "cat" and "do" builds this — note that "car" and "cat"
 * share the "c -> a" path instead of storing "ca" twice:
 *
 *   root
 *    ├─ c ─ a ─┬─ r*   ("car")
 *    │         └─ t*   ("cat")
 *    └─ d ─ o*         ("do")
 *
 * Each node is a plain object with a `children` map from ONE character to
 * the next node, plus a `word`/`weight` on nodes where a word ends (*).
 *
 * The payoff: finding every word starting with "ca" is not a search at all.
 * You walk 2 links to reach the "ca" node — 2 steps whether the dictionary
 * holds 20 words or 20 million — and everything beneath that node is, by
 * construction, exactly the set of matches. The original re-tested 50,000
 * words per keystroke; a trie never looks at a word it already ruled out.
 */

/**
 * The ranking rule, written down ONCE: heavier weight first, then
 * alphabetical so that ties are stable instead of accidental.
 */
export function byPopularity(a, b) {
  return b.weight - a.weight || a.word.localeCompare(b.word);
}

const makeNode = () => ({
  // Object.create(null) has no inherited keys, so a character can never
  // collide with something like "constructor" that a plain {} inherits.
  children: Object.create(null),
  word: null, // the original spelling, set only where a word ends
  weight: 0,
});

export class Trie {
  #root = makeNode();
  #size = 0;

  /** Words are matched case-insensitively; the original spelling is kept. */
  #key(text) {
    if (typeof text !== 'string') {
      throw new TypeError(`Expected a string, got ${typeof text}`);
    }
    return text.toLowerCase();
  }

  /** How many distinct words are stored. */
  get size() {
    return this.#size;
  }

  /**
   * Add a word. Inserting the same word again updates its weight and
   * spelling rather than duplicating it.
   */
  insert(word, weight = 1) {
    const key = this.#key(word);
    if (key === '') throw new RangeError('Cannot insert an empty word');
    if (!Number.isFinite(weight)) {
      throw new TypeError(`Weight must be a finite number, got ${weight}`);
    }

    let node = this.#root;
    for (const character of key) {
      node.children[character] ??= makeNode(); // reuse the shared path
      node = node.children[character];
    }
    if (node.word === null) this.#size++; // brand new word
    node.word = word;
    node.weight = weight;
    return this;
  }

  /** Is this exact word stored? (A prefix of a stored word is NOT a word.) */
  has(word) {
    const node = this.#find(this.#key(word));
    return node !== null && node.word !== null;
  }

  /**
   * Every stored word starting with `prefix`, best first, capped at `limit`.
   * An empty prefix means "no filter" — the whole dictionary, ranked.
   */
  suggest(prefix, limit = 10) {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError(`Limit must be a non-negative integer, got ${limit}`);
    }
    if (limit === 0) return [];

    const node = this.#find(this.#key(prefix));
    if (node === null) return []; // no such path: nothing starts with it

    const matches = [];
    this.#collect(node, matches);
    return matches.sort(byPopularity).slice(0, limit).map((entry) => entry.word);
  }

  /** Walk the path spelled by `key`. Returns the node, or null if it ends early. */
  #find(key) {
    let node = this.#root;
    for (const character of key) {
      node = node.children[character];
      if (node === undefined) return null;
    }
    return node;
  }

  /** Depth-first walk of everything at or below `node`, pushing whole words. */
  #collect(node, into) {
    if (node.word !== null) into.push({ word: node.word, weight: node.weight });
    for (const character of Object.keys(node.children)) {
      this.#collect(node.children[character], into);
    }
  }
}

/** Convenience: build a trie from `{ word: weight }` in one call. */
export function buildTrie(entries) {
  const trie = new Trie();
  for (const [word, weight] of Object.entries(entries)) trie.insert(word, weight);
  return trie;
}
