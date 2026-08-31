import { test } from "node:test";
import assert from "node:assert/strict";
import { moveZeroes } from "./solution.js";

test("classic example", () => {
  assert.deepEqual(moveZeroes([0, 1, 0, 3, 12]), [1, 3, 12, 0, 0]);
});

test("zeros bunched at the front", () => {
  assert.deepEqual(moveZeroes([0, 0, 1]), [1, 0, 0]);
});

test("no zeros at all leaves the order alone", () => {
  assert.deepEqual(moveZeroes([1, 2, 3]), [1, 2, 3]);
});

test("every element is a zero", () => {
  assert.deepEqual(moveZeroes([0, 0, 0]), [0, 0, 0]);
});

test("empty array", () => {
  assert.deepEqual(moveZeroes([]), []);
});

test("single element, zero and non-zero", () => {
  assert.deepEqual(moveZeroes([0]), [0]);
  assert.deepEqual(moveZeroes([5]), [5]);
});

test("already in the right shape stays put", () => {
  assert.deepEqual(moveZeroes([1, 2, 0, 0]), [1, 2, 0, 0]);
});

test("negative numbers keep their relative order", () => {
  assert.deepEqual(moveZeroes([0, -1, 0, -2, 3]), [-1, -2, 3, 0, 0]);
});

test("returns the SAME array object it was given", () => {
  const nums = [0, 1];
  assert.equal(moveZeroes(nums), nums, "expected the same array back, not a copy");
});

test("mutates in place — the caller's variable sees the change", () => {
  const nums = [0, 4, 0, 5];
  moveZeroes(nums);
  assert.deepEqual(nums, [4, 5, 0, 0]);
});

test("length never changes", () => {
  const nums = [0, 0, 7, 0, 8, 0];
  moveZeroes(nums);
  assert.equal(nums.length, 6);
});

test("relative order of many non-zeros is preserved exactly", () => {
  assert.deepEqual(
    moveZeroes([9, 0, 8, 0, 7, 0, 6, 0, 5]),
    [9, 8, 7, 6, 5, 0, 0, 0, 0]
  );
});

test("larger array: zeros all at the back, non-zeros in original order", () => {
  const source = Array.from({ length: 300 }, (_, k) => (k % 3 === 0 ? 0 : k));
  const expected = source.filter((n) => n !== 0);
  const zeroCount = source.length - expected.length;
  const result = moveZeroes([...source]);
  assert.deepEqual(result.slice(0, expected.length), expected);
  assert.deepEqual(result.slice(expected.length), new Array(zeroCount).fill(0));
});
