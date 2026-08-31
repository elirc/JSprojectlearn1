import { test } from "node:test";
import assert from "node:assert/strict";
import { maxSubarraySum } from "./solution.js";

test("classic mixed array", () => {
  assert.equal(maxSubarraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6);
});

test("single positive element", () => {
  assert.equal(maxSubarraySum([5]), 5);
});

test("single negative element", () => {
  assert.equal(maxSubarraySum([-7]), -7);
});

test("all negative: pick the least negative", () => {
  assert.equal(maxSubarraySum([-3, -1, -2]), -1);
});

test("all positive: take the whole array", () => {
  assert.equal(maxSubarraySum([1, 2, 3, 4]), 10);
});

test("zeros and negatives", () => {
  assert.equal(maxSubarraySum([-1, 0, -2]), 0);
});

test("best stretch is at the start", () => {
  assert.equal(maxSubarraySum([4, 3, -10, 1, 2]), 7);
});

test("best stretch is at the end", () => {
  assert.equal(maxSubarraySum([1, -10, 3, 4]), 7);
});

test("worth crossing a small dip", () => {
  // 5 + (-1) + 5 = 9 beats either 5 alone
  assert.equal(maxSubarraySum([5, -1, 5]), 9);
});

test("not worth crossing a big dip", () => {
  // 5 + (-100) + 6 = -89, so best is 6 alone
  assert.equal(maxSubarraySum([5, -100, 6]), 6);
});

test("all zeros", () => {
  assert.equal(maxSubarraySum([0, 0, 0]), 0);
});

test("longer array with two candidate stretches", () => {
  // [8, -3, 7] sums to 12 and beats the lone [10] after the -20 crater
  assert.equal(maxSubarraySum([8, -3, 7, -20, 10]), 12);
});
