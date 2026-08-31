// Delete the TODO lines and implement. Run: node --test dsa/16-build-linked-list/attempt.test.js

/**
 * A singly linked list built from plain nodes: { value, next }.
 * `next` is null on the last node; `head` is null when the list is empty.
 * No arrays inside — only toArray/fromArray touch arrays.
 */
export class LinkedList {
  constructor() {
    /** @type {{ value: *, next: object|null }|null} */
    this.head = null;
    // A second pointer to the last node makes pushBack O(1) — see hint 3.
  }

  /**
   * Add a value at the end of the list.
   * @param {*} value
   * @returns {void}
   */
  pushBack(value) {
    throw new Error("TODO: implement me");
  }

  /**
   * Add a value at the front of the list.
   * @param {*} value
   * @returns {void}
   */
  pushFront(value) {
    throw new Error("TODO: implement me");
  }

  /**
   * Copy the values into a plain array, front to back.
   * @returns {*[]} [] for an empty list
   */
  toArray() {
    throw new Error("TODO: implement me");
  }

  /**
   * Remove the first node whose value === the given value.
   * @param {*} value
   * @returns {boolean} true if a node was removed, false if not found
   */
  removeFirstMatch(value) {
    throw new Error("TODO: implement me");
  }

  /**
   * Build a new list containing the array's values, in order.
   * @param {*[]} values
   * @returns {LinkedList}
   */
  static fromArray(values) {
    throw new Error("TODO: implement me");
  }
}
