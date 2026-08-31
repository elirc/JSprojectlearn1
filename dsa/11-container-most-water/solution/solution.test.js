import test from "node:test";
import assert from "node:assert/strict";
import { maxArea } from "./solution.js";

test("classic example: [1,8,6,2,5,4,8,3,7] holds 49", () => {
  assert.equal(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]), 49);
});

test("two lines: shorter height times width 1", () => {
  assert.equal(maxArea([1, 1]), 1);
  assert.equal(maxArea([8, 3]), 3);
});

test("tall walls at both ends beat everything between", () => {
  assert.equal(maxArea([4, 3, 2, 1, 4]), 16);
});

test("small peak in the middle", () => {
  assert.equal(maxArea([1, 2, 1]), 2);
});

test("fewer than two lines holds nothing", () => {
  assert.equal(maxArea([]), 0);
  assert.equal(maxArea([5]), 0);
});

test("strictly increasing heights", () => {
  assert.equal(maxArea([1, 2, 3, 4, 5]), 6);
});

test("best pair is not a pair of neighbours", () => {
  assert.equal(maxArea([2, 3, 10, 5, 7, 8, 9]), 36);
});

test("zero heights hold zero water", () => {
  assert.equal(maxArea([0, 0]), 0);
  assert.equal(maxArea([0, 5, 0]), 0);
});
