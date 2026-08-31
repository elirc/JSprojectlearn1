import { test } from "node:test";
import assert from "node:assert/strict";
import { coinChange } from "./solution.js";

test("the canonical case: 11 from 1s, 2s and 5s", () => {
  assert.equal(coinChange([1, 2, 5], 11), 3); // 5 + 5 + 1
});

test("the greedy trap: biggest-coin-first loses", () => {
  // Greedy takes 4, then 1 + 1 — three coins. The answer is 3 + 3.
  assert.equal(coinChange([1, 3, 4], 6), 2);
});

test("impossible amounts return -1", () => {
  assert.equal(coinChange([2], 3), -1); // every pile of 2s is even
  assert.equal(coinChange([3, 7], 5), -1);
});

test("every coin is bigger than the amount", () => {
  assert.equal(coinChange([5, 10], 3), -1);
});

test("amount 0 needs zero coins", () => {
  assert.equal(coinChange([1], 0), 0);
  assert.equal(coinChange([1, 2, 5], 0), 0);
});

test("no coins at all", () => {
  assert.equal(coinChange([], 7), -1);
  assert.equal(coinChange([], 0), 0); // still zero coins for zero
});

test("a single coin that matches exactly", () => {
  assert.equal(coinChange([7], 7), 1);
});

test("duplicate denominations are harmless", () => {
  assert.equal(coinChange([1, 1, 2], 4), 2); // 2 + 2
});

test("coins arrive unsorted", () => {
  assert.equal(coinChange([2, 5, 10, 1], 27), 4); // 10 + 10 + 5 + 2
});

test("real currency, where greedy happens to agree", () => {
  assert.equal(coinChange([25, 10, 5, 1], 63), 6); // 25 + 25 + 10 + 1 + 1 + 1
});

test("the case that kills naive recursion", () => {
  assert.equal(coinChange([186, 419, 83, 408], 6249), 20);
});

test("a large amount", () => {
  assert.equal(coinChange([1, 5, 12, 19], 1000), 53);
});

test("does not modify the coins array", () => {
  const input = [2, 5, 10, 1];
  coinChange(input, 27);
  assert.deepEqual(input, [2, 5, 10, 1]);
});
