import test from "node:test";
import assert from "node:assert/strict";
import { binarySearch } from "./solution.js";

test("finds a value in the middle", () => {
  assert.equal(binarySearch([1, 3, 5, 7, 9], 5), 2);
});

test("finds the first and last elements", () => {
  assert.equal(binarySearch([1, 3, 5, 7, 9], 1), 0);
  assert.equal(binarySearch([1, 3, 5, 7, 9], 9), 4);
});

test("returns -1 when the value is absent", () => {
  assert.equal(binarySearch([1, 3, 5, 7, 9], 4), -1); // between two values
  assert.equal(binarySearch([1, 3, 5, 7, 9], 0), -1); // below everything
  assert.equal(binarySearch([1, 3, 5, 7, 9], 10), -1); // above everything
});

test("empty array", () => {
  assert.equal(binarySearch([], 1), -1);
});

test("single element", () => {
  assert.equal(binarySearch([7], 7), 0);
  assert.equal(binarySearch([7], 3), -1);
});

test("even-length array (no exact middle)", () => {
  assert.equal(binarySearch([1, 2, 3, 4], 2), 1);
  assert.equal(binarySearch([1, 2, 3, 4], 4), 3);
});

test("negative numbers and a large array", () => {
  assert.equal(binarySearch([-9, -4, -1, 0, 6], -4), 1);
  const big = Array.from({ length: 1000 }, (_, i) => i * 2); // 0, 2, 4, ...
  assert.equal(binarySearch(big, 1574), 787);
  assert.equal(binarySearch(big, 1575), -1); // odd numbers aren't in there
});
