// Reference tests for solution.js. GATED alongside the solution.
// No skip guard here — these must pass unconditionally.

import { test } from "node:test";
import assert from "node:assert/strict";
import { <fnName> } from "./solution.js";

test("<the canonical happy-path example>", () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<the case that defeats the naive approach>", () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<boundary: smallest valid input>", () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<boundary: duplicates / negatives / empty>", () => {
  assert.deepEqual(<fnName>(<args>), <expected>);
});

test("<output invariant holds>", () => {
  const result = <fnName>(<args>);
  assert.ok(<invariant>, "<message>");
});

test("<larger input>", () => {
  const input = Array.from({ length: 1000 }, (_, k) => <expr>);
  assert.deepEqual(<fnName>(input, <arg>), <expected>);
});
