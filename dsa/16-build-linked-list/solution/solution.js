/**
 * Singly linked list — nodes and pointers, no arrays inside.
 *
 * A node is a plain object { value, next }, with next === null on the
 * last node. The list keeps two pointers:
 *   head — the first node (null when empty)
 *   tail — the last node  (null when empty), so pushBack is O(1)
 *
 * The tail pointer is a promise: every method that can change the last
 * node has to keep it true. There are exactly three such places, all
 * marked below.
 */
export class LinkedList {
  constructor() {
    /** @type {{ value: *, next: object|null }|null} */
    this.head = null;
    /** @type {{ value: *, next: object|null }|null} */
    this.tail = null;
  }

  /**
   * Add a value at the end of the list. O(1) thanks to `tail`.
   * @param {*} value
   * @returns {void}
   */
  pushBack(value) {
    const node = { value, next: null };
    if (this.head === null) {
      this.head = node; // empty list: the new node is both ends
      this.tail = node; // (tail promise #1)
    } else {
      this.tail.next = node; // link the old last node to it...
      this.tail = node; // ...and it becomes the last (tail promise #2)
    }
  }

  /**
   * Add a value at the front of the list. O(1).
   * @param {*} value
   * @returns {void}
   */
  pushFront(value) {
    // Works even on an empty list: next becomes null, which is correct.
    this.head = { value, next: this.head };
    if (this.tail === null) this.tail = this.head; // was empty (tail promise #1)
  }

  /**
   * Copy the values into a plain array, front to back. O(n).
   * @returns {*[]} [] for an empty list
   */
  toArray() {
    const values = [];
    // The walking loop — every method here is a variation of it.
    for (let node = this.head; node !== null; node = node.next) {
      values.push(node.value);
    }
    return values;
  }

  /**
   * Remove the first node whose value === the given value. O(n).
   * @param {*} value
   * @returns {boolean} true if a node was removed, false if not found
   */
  removeFirstMatch(value) {
    if (this.head === null) return false;

    // Case 1: the head matches — no previous node to re-link.
    if (this.head.value === value) {
      this.head = this.head.next;
      if (this.head === null) this.tail = null; // list is now empty (tail promise #3)
      return true;
    }

    // Case 2: walk with a `prev` pointer, because to unlink a node you
    // need the node BEFORE it — a singly linked node can't reach back.
    let prev = this.head;
    while (prev.next !== null) {
      if (prev.next.value === value) {
        if (prev.next === this.tail) this.tail = prev; // removed the last node (tail promise #3)
        prev.next = prev.next.next; // splice it out
        return true;
      }
      prev = prev.next;
    }
    return false; // walked off the end without a match
  }

  /**
   * Build a new list containing the array's values, in order. O(n).
   * @param {*[]} values
   * @returns {LinkedList}
   */
  static fromArray(values) {
    const list = new LinkedList();
    for (const value of values) list.pushBack(value); // O(1) each
    return list;
  }
}
