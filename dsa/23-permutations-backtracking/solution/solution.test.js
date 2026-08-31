import { test } from "node:test";
import assert from "node:assert/strict";
import { permutations } from "./solution.js";

// The order of the permutations themselves doesn't matter — normalize before comparing.
const norm = (perms) => perms.map((p) => p.join(",")).sort();

test("empty array has exactly one permutation — the empty one", () => {
  assert.deepEqual(permutations([]), [[]]);
});

test("single element", () => {
  assert.deepEqual(permutations([1]), [[1]]);
});

test("two elements give both orders", () => {
  assert.deepEqual(norm(permutations([1, 2])), ["1,2", "2,1"]);
});

test("three elements give all six", () => {
  assert.deepEqual(norm(permutations([1, 2, 3])), [
    "1,2,3",
    "1,3,2",
    "2,1,3",
    "2,3,1",
    "3,1,2",
    "3,2,1",
  ]);
});

test("four elements give all twenty-four", () => {
  assert.deepEqual(norm(permutations([1, 2, 3, 4])), [
    "1,2,3,4", "1,2,4,3", "1,3,2,4", "1,3,4,2", "1,4,2,3", "1,4,3,2",
    "2,1,3,4", "2,1,4,3", "2,3,1,4", "2,3,4,1", "2,4,1,3", "2,4,3,1",
    "3,1,2,4", "3,1,4,2", "3,2,1,4", "3,2,4,1", "3,4,1,2", "3,4,2,1",
    "4,1,2,3", "4,1,3,2", "4,2,1,3", "4,2,3,1", "4,3,1,2", "4,3,2,1",
  ]);
});

test("the count is n! for n = 5 and n = 6", () => {
  assert.equal(permutations([1, 2, 3, 4, 5]).length, 120);
  assert.equal(permutations([1, 2, 3, 4, 5, 6]).length, 720);
});

test("no duplicate permutations", () => {
  const out = permutations([1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(out.map((p) => p.join(","))).size, 720);
});

test("every output is a rearrangement of the input", () => {
  const input = [4, 1, 9, 2, 7];
  const expected = [...input].sort((a, b) => a - b);
  for (const perm of permutations(input)) {
    assert.deepEqual([...perm].sort((a, b) => a - b), expected);
  }
});

test("every output has the same length as the input", () => {
  for (const perm of permutations([1, 2, 3, 4])) {
    assert.equal(perm.length, 4);
  }
});

test("each permutation is its own array, not a shared reference", () => {
  const out = permutations([1, 2, 3]);
  assert.notEqual(out[0], out[1]);
  out[0].push(99); // scribbling on one must not touch any other
  assert.equal(out[1].length, 3);
});

test("does not mutate the input array", () => {
  const input = [1, 2, 3, 4];
  permutations(input);
  assert.deepEqual(input, [1, 2, 3, 4]);
});

test("works with strings", () => {
  assert.deepEqual(norm(permutations(["a", "b", "c"])), [
    "a,b,c",
    "a,c,b",
    "b,a,c",
    "b,c,a",
    "c,a,b",
    "c,b,a",
  ]);
});
