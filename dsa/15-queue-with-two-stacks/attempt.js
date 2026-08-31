// Delete the TODO lines and implement. Run: node --test dsa/15-queue-with-two-stacks/attempt.test.js

/**
 * A first-in-first-out queue built out of stacks only.
 * Internal arrays may be used with push/pop (and reading the last
 * element) ONLY — no shift, no unshift, no splice.
 * dequeue() and peek() return undefined when the queue is empty.
 */
export class Queue {
  constructor() {
    // Set up your two stacks here.
  }

  /**
   * Add a value at the back of the queue.
   * @param {*} value
   * @returns {void}
   */
  enqueue(value) {
    throw new Error("TODO: implement me");
  }

  /**
   * Remove and return the value at the front of the queue.
   * @returns {*} the removed value, or undefined if the queue is empty
   */
  dequeue() {
    throw new Error("TODO: implement me");
  }

  /**
   * Return the front value without removing it.
   * @returns {*} the front value, or undefined if the queue is empty
   */
  peek() {
    throw new Error("TODO: implement me");
  }

  /**
   * Is the queue empty?
   * @returns {boolean}
   */
  isEmpty() {
    throw new Error("TODO: implement me");
  }
}
