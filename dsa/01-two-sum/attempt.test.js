import { test } from "node:test";
import assert from "node:assert/strict";
import { twoSum } from "./attempt.js";

const todo = twoSum.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("classic example: [2,7,11,15] target 9", { skip }, () => {
  assert.deepEqual(twoSum([2, 7, 11, 15], 9), [0, 1]);
});

test("answer is not the first two elements", { skip }, () => {
  assert.deepEqual(twoSum([3, 2, 4], 6), [1, 2]);
});

test("two equal values at different indices", { skip }, () => {
  assert.deepEqual(twoSum([3, 3], 6), [0, 1]);
});

test("negative numbers", { skip }, () => {
  assert.deepEqual(twoSum([-1, -2, -3, -4, -5], -8), [2, 4]);
});

test("mix of negative and positive summing to zero", { skip }, () => {
  assert.deepEqual(twoSum([-3, 4, 3, 90], 0), [0, 2]);
});

test("zero as one of the values", { skip }, () => {
  assert.deepEqual(twoSum([0, 4, 3, 0], 0), [0, 3]);
});

test("pair at the very ends of the array", { skip }, () => {
  assert.deepEqual(twoSum([1, 5, 9, 7, 2, 8, 4], 5), [0, 6]);
});

test("smallest possible array (length 2)", { skip }, () => {
  assert.deepEqual(twoSum([10, -10], 0), [0, 1]);
});

test("indices come back in ascending order", { skip }, () => {
  const [i, j] = twoSum([5, 75, 25], 100);
  assert.ok(i < j, "expected i < j");
  assert.deepEqual([i, j], [1, 2]);
});

test("does not reuse the same index twice", { skip }, () => {
  // target 8 with a single 4 present: [4,4] would need index 0 twice.
  const [i, j] = twoSum([4, 2, 6], 8);
  assert.notEqual(i, j);
  assert.deepEqual([i, j], [1, 2]);
});

test("large-ish array still answers correctly", { skip }, () => {
  const nums = Array.from({ length: 1000 }, (_, k) => k * 2); // evens 0..1998
  assert.deepEqual(twoSum(nums, 3994), [998, 999]); // 1996 + 1998 is the only pair
});
