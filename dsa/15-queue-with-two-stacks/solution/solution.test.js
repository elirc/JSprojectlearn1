import test from "node:test";
import assert from "node:assert/strict";
import { Queue } from "./solution.js";

test("first in, first out", () => {
  const q = new Queue();
  q.enqueue(1);
  q.enqueue(2);
  q.enqueue(3);
  assert.equal(q.dequeue(), 1); // the oldest leaves first
  assert.equal(q.dequeue(), 2);
  assert.equal(q.dequeue(), 3);
});

test("peek returns the front without removing it", () => {
  const q = new Queue();
  q.enqueue("a");
  q.enqueue("b");
  assert.equal(q.peek(), "a");
  assert.equal(q.dequeue(), "a"); // peek did not consume it
  assert.equal(q.peek(), "b");
});

test("enqueue and dequeue interleaved keep the order", () => {
  const q = new Queue();
  q.enqueue("a");
  q.enqueue("b");
  assert.equal(q.dequeue(), "a");
  q.enqueue("c"); // arrives while older values are still waiting
  assert.equal(q.dequeue(), "b"); // NOT "c"
  assert.equal(q.dequeue(), "c");
  assert.equal(q.isEmpty(), true);
});

test("empty queue returns undefined instead of throwing", () => {
  const q = new Queue();
  assert.equal(q.isEmpty(), true);
  assert.equal(q.dequeue(), undefined);
  assert.equal(q.peek(), undefined);
});

test("many values keep their order (amortized O(1))", () => {
  const q = new Queue();
  const out = [];
  for (let i = 0; i < 200; i++) q.enqueue(i);
  for (let i = 0; i < 100; i++) out.push(q.dequeue());
  for (let i = 200; i < 250; i++) q.enqueue(i);
  while (!q.isEmpty()) out.push(q.dequeue());
  assert.deepEqual(out, Array.from({ length: 250 }, (_, i) => i));
});
