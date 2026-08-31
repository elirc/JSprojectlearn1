import test from "node:test";
import assert from "node:assert/strict";
import { hasCycle } from "./attempt.js";

const todo = hasCycle.toString().includes("TODO");
const skip = todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

/**
 * Build a { value, next } chain. With cycleIndex >= 0 the last node's
 * `next` points back at nodes[cycleIndex] instead of null. [] → null.
 */
function buildList(values, cycleIndex = -1) {
  const nodes = values.map((value) => ({ value, next: null }));
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = nodes[i + 1];
  if (nodes.length > 0 && cycleIndex >= 0) nodes[nodes.length - 1].next = nodes[cycleIndex];
  return nodes.length > 0 ? nodes[0] : null;
}

/** Read a NON-cyclic chain back into a plain array. */
function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.value);
  return out;
}

test("a plain list has no cycle", { skip }, () => {
  assert.equal(hasCycle(buildList([1, 2, 3, 4])), false);
});

test("empty and single-node lists have no cycle", { skip }, () => {
  assert.equal(hasCycle(null), false);
  assert.equal(hasCycle(buildList([1])), false);
});

test("a node pointing at itself is a cycle", { skip }, () => {
  assert.equal(hasCycle(buildList([1], 0)), true);
});

test("the tail loops back into the middle", { skip }, () => {
  assert.equal(hasCycle(buildList([3, 2, 0, -4], 1)), true);
});

test("two nodes pointing at each other", { skip }, () => {
  assert.equal(hasCycle(buildList([1, 2], 0)), true);
});

test("the tail loops back to the head", { skip }, () => {
  assert.equal(hasCycle(buildList([1, 2, 3, 4, 5, 6, 7], 0)), true);
});

test("the last node loops onto itself", { skip }, () => {
  assert.equal(hasCycle(buildList([1, 2, 3, 4, 5, 6], 5)), true);
});

test("repeated values are not a cycle", { skip }, () => {
  assert.equal(hasCycle(buildList([1, 1, 1, 1])), false); // compare nodes, not values
});

test("a long clean list returns false and is left unmodified", { skip }, () => {
  const values = Array.from({ length: 1000 }, (_, i) => i);
  const head = buildList(values);
  assert.equal(hasCycle(head), false);
  assert.deepEqual(toArray(head), values); // nothing was rewired or marked
});
