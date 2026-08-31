import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSort } from "./attempt.js";

const todo = mergeSort.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("sorts a small unsorted array", { skip }, () => {
  assert.deepEqual(mergeSort([5, 2, 8, 1]), [1, 2, 5, 8]);
});

test("odd length array", { skip }, () => {
  assert.deepEqual(mergeSort([3, 1, 2]), [1, 2, 3]);
});

test("empty array", { skip }, () => {
  assert.deepEqual(mergeSort([]), []);
});

test("single element", { skip }, () => {
  assert.deepEqual(mergeSort([7]), [7]);
});

test("two elements out of order", { skip }, () => {
  assert.deepEqual(mergeSort([9, -4]), [-4, 9]);
});

test("already sorted stays sorted", { skip }, () => {
  assert.deepEqual(mergeSort([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
});

test("reverse sorted", { skip }, () => {
  assert.deepEqual(mergeSort([5, 4, 3, 2, 1]), [1, 2, 3, 4, 5]);
});

test("duplicates all survive", { skip }, () => {
  assert.deepEqual(mergeSort([3, 1, 3, 1, 3]), [1, 1, 3, 3, 3]);
});

test("negatives, zero, and positives mixed", { skip }, () => {
  assert.deepEqual(mergeSort([0, -2, 5, -8, 3, 0]), [-8, -2, 0, 0, 3, 5]);
});

test("does not mutate the input array", { skip }, () => {
  const input = [4, 2, 7, 1];
  mergeSort(input);
  assert.deepEqual(input, [4, 2, 7, 1]);
});

test("returns a NEW array, even if input was already sorted", { skip }, () => {
  const input = [1, 2, 3];
  const out = mergeSort(input);
  assert.notEqual(out, input);
  assert.deepEqual(out, [1, 2, 3]);
});

test("large pseudo-random array matches a reference sort", { skip }, () => {
  // deterministic pseudo-random values (no Math.random — reproducible runs)
  const nums = Array.from({ length: 500 }, (_, i) => ((i * 7919) % 997) - 498);
  const expected = [...nums].sort((a, b) => a - b);
  assert.deepEqual(mergeSort(nums), expected);
});
