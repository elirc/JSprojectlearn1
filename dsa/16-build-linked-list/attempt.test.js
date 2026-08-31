import test from "node:test";
import assert from "node:assert/strict";
import { LinkedList } from "./attempt.js";

const todo = LinkedList.prototype.pushBack.toString().includes("TODO");
const skip = todo && "unsolved — edit attempt.js (delete the TODO lines) to activate these tests";

test("pushBack appends to the end", { skip }, () => {
  const list = new LinkedList();
  list.pushBack(1);
  list.pushBack(2);
  list.pushBack(3);
  assert.deepEqual(list.toArray(), [1, 2, 3]);
  assert.equal(list.head.value, 1); // plain { value, next } nodes
  assert.equal(list.head.next.next.next, null); // null marks the end
});

test("pushFront prepends", { skip }, () => {
  const list = new LinkedList();
  list.pushFront(1);
  list.pushFront(2);
  list.pushFront(3);
  assert.deepEqual(list.toArray(), [3, 2, 1]);

  const mixed = new LinkedList();
  mixed.pushBack(1);
  mixed.pushBack(2);
  mixed.pushFront(0);
  assert.deepEqual(mixed.toArray(), [0, 1, 2]);
});

test("a new list is empty", { skip }, () => {
  const list = new LinkedList();
  assert.deepEqual(list.toArray(), []);
  assert.equal(list.head, null);
});

test("fromArray builds the list in order", { skip }, () => {
  assert.deepEqual(LinkedList.fromArray([10, 20, 30]).toArray(), [10, 20, 30]);
});

test("removeFirstMatch removes only the first occurrence", { skip }, () => {
  const list = LinkedList.fromArray([1, 2, 3, 2]);
  assert.equal(list.removeFirstMatch(2), true);
  assert.deepEqual(list.toArray(), [1, 3, 2]); // the second 2 stays
});

test("removing the head, then the tail, leaves a usable list", { skip }, () => {
  const list = LinkedList.fromArray([1, 2, 3]);
  list.removeFirstMatch(1); // the head
  assert.deepEqual(list.toArray(), [2, 3]);
  list.removeFirstMatch(3); // the last node
  list.pushBack(9); // still has to land at the end
  assert.deepEqual(list.toArray(), [2, 9]);
});

test("removing a value that isn't there returns false", { skip }, () => {
  const list = LinkedList.fromArray(["a", "b"]);
  assert.equal(list.removeFirstMatch("z"), false);
  assert.deepEqual(list.toArray(), ["a", "b"]); // unchanged
});
