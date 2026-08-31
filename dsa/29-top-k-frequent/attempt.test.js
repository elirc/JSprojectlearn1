import { test } from "node:test";
import assert from "node:assert/strict";
import { topKFrequent } from "./attempt.js";

// The order of the result doesn't matter — sort both sides before comparing.
// This comparator works for numbers and strings alike.
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

// Value v appears exactly v + 1 times, so every count is distinct and the
// top k is never ambiguous. 20 values, 210 elements.
function staircase() {
  const out = [];
  for (let value = 0; value < 20; value++) {
    for (let repeat = 0; repeat <= value; repeat++) out.push(value);
  }
  return out;
}

const todo = topKFrequent.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("the classic example", { skip }, () => {
  assert.deepEqual(sorted(topKFrequent([1, 1, 1, 2, 2, 3], 2)), [1, 2]);
});

test("a single element", { skip }, () => {
  assert.deepEqual(sorted(topKFrequent([1], 1)), [1]);
});

test("k = 0 returns an empty array", { skip }, () => {
  assert.deepEqual(topKFrequent([1, 1, 2], 0), []);
});

test("k equal to the number of distinct values returns them all", { skip }, () => {
  // counts: 4 -> 2, 9 -> 3, 7 -> 1
  assert.deepEqual(sorted(topKFrequent([4, 4, 9, 9, 9, 7], 3)), [4, 7, 9]);
});

test("every element identical", { skip }, () => {
  assert.deepEqual(sorted(topKFrequent([5, 5, 5, 5], 1)), [5]);
});

test("negatives and zero are ordinary values", { skip }, () => {
  // counts: -3 -> 3, 0 -> 2, 8 -> 1
  assert.deepEqual(sorted(topKFrequent([-3, -3, -3, 0, 0, 8], 2)), [-3, 0]);
});

test("strings work too", { skip }, () => {
  assert.deepEqual(sorted(topKFrequent(["a", "a", "a", "b", "b", "c"], 2)), ["a", "b"]);
});

test("returns the values, not their counts", { skip }, () => {
  // 22 appears 5 times, 11 appears 2 times, 33 appears once. Returning counts
  // would give [2, 5]; returning values gives [11, 22]. No overlap.
  const nums = [22, 22, 22, 22, 22, 11, 11, 33];
  assert.deepEqual(sorted(topKFrequent(nums, 2)), [11, 22]);
});

test("the result always has exactly k elements", { skip }, () => {
  assert.equal(topKFrequent([7, 7, 7, 8, 8, 9], 1).length, 1);
  assert.equal(topKFrequent([1, 1, 1, 2, 2, 3], 3).length, 3);
});

test("k = 1 returns just the most frequent value", { skip }, () => {
  assert.deepEqual(sorted(topKFrequent([7, 7, 7, 8, 8, 9], 1)), [7]);
});

test("the k-th and (k+1)-th counts differ by only one", { skip }, () => {
  // counts: 10 -> 5, 20 -> 4, 30 -> 3, 40 -> 2. With k = 3 the cut falls
  // between 3 and 2, so a `>=` where a `>` belongs shows up here.
  const nums = [
    ...Array(5).fill(10),
    ...Array(4).fill(20),
    ...Array(3).fill(30),
    ...Array(2).fill(40),
  ];
  assert.deepEqual(sorted(topKFrequent(nums, 3)), [10, 20, 30]);
});

test("nums is not modified", { skip }, () => {
  const nums = [1, 1, 2, 2, 2, 3];
  topKFrequent(nums, 2);
  assert.deepEqual(nums, [1, 1, 2, 2, 2, 3]);
});

test("a long array with 20 distinct values", { skip }, () => {
  const nums = staircase();
  assert.equal(nums.length, 210);
  assert.deepEqual(sorted(topKFrequent(nums, 4)), [16, 17, 18, 19]);
  assert.deepEqual(sorted(topKFrequent(nums, 1)), [19]);
});
