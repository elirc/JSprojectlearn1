import { test } from "node:test";
import assert from "node:assert/strict";
import { <fnName> } from "./attempt.js";

// The skip guard: these tests stay dormant until the learner removes the TODO throw,
// so a fresh checkout never reports failures. Copy this idiom exactly.
const todo = <fnName>.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("<the canonical happy-path example, spelled out>", { skip }, () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<a case where the naive/greedy answer is wrong>", { skip }, () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<duplicate values>", { skip }, () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<negative numbers / zero / empty string — whichever applies>", { skip }, () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<the smallest valid input>", { skip }, () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<the answer sits at the very ends of the input>", { skip }, () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<an invariant of the output, asserted directly>", { skip }, () => {
  const result = <fnName>(<args>);
  assert.ok(<invariant>, "<message explaining what should have held>");
});

test("<a larger generated input still answers correctly>", { skip }, () => {
  const input = Array.from({ length: 1000 }, (_, k) => <expr>);
  assert.deepEqual(<fnName>(input, <arg>), <expected>);
});

// 8–12 tests total. Every name is a sentence describing the situation, not "test 3".
