import test from "node:test";
import assert from "node:assert/strict";
import { searchRotated } from "./solution.js";

test("the classic example", () => {
  assert.equal(searchRotated([4, 5, 6, 7, 0, 1, 2], 0), 4);
  assert.equal(searchRotated([4, 5, 6, 7, 0, 1, 2], 3), -1);
});

test("target in the left (larger) half", () => {
  assert.equal(searchRotated([4, 5, 6, 7, 0, 1, 2], 6), 2);
  assert.equal(searchRotated([4, 5, 6, 7, 0, 1, 2], 4), 0);
});

test("target in the right (smaller) half", () => {
  assert.equal(searchRotated([4, 5, 6, 7, 0, 1, 2], 1), 5);
  assert.equal(searchRotated([4, 5, 6, 7, 0, 1, 2], 2), 6);
});

test("an unrotated array still works", () => {
  assert.equal(searchRotated([1, 2, 3, 4, 5], 4), 3);
  assert.equal(searchRotated([1, 2, 3, 4, 5], 6), -1);
});

test("rotated by one, either way", () => {
  assert.equal(searchRotated([5, 1, 2, 3, 4], 5), 0);
  assert.equal(searchRotated([2, 3, 4, 5, 1], 1), 4);
});

test("empty and single-element arrays", () => {
  assert.equal(searchRotated([], 5), -1);
  assert.equal(searchRotated([1], 1), 0);
  assert.equal(searchRotated([1], 0), -1);
});

test("two elements", () => {
  assert.equal(searchRotated([3, 1], 1), 1);
});
