import test from "node:test";
import assert from "node:assert/strict";
import { reverseList } from "./solution.js";

/** Build a { value, next } chain from an array. [] → null. */
function buildList(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = { value: values[i], next: head };
  return head;
}

/** Read a { value, next } chain back into a plain array. */
function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.value);
  return out;
}

test("reverses a five-node list", () => {
  assert.deepEqual(toArray(reverseList(buildList([1, 2, 3, 4, 5]))), [5, 4, 3, 2, 1]);
});

test("two nodes swap", () => {
  assert.deepEqual(toArray(reverseList(buildList([1, 2]))), [2, 1]);
});

test("a single node comes back unchanged", () => {
  const head = reverseList(buildList([1]));
  assert.equal(head.value, 1);
  assert.equal(head.next, null);
});

test("an empty list reverses to null", () => {
  assert.equal(reverseList(null), null);
});

test("the old head becomes the last node", () => {
  const head = buildList([1, 2, 3]);
  const newHead = reverseList(head);
  assert.equal(newHead.value, 3);
  assert.equal(head.next, null); // the old first node now ends the list
});

test("reversing twice restores the original order", () => {
  assert.deepEqual(toArray(reverseList(reverseList(buildList([1, 2, 3, 4])))), [1, 2, 3, 4]);
});

test("re-links the same node objects — no new nodes", () => {
  const head = buildList([1, 2, 3]);
  const second = head.next;
  const third = head.next.next;
  const newHead = reverseList(head);
  assert.equal(newHead, third); // the very same object, not a copy
  assert.equal(newHead.next, second);
  assert.equal(newHead.next.next, head);
});
