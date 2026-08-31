/**
 * Min Stack — a stack that knows its minimum in O(1).
 *
 * The trick: a second stack, `mins`, kept exactly in step with
 * `values`. mins[i] = "the minimum of values[0..i]". Pushing computes
 * the new running minimum in O(1); popping both stacks together makes
 * the previous minimum reappear with zero recomputation.
 *
 * All four operations: O(1) time. Space: O(n) extra for `mins`.
 */
export class MinStack {
  constructor() {
    /** @type {number[]} the actual stack contents */
    this.values = [];
    /** @type {number[]} mins[i] = min of values[0..i] */
    this.mins = [];
  }

  /**
   * Add a value on top of the stack.
   * @param {number} value
   * @returns {void}
   */
  push(value) {
    this.values.push(value);
    const currentMin = this.mins.length === 0
      ? value
      : Math.min(value, this.mins[this.mins.length - 1]);
    this.mins.push(currentMin);
  }

  /**
   * Remove and return the top value.
   * @returns {number|undefined} the removed value, or undefined if empty
   */
  pop() {
    this.mins.pop(); // keep the two stacks in step
    return this.values.pop();
  }

  /**
   * Return the top value without removing it.
   * @returns {number|undefined}
   */
  top() {
    return this.values.length === 0
      ? undefined
      : this.values[this.values.length - 1];
  }

  /**
   * Return the smallest value currently in the stack, in O(1).
   * @returns {number|undefined}
   */
  getMin() {
    return this.mins.length === 0
      ? undefined
      : this.mins[this.mins.length - 1];
  }
}
