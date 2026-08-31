import { test } from "node:test";
import assert from "node:assert/strict";
import { quickSelect } from "./solution.js";

test("k = 1 returns the minimum", () => {
  assert.equal(quickSelect([7, 2, 9, 4], 1), 2);
});

test("k = n returns the maximum", () => {
  assert.equal(quickSelect([7, 2, 9, 4], 4), 9);
});

test("a middle k", () => {
  assert.equal(quickSelect([7, 2, 9, 4], 3), 7);
});

test("single element", () => {
  assert.equal(quickSelect([42], 1), 42);
});

test("duplicates are counted positionally", () => {
  assert.equal(quickSelect([3, 3, 1], 2), 3);
  assert.equal(quickSelect([3, 3, 1], 3), 3);
});

test("negatives, zero, and positives mixed", () => {
  const nums = [0, -2, 5, -8, 3, 0];
  assert.equal(quickSelect(nums, 2), -2);
  assert.equal(quickSelect(nums, 4), 0);
});

test("already sorted input", () => {
  assert.equal(quickSelect([1, 2, 3, 4, 5], 3), 3);
});

test("reverse sorted input", () => {
  assert.equal(quickSelect([5, 4, 3, 2, 1], 2), 2);
});

test("every element identical", () => {
  assert.equal(quickSelect([6, 6, 6, 6], 3), 6);
});

test("does not mutate the input array", () => {
  const input = [4, 2, 7, 1];
  quickSelect(input, 2);
  assert.deepEqual(input, [4, 2, 7, 1]);
});

test("matches a reference sort for EVERY k", () => {
  // deterministic values with duplicates (no Math.random — reproducible runs)
  const nums = Array.from({ length: 31 }, (_, i) => ((i * 17) % 23) - 11);
  const sorted = [...nums].sort((a, b) => a - b);
  for (let k = 1; k <= nums.length; k++) {
    assert.equal(quickSelect(nums, k), sorted[k - 1], `wrong value for k = ${k}`);
  }
});

test("large deterministic array", () => {
  const nums = Array.from({ length: 500 }, (_, i) => ((i * 7919) % 997) - 498);
  assert.equal(quickSelect(nums, 1), -498);
  assert.equal(quickSelect(nums, 250), 10);
  assert.equal(quickSelect(nums, 500), 498);
});
