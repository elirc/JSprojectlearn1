import test from "node:test";
import assert from "node:assert/strict";
import { maxArea } from "./attempt.js";

const todo = maxArea.toString().includes("TODO");
const skip = todo && "unsolved — edit attempt.js (delete the TODO lines) to activate these tests";

test("classic example: [1,8,6,2,5,4,8,3,7] holds 49", { skip }, () => {
  assert.equal(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]), 49);
});

test("two lines: shorter height times width 1", { skip }, () => {
  assert.equal(maxArea([1, 1]), 1);
  assert.equal(maxArea([8, 3]), 3);
});

test("tall walls at both ends beat everything between", { skip }, () => {
  assert.equal(maxArea([4, 3, 2, 1, 4]), 16);
});

test("small peak in the middle", { skip }, () => {
  assert.equal(maxArea([1, 2, 1]), 2);
});

test("fewer than two lines holds nothing", { skip }, () => {
  assert.equal(maxArea([]), 0);
  assert.equal(maxArea([5]), 0);
});

test("strictly increasing heights", { skip }, () => {
  assert.equal(maxArea([1, 2, 3, 4, 5]), 6);
});

test("best pair is not a pair of neighbours", { skip }, () => {
  assert.equal(maxArea([2, 3, 10, 5, 7, 8, 9]), 36);
});

test("zero heights hold zero water", { skip }, () => {
  assert.equal(maxArea([0, 0]), 0);
  assert.equal(maxArea([0, 5, 0]), 0);
});
