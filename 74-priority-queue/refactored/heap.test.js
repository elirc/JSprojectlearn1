import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BinaryHeap } from './heap.js';
import { TaskScheduler, byUrgency } from './scheduler.js';

const numbers = (a, b) => a - b;

test('pops numbers smallest-first regardless of push order', () => {
  const heap = new BinaryHeap(numbers);
  for (const n of [5, 3, 8, 1, 9, 2]) heap.push(n);
  assert.equal(heap.size, 6);
  const popped = [];
  while (heap.size > 0) popped.push(heap.pop());
  assert.deepEqual(popped, [1, 2, 3, 5, 8, 9]);
  assert.equal(heap.size, 0);
});

test('peek() shows the winner without removing it', () => {
  const heap = new BinaryHeap(numbers);
  heap.push(4);
  heap.push(2);
  assert.equal(heap.peek(), 2);
  assert.equal(heap.size, 2); // peeking is not popping
  assert.equal(heap.pop(), 2);
  assert.equal(heap.peek(), 4);
});

test('an empty heap answers undefined instead of throwing', () => {
  const heap = new BinaryHeap(numbers);
  assert.equal(heap.size, 0);
  assert.equal(heap.peek(), undefined);
  assert.equal(heap.pop(), undefined);
});

test('one item in, one item out', () => {
  const heap = new BinaryHeap(numbers);
  heap.push(42);
  assert.equal(heap.pop(), 42);
  assert.equal(heap.pop(), undefined);
});

test('duplicates all come back out', () => {
  const heap = new BinaryHeap(numbers);
  for (const n of [7, 7, 3, 7, 3]) heap.push(n);
  const popped = [];
  while (heap.size > 0) popped.push(heap.pop());
  assert.deepEqual(popped, [3, 3, 7, 7, 7]);
});

test('flipping the comparator turns it into a max-heap — no new code', () => {
  const heap = new BinaryHeap((a, b) => b - a);
  for (const n of [5, 3, 8, 1]) heap.push(n);
  assert.equal(heap.pop(), 8);
  assert.equal(heap.pop(), 5);
});

test('the heap property holds after every push (parents beat their children)', () => {
  const heap = new BinaryHeap(numbers);
  for (const n of [9, 4, 7, 1, 8, 2, 6, 3, 5]) {
    heap.push(n);
    const items = heap.toArray();
    for (let i = 1; i < items.length; i++) {
      const parent = (i - 1) >> 1;
      assert.ok(items[parent] <= items[i], `heap broken at index ${i}`);
    }
  }
});

test('interleaved pushes and pops stay ordered', () => {
  const heap = new BinaryHeap(numbers);
  heap.push(5);
  heap.push(1);
  assert.equal(heap.pop(), 1);
  heap.push(3);
  heap.push(0);
  assert.equal(heap.pop(), 0);
  assert.equal(heap.pop(), 3);
  assert.equal(heap.pop(), 5);
  assert.equal(heap.size, 0);
});

test('a comparator is required', () => {
  assert.throws(() => new BinaryHeap(), TypeError);
  assert.throws(() => new BinaryHeap('smallest first'), TypeError);
});

test('STRESS: 10,000 random items come out in sorted order', () => {
  const heap = new BinaryHeap(numbers);
  const pushed = [];
  for (let i = 0; i < 10_000; i++) {
    const value = Math.floor(Math.random() * 100_000);
    pushed.push(value);
    heap.push(value);
  }
  assert.equal(heap.size, 10_000);

  const popped = [];
  let previous = -Infinity;
  while (heap.size > 0) {
    const value = heap.pop();
    assert.ok(value >= previous, `out of order: ${value} came after ${previous}`);
    previous = value;
    popped.push(value);
  }
  assert.equal(popped.length, 10_000);
  assert.deepEqual(popped, [...pushed].sort(numbers)); // same multiset, sorted
});

test('scheduler runs the most urgent task first', () => {
  const scheduler = new TaskScheduler();
  scheduler.add('email-receipt', 5);
  scheduler.add('charge-card', 1);
  scheduler.add('rebuild-index', 9);
  assert.equal(scheduler.size, 3);
  assert.equal(scheduler.next().name, 'charge-card');
  assert.equal(scheduler.next().name, 'email-receipt');
  assert.equal(scheduler.next().name, 'rebuild-index');
  assert.equal(scheduler.next(), undefined);
});

test('equal priorities keep arrival order (FIFO) — nothing gets starved', () => {
  const scheduler = new TaskScheduler();
  scheduler.add('charge-card', 1);
  scheduler.add('send-otp', 1);
  scheduler.add('refund', 1);
  assert.deepEqual(
    scheduler.drain().map((task) => task.name),
    ['charge-card', 'send-otp', 'refund'],
  );
});

test('peek() cannot disagree with next() — the original bug', () => {
  const scheduler = new TaskScheduler();
  scheduler.add('email-receipt', 5);
  scheduler.add('charge-card', 1);
  scheduler.add('send-otp', 1); // the tie the original got backwards
  assert.equal(scheduler.peek().name, 'charge-card');
  assert.equal(scheduler.next().name, 'charge-card');
});

test('drain() empties the queue and returns the whole run order', () => {
  const scheduler = new TaskScheduler();
  scheduler.add('b', 2);
  scheduler.add('a', 1);
  const order = scheduler.drain();
  assert.deepEqual(order.map((task) => task.name), ['a', 'b']);
  assert.equal(scheduler.size, 0);
  assert.deepEqual(scheduler.drain(), []);
});

test('negative and fractional priorities work; junk is rejected', () => {
  const scheduler = new TaskScheduler();
  scheduler.add('urgent', -3);
  scheduler.add('soon', 0.5);
  assert.equal(scheduler.peek().name, 'urgent');
  assert.throws(() => scheduler.add('bad', 'high'), TypeError);
  assert.throws(() => scheduler.add('bad', NaN), TypeError);
  assert.throws(() => scheduler.add('', 1), TypeError);
});

test('byUrgency is exported so the rule can be read and reused', () => {
  assert.ok(byUrgency({ priority: 1, seq: 9 }, { priority: 2, seq: 0 }) < 0);
  assert.ok(byUrgency({ priority: 2, seq: 0 }, { priority: 2, seq: 1 }) < 0);
  assert.equal(byUrgency({ priority: 2, seq: 3 }, { priority: 2, seq: 3 }), 0);
});
