import test from "node:test";
import assert from "node:assert/strict";
import { mean, median } from "./stats.mjs";

test("mean averages values", () => {
  assert.equal(mean([2, 4, 6]), 4);
});

test("median of odd-length unsorted input", () => {
  assert.equal(median([9, 1, 5]), 5);
});

test("median of even-length input averages the middle pair", () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("median does not mutate its input", () => {
  const values = [3, 1, 2];
  median(values);
  assert.deepEqual(values, [3, 1, 2]);
});
