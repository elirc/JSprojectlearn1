import { test } from "node:test";
import assert from "node:assert/strict";
import { canFinish } from "./attempt.js";

// A long straight dependency chain: 0 → 1 → 2 → ... → n-1. No cycle.
function chainPairs(n) {
  return Array.from({ length: n - 1 }, (_, i) => [i + 1, i]);
}

const todo = canFinish.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("one prerequisite is fine", { skip }, () => {
  assert.equal(canFinish(2, [[1, 0]]), true);
});

test("two courses requiring each other is impossible", { skip }, () => {
  assert.equal(canFinish(2, [[1, 0], [0, 1]]), false);
});

test("no courses at all", { skip }, () => {
  assert.equal(canFinish(0, []), true);
});

test("courses with no prerequisites", { skip }, () => {
  assert.equal(canFinish(1, []), true);
  assert.equal(canFinish(5, []), true);
});

test("a course that is its own prerequisite", { skip }, () => {
  assert.equal(canFinish(1, [[0, 0]]), false);
  assert.equal(canFinish(3, [[1, 0], [2, 2]]), false);
});

test("a straight chain of five courses", { skip }, () => {
  assert.equal(canFinish(5, [[1, 0], [2, 1], [3, 2], [4, 3]]), true);
});

test("a diamond: two independent paths that rejoin", { skip }, () => {
  assert.equal(canFinish(4, [[1, 0], [2, 0], [3, 1], [3, 2]]), true);
});

test("a cycle buried inside a larger graph", { skip }, () => {
  // 0 → 1 → 2 → 3 → 1 is a cycle; 0 → 4 → 5 is perfectly fine.
  assert.equal(
    canFinish(6, [[1, 0], [2, 1], [3, 2], [1, 3], [4, 0], [5, 4]]),
    false
  );
});

test("duplicate pairs are harmless", { skip }, () => {
  assert.equal(canFinish(3, [[1, 0], [1, 0], [2, 1], [2, 1]]), true);
});

test("two disconnected groups, only one of them cyclic", { skip }, () => {
  // 0 → 1 → 2 is fine; 3 → 4 → 5 → 3 is a cycle. One bad group is enough.
  assert.equal(canFinish(6, [[1, 0], [2, 1], [4, 3], [5, 4], [3, 5]]), false);
});

test("a 500-course chain", { skip }, () => {
  assert.equal(canFinish(500, chainPairs(500)), true);
});

test("the same 500-course chain with one edge closing the loop", { skip }, () => {
  assert.equal(canFinish(500, [...chainPairs(500), [0, 499]]), false);
});

test("the prerequisite list is not modified", { skip }, () => {
  const pairs = [[1, 0], [2, 1], [3, 1]];
  const snapshot = structuredClone(pairs);
  canFinish(4, pairs);
  assert.deepEqual(pairs, snapshot);
});
