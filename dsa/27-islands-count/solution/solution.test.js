import { test } from "node:test";
import assert from "node:assert/strict";
import { countIslands } from "./solution.js";

// Build a grid from a formula — deterministic, and easy to scale up.
function makeGrid(rows, cols, isLand) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (isLand(r, c) ? 1 : 0))
  );
}

test("an empty grid has no islands", () => {
  assert.equal(countIslands([]), 0);
});

test("a single cell", () => {
  assert.equal(countIslands([[1]]), 1);
  assert.equal(countIslands([[0]]), 0);
});

test("all water", () => {
  assert.equal(
    countIslands([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]),
    0
  );
});

test("all land is a single island", () => {
  assert.equal(
    countIslands([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]),
    1
  );
});

test("the classic 4x5 grid has 3 islands", () => {
  assert.equal(
    countIslands([
      [1, 1, 0, 0, 0],
      [1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1],
    ]),
    3
  );
});

test("diagonal contact does not connect cells", () => {
  assert.equal(
    countIslands([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]),
    3
  );
});

test("a 5x5 checkerboard is 13 separate islands", () => {
  const grid = makeGrid(5, 5, (r, c) => (r + c) % 2 === 0);
  assert.equal(countIslands(grid), 13);
});

test("a ring of land around a lake is one island", () => {
  assert.equal(
    countIslands([
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ]),
    1
  );
});

test("a single row", () => {
  assert.equal(countIslands([[1, 0, 1, 1, 0, 1]]), 3);
});

test("a single column", () => {
  assert.equal(countIslands([[1], [0], [1], [1], [0]]), 2);
});

test("the grid is not modified", () => {
  const grid = [
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1],
  ];
  const snapshot = structuredClone(grid);
  countIslands(grid);
  assert.deepEqual(grid, snapshot);
});

test("a 200x1 strip of land is still one island", () => {
  // 200 cells deep: an implementation that recurses per cell is fine here,
  // but this is the shape that eventually overflows the call stack.
  assert.equal(countIslands(makeGrid(200, 1, () => true)), 1);
});

test("a large 60x60 grid", () => {
  const grid = makeGrid(60, 60, (r, c) => (r * 7 + c * 3) % 5 === 0);
  assert.equal(countIslands(grid), 720);
});
