/**
 * The k most frequent values in an array, using a hand-built min-heap.
 *
 * 1. Count every value into a Map (dsa/07's move: one pass, O(1) lookups).
 * 2. Walk the counted entries, pushing each { value, count } into a min-heap
 *    ordered by count.
 * 3. Whenever the heap grows past k, pop — which removes the SMALLEST count
 *    in it. So after every step the heap holds exactly the k biggest counts
 *    seen so far, and the k biggest overall once the walk finishes.
 * 4. Drain the heap and hand back the values.
 *
 * Why a MIN-heap when we want the LARGEST counts? Because the item you need
 * constant cheap access to is the current *worst survivor* — the one about to
 * be evicted. A min-heap parks exactly that item at index 0.
 *
 * Time  O(n + m log k), written O(n log k): n for the counting pass, then
 *       m distinct values each doing O(log k) heap work on a heap capped at
 *       k + 1 items.
 * Space O(m) for the Map plus O(k) for the heap, so O(n) in the worst case
 *       (every value distinct).
 *
 * @param {Array<number|string>} nums - the values to count (not modified)
 * @param {number} k - how many of the most frequent values to return
 * @returns {Array<number|string>} the k most frequent values, in any order
 */
export function topKFrequent(nums, k) {
  if (k <= 0) return [];

  // Step 1: value -> how many times it appeared.
  const counts = new Map();
  for (const value of nums) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  // Steps 2 and 3: keep a heap of at most k entries, always evicting the
  // rarest one in it. The heap never grows beyond k + 1, which is what caps
  // the per-item cost at O(log k) instead of O(log m).
  const heap = new MinHeap();
  for (const [value, count] of counts) {
    heap.push({ value, count });
    if (heap.size() > k) heap.pop(); // drop the least frequent survivor
  }

  // Step 4: whatever is left IS the answer. Order is unspecified, so we just
  // empty the heap out (which happens to give ascending count order).
  const out = [];
  while (heap.size() > 0) out.push(heap.pop().value);
  return out;
}

/**
 * A binary min-heap of { value, count } items, ordered by `count`.
 *
 * The tree is stored in a flat array with no pointers at all. For the item
 * at index i:
 *
 *   parent(i) = (i - 1) >> 1        left(i) = 2 * i + 1
 *                                   right(i) = 2 * i + 2
 *
 * The heap property: every parent's count is <= both of its children's. That
 * is weaker than sorted — siblings are in no particular order — but it is
 * exactly strong enough to guarantee that index 0 is the minimum.
 */
class MinHeap {
  constructor() {
    this.items = [];
  }

  /** @returns {number} how many items are in the heap */
  size() {
    return this.items.length;
  }

  /** @returns {object|undefined} the smallest-count item, without removing it */
  peek() {
    return this.items[0];
  }

  /**
   * Add an item. O(log n).
   *
   * @param {{value: number|string, count: number}} item
   */
  push(item) {
    // Append at the end — the only spot that keeps the tree "complete"
    // (every level full except possibly the last, filled left to right).
    this.items.push(item);
    // The new item may be smaller than its parent, so walk it upward.
    this._bubbleUp(this.items.length - 1);
  }

  /**
   * Remove and return the smallest-count item. O(log n).
   *
   * @returns {object|undefined}
   */
  pop() {
    if (this.items.length === 0) return undefined;

    const smallest = this.items[0];
    const last = this.items.pop();

    // If `last` was the only item we already removed it; otherwise promote it
    // to the root. Promoting the LAST item (rather than a child) is the only
    // move that keeps the tree complete — it is the one slot we can vacate
    // without leaving a hole in the middle.
    if (this.items.length > 0) {
      this.items[0] = last;
      this._sinkDown(0);
    }

    return smallest;
  }

  /**
   * Walk the item at index `i` up until its parent is no bigger than it.
   * At most one swap per level, and a complete tree has ~log2(n) levels.
   *
   * @param {number} i
   */
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      // `<=` means we stop as soon as the heap property holds — no wasted
      // swaps between equal counts.
      if (this.items[parent].count <= this.items[i].count) break;
      this._swap(parent, i);
      i = parent;
    }
  }

  /**
   * Walk the item at index `i` down until both children are no smaller.
   * Also at most one swap per level, so O(log n).
   *
   * @param {number} i
   */
  _sinkDown(i) {
    const n = this.items.length;

    for (;;) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;

      // Compare against BOTH children and swap with the smaller one. Swapping
      // with the larger child would just re-break the property one level down.
      if (left < n && this.items[left].count < this.items[smallest].count) {
        smallest = left;
      }
      if (right < n && this.items[right].count < this.items[smallest].count) {
        smallest = right;
      }

      if (smallest === i) return; // already in the right place
      this._swap(smallest, i);
      i = smallest;
    }
  }

  /**
   * @param {number} a
   * @param {number} b
   */
  _swap(a, b) {
    const temporary = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = temporary;
  }
}
