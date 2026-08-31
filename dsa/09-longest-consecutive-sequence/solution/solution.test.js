import { test } from "node:test";
import assert from "node:assert/strict";
import { longestConsecutive } from "./solution.js";

test("classic example", () => {
  assert.equal(longestConsecutive([100, 4, 200, 1, 3, 2]), 4);
});

test("empty array", () => {
  assert.equal(longestConsecutive([]), 0);
});

test("single element", () => {
  assert.equal(longestConsecutive([7]), 1);
});

test("duplicates count once", () => {
  assert.equal(longestConsecutive([1, 1, 1]), 1);
  assert.equal(longestConsecutive([1, 2, 0, 1]), 3);
});

test("no two values adjacent", () => {
  assert.equal(longestConsecutive([1, 3, 5]), 1);
});

test("negatives and zero", () => {
  assert.equal(longestConsecutive([-3, -2, -1, 0]), 4);
});

test("run crossing zero", () => {
  assert.equal(longestConsecutive([2, -1, 0, 1, -2]), 5);
});

test("two separate runs — the longer one wins", () => {
  assert.equal(longestConsecutive([1, 2, 3, 10, 11]), 3);
  assert.equal(longestConsecutive([10, 11, 1, 2, 3]), 3);
});

test("already sorted input", () => {
  assert.equal(longestConsecutive([1, 2, 3, 4, 5]), 5);
});

test("reverse sorted input", () => {
  assert.equal(longestConsecutive([5, 4, 3, 2, 1]), 5);
});

test("the longest run appears last in the array", () => {
  assert.equal(longestConsecutive([9, 1, 4, 7, 3, 2, 6, 5]), 7);
});

test("does not mutate or reorder the input", () => {
  const nums = [100, 4, 200, 1, 3, 2];
  longestConsecutive(nums);
  assert.deepEqual(nums, [100, 4, 200, 1, 3, 2]);
});

test("large shuffled run of 1000", () => {
  const nums = Array.from({ length: 1000 }, (_, k) => k);
  // deterministic shuffle so the test is reproducible
  for (let i = nums.length - 1; i > 0; i--) {
    const j = (i * 7919) % (i + 1);
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  assert.equal(longestConsecutive(nums), 1000);
});

test("many duplicates around a short run", () => {
  const nums = [5, 5, 5, 5, 6, 5, 5, 7, 5];
  assert.equal(longestConsecutive(nums), 3);
});
