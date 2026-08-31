import test from "node:test";
import assert from "node:assert/strict";
import { reverseList } from "./attempt.js";

const todo = reverseList.toString().includes("TODO");
const skip = todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

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

test("reverses a five-node list", { skip }, () => {
  assert.deepEqual(toArray(reverseList(buildList([1, 2, 3, 4, 5]))), [5, 4, 3, 2, 1]);
});

test("two nodes swap", { skip }, () => {
  assert.deepEqual(toArray(reverseList(buildList([1, 2]))), [2, 1]);
});

test("a single node comes back unchanged", { skip }, () => {
  const head = reverseList(buildList([1]));
  assert.equal(head.value, 1);
  assert.equal(head.next, null);
});

test("an empty list reverses to null", { skip }, () => {
  assert.equal(reverseList(null), null);
});

test("the old head becomes the last node", { skip }, () => {
  const head = buildList([1, 2, 3]);
  const newHead = reverseList(head);
  assert.equal(newHead.value, 3);
  assert.equal(head.next, null); // the old first node now ends the list
});

test("reversing twice restores the original order", { skip }, () => {
  assert.deepEqual(toArray(reverseList(reverseList(buildList([1, 2, 3, 4])))), [1, 2, 3, 4]);
});

test("re-links the same node objects — no new nodes", { skip }, () => {
  const head = buildList([1, 2, 3]);
  const second = head.next;
  const third = head.next.next;
  const newHead = reverseList(head);
  assert.equal(newHead, third); // the very same object, not a copy
  assert.equal(newHead.next, second);
  assert.equal(newHead.next.next, head);
});
