import test from "node:test";
import assert from "node:assert/strict";
import { MinStack } from "./solution.js";

test("classic sequence: push -2, 0, -3", () => {
  const s = new MinStack();
  s.push(-2);
  s.push(0);
  s.push(-3);
  assert.equal(s.getMin(), -3);
  assert.equal(s.pop(), -3); // pop returns the removed value
  assert.equal(s.top(), 0);
  assert.equal(s.getMin(), -2); // old minimum comes back
});

test("duplicate minimums survive a single pop", () => {
  const s = new MinStack();
  s.push(3);
  s.push(1);
  s.push(1);
  assert.equal(s.getMin(), 1);
  s.pop();
  assert.equal(s.getMin(), 1); // the other copy of 1 is still in
  s.pop();
  assert.equal(s.getMin(), 3);
});

test("minimum falls and rises as values come and go", () => {
  const s = new MinStack();
  s.push(5);
  assert.equal(s.getMin(), 5);
  s.push(3);
  s.push(7);
  assert.equal(s.getMin(), 3); // 7 didn't change the min
  assert.equal(s.pop(), 7);
  s.pop(); // removes 3
  assert.equal(s.getMin(), 5);
});

test("empty stack returns undefined, then works again", () => {
  const s = new MinStack();
  assert.equal(s.top(), undefined);
  assert.equal(s.getMin(), undefined);
  assert.equal(s.pop(), undefined);
  s.push(42);
  assert.equal(s.getMin(), 42);
});
