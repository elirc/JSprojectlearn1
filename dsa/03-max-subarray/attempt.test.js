import { test } from "node:test";
import assert from "node:assert/strict";
import { maxSubarraySum } from "./attempt.js";

const todo = maxSubarraySum.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("classic mixed array", { skip }, () => {
  assert.equal(maxSubarraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6);
});

test("single positive element", { skip }, () => {
  assert.equal(maxSubarraySum([5]), 5);
});

test("single negative element", { skip }, () => {
  assert.equal(maxSubarraySum([-7]), -7);
});

test("all negative: pick the least negative", { skip }, () => {
  assert.equal(maxSubarraySum([-3, -1, -2]), -1);
});

test("all positive: take the whole array", { skip }, () => {
  assert.equal(maxSubarraySum([1, 2, 3, 4]), 10);
});

test("zeros and negatives", { skip }, () => {
  assert.equal(maxSubarraySum([-1, 0, -2]), 0);
});

test("best stretch is at the start", { skip }, () => {
  assert.equal(maxSubarraySum([4, 3, -10, 1, 2]), 7);
});

test("best stretch is at the end", { skip }, () => {
  assert.equal(maxSubarraySum([1, -10, 3, 4]), 7);
});

test("worth crossing a small dip", { skip }, () => {
  // 5 + (-1) + 5 = 9 beats either 5 alone
  assert.equal(maxSubarraySum([5, -1, 5]), 9);
});

test("not worth crossing a big dip", { skip }, () => {
  // 5 + (-100) + 6 = -89, so best is 6 alone
  assert.equal(maxSubarraySum([5, -100, 6]), 6);
});

test("all zeros", { skip }, () => {
  assert.equal(maxSubarraySum([0, 0, 0]), 0);
});

test("longer array with two candidate stretches", { skip }, () => {
  // [8, -3, 7] sums to 12 and beats the lone [10] after the -20 crater
  assert.equal(maxSubarraySum([8, -3, 7, -20, 10]), 12);
});
