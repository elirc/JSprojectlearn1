/**
 * A binary heap: a priority queue that never sorts.
 *
 * The whole structure is ONE flat array pretending to be a tree. For the
 * item at index i:
 *
 *     parent = (i - 1) >> 1        left = 2i + 1        right = 2i + 2
 *
 *        0            [ 1, 4, 3, 9, 5, 8 ]
 *      /   \           0  1  2  3  4  5
 *     1     2
 *    / \   /
 *   3   4 5
 *
 * The only rule ("the heap property") is: every parent comes before its
 * two children according to the comparator. That is much weaker than
 * "sorted" — and weaker is the point. A sort re-derives the position of
 * every item; a heap fixes only the ONE path between an item and the
 * root, which is log2(n) steps deep. For 1,000,000 items that is 20.
 *
 *   push -> O(log n)      pop -> O(log n)      peek/size -> O(1)
 *
 * The comparator is injected, so this file knows nothing about tasks,
 * priorities, or urgency — it knows "which of these two comes first?"
 * and that is somebody else's decision.
 */
export class BinaryHeap {
  #items = [];
  #compare;

  /** @param compare (a, b) => negative if a comes out first, like Array#sort. */
  constructor(compare) {
    if (typeof compare !== 'function') {
      throw new TypeError(`BinaryHeap needs a comparator function, got ${typeof compare}`);
    }
    this.#compare = compare;
  }

  get size() {
    return this.#items.length;
  }

  /** The winner, without removing it. O(1) — it is always index 0. */
  peek() {
    return this.#items[0];
  }

  push(item) {
    this.#items.push(item); // land at the end...
    this.#siftUp(this.#items.length - 1); // ...then climb to your level
    return this.size;
  }

  /** Remove and return the winner, or undefined if empty. */
  pop() {
    if (this.#items.length === 0) return undefined;
    const top = this.#items[0];
    const last = this.#items.pop();
    if (this.#items.length > 0) {
      this.#items[0] = last; // promote the last leaf to the root...
      this.#siftDown(0); // ...then let it sink to its level
    }
    return top;
  }

  /** Snapshot of the raw array — for tests and for drawing the tree. */
  toArray() {
    return [...this.#items];
  }

  /** Swap with the parent while you outrank it. At most log2(n) swaps. */
  #siftUp(index) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.#compare(this.#items[index], this.#items[parent]) >= 0) break;
      this.#swap(index, parent);
      index = parent;
    }
  }

  /** Swap with the better of your two children while one outranks you. */
  #siftDown(index) {
    const count = this.#items.length;
    for (;;) {
      const left = 2 * index + 1;
      const right = left + 1;
      let best = index;

      if (left < count && this.#compare(this.#items[left], this.#items[best]) < 0) best = left;
      if (right < count && this.#compare(this.#items[right], this.#items[best]) < 0) best = right;
      if (best === index) return; // heap property restored

      this.#swap(index, best);
      index = best;
    }
  }

  #swap(i, j) {
    const temp = this.#items[i];
    this.#items[i] = this.#items[j];
    this.#items[j] = temp;
  }
}
