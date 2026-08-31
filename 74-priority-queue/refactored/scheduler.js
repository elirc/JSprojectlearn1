import { BinaryHeap } from './heap.js';

/**
 * The ordering rule, written down EXACTLY ONCE.
 *
 * Lower priority number = more urgent. Ties break by arrival order, so a
 * task can never be starved by a newer task of equal priority — that is
 * the FIFO guarantee the original had in one comparator and broke in the
 * other. `seq` exists purely to make this rule expressible.
 */
export function byUrgency(a, b) {
  return a.priority - b.priority || a.seq - b.seq;
}

/**
 * The scheduler decides; it never prints. Every method returns a value,
 * so the same object drives a CLI, a test, or a web dashboard.
 */
export class TaskScheduler {
  #queue = new BinaryHeap(byUrgency);
  #added = 0;

  add(name, priority) {
    if (typeof name !== 'string' || name === '') {
      throw new TypeError(`Task name must be a non-empty string, got ${JSON.stringify(name)}`);
    }
    if (!Number.isFinite(priority)) {
      throw new TypeError(`Priority must be a finite number, got ${priority}`);
    }
    const task = { name, priority, seq: this.#added++ };
    this.#queue.push(task);
    return task;
  }

  get size() {
    return this.#queue.size;
  }

  /** What WOULD run next — same comparator, so it cannot disagree with next(). */
  peek() {
    return this.#queue.peek();
  }

  /** Remove and return the most urgent task, or undefined when empty. */
  next() {
    return this.#queue.pop();
  }

  /** Run order for everything currently queued. Returns tasks, prints nothing. */
  drain() {
    const order = [];
    let task;
    while ((task = this.next()) !== undefined) order.push(task);
    return order;
  }
}
