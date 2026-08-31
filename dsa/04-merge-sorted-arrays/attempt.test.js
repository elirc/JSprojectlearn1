import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSorted } from "./attempt.js";

const todo = mergeSorted.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("perfect interleave", { skip }, () => {
  assert.deepEqual(mergeSorted([1, 3, 5], [2, 4, 6]), [1, 2, 3, 4, 5, 6]);
});

test("one array entirely before the other", { skip }, () => {
  assert.deepEqual(mergeSorted([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
});

test("first array empty", { skip }, () => {
  assert.deepEqual(mergeSorted([], [1, 2]), [1, 2]);
});

test("second array empty", { skip }, () => {
  assert.deepEqual(mergeSorted([7, 8], []), [7, 8]);
});

test("both arrays empty", { skip }, () => {
  assert.deepEqual(mergeSorted([], []), []);
});

test("duplicates within and across arrays all survive", { skip }, () => {
  assert.deepEqual(mergeSorted([1, 2, 2], [2, 3]), [1, 2, 2, 2, 3]);
});

test("very different lengths", { skip }, () => {
  assert.deepEqual(mergeSorted([5], [1, 2, 3, 4, 6, 7]), [1, 2, 3, 4, 5, 6, 7]);
});

test("negative numbers", { skip }, () => {
  assert.deepEqual(mergeSorted([-5, -1, 3], [-2, 0]), [-5, -2, -1, 0, 3]);
});

test("identical arrays double up", { skip }, () => {
  assert.deepEqual(mergeSorted([1, 1, 1], [1, 1]), [1, 1, 1, 1, 1]);
});

test("does not mutate the inputs", { skip }, () => {
  const a = [1, 3];
  const b = [2, 4];
  mergeSorted(a, b);
  assert.deepEqual(a, [1, 3]);
  assert.deepEqual(b, [2, 4]);
});

test("returns a new array, not one of the inputs", { skip }, () => {
  const a = [1, 2];
  const result = mergeSorted(a, []);
  assert.notEqual(result, a, "expected a brand-new array");
  assert.deepEqual(result, [1, 2]);
});

test("larger merge stays sorted end to end", { skip }, () => {
  const a = Array.from({ length: 50 }, (_, k) => k * 3); // 0,3,6,...
  const b = Array.from({ length: 50 }, (_, k) => k * 3 + 1); // 1,4,7,...
  const merged = mergeSorted(a, b);
  assert.equal(merged.length, 100);
  for (let i = 1; i < merged.length; i++) {
    assert.ok(merged[i - 1] <= merged[i], `unsorted at index ${i}`);
  }
});
