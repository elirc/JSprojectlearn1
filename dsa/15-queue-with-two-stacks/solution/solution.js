/**
 * Queue with Two Stacks — FIFO built from two LIFOs.
 *
 * The trick: popping one stack into another reverses the order, so the
 * *bottom* of the inbox (the oldest value) becomes the *top* of the
 * outbox (the cheap end). We only pay for that transfer when the
 * outbox runs dry, which makes every operation amortized O(1).
 *
 * Invariant: the outbox holds older values than the inbox, in
 * front-first order; the inbox holds newer values in arrival order.
 */
export class Queue {
  constructor() {
    /** @type {*[]} newest values, in arrival order (top = newest) */
    this.inbox = [];
    /** @type {*[]} older values, reversed (top = oldest = the front) */
    this.outbox = [];
  }

  /**
   * Add a value at the back of the queue. Always O(1).
   * @param {*} value
   * @returns {void}
   */
  enqueue(value) {
    this.inbox.push(value);
  }

  /**
   * Internal helper: if the outbox is empty, pour the whole inbox into
   * it, reversing the order on the way. Only ever called when the
   * outbox is empty, so no value can jump the queue.
   * @returns {void}
   */
  refill() {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
      }
    }
  }

  /**
   * Remove and return the value at the front of the queue.
   * @returns {*} the removed value, or undefined if the queue is empty
   */
  dequeue() {
    this.refill();
    return this.outbox.pop(); // undefined when both stacks are empty
  }

  /**
   * Return the front value without removing it.
   * @returns {*} the front value, or undefined if the queue is empty
   */
  peek() {
    this.refill();
    return this.outbox[this.outbox.length - 1]; // undefined when empty
  }

  /**
   * Is the queue empty? Only when BOTH stacks are.
   * @returns {boolean}
   */
  isEmpty() {
    return this.inbox.length === 0 && this.outbox.length === 0;
  }
}
