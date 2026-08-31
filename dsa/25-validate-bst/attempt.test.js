import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidBST } from "./attempt.js";

// Tiny tree builder: node(2, node(1), node(3)) → { value: 2, left: {...}, right: {...} }
function node(value, left = null, right = null) {
  return { value, left, right };
}

// Build a balanced BST from an already-sorted array by taking the middle as
// the root and recursing on each half — the dsa/21 split, reused.
function sortedBst(values) {
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return node(
    values[mid],
    sortedBst(values.slice(0, mid)),
    sortedBst(values.slice(mid + 1))
  );
}

const bigValues = Array.from({ length: 63 }, (_, i) => i * 2 - 20);

const todo = isValidBST.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("an empty tree is a valid BST", { skip }, () => {
  assert.equal(isValidBST(null), true);
});

test("a single node is a valid BST", { skip }, () => {
  assert.equal(isValidBST(node(7)), true);
});

test("a small valid BST", { skip }, () => {
  assert.equal(isValidBST(node(2, node(1), node(3))), true);
});

test("a valid 7-node BST", { skip }, () => {
  const tree = node(4, node(2, node(1), node(3)), node(6, node(5), node(7)));
  assert.equal(isValidBST(tree), true);
});

test("a too-small grandchild in the right subtree is invalid", { skip }, () => {
  // Every parent/child pair is fine, but 3 < 5 while living to 5's right.
  const tree = node(5, node(1), node(6, node(3), node(7)));
  assert.equal(isValidBST(tree), false);
});

test("a too-large grandchild in the left subtree is invalid", { skip }, () => {
  // 12 > 10 while living to 10's left. The mirror image of the trap above.
  const tree = node(10, node(5, node(1), node(12)), node(15));
  assert.equal(isValidBST(tree), false);
});

test("a duplicate on the left is invalid", { skip }, () => {
  assert.equal(isValidBST(node(2, node(2), node(3))), false);
});

test("a duplicate on the right is invalid", { skip }, () => {
  assert.equal(isValidBST(node(2, node(1), node(2))), false);
});

test("a strictly descending left-only chain is valid", { skip }, () => {
  assert.equal(isValidBST(node(5, node(4, node(3, node(2))))), true);
});

test("a strictly ascending right-only chain is valid", { skip }, () => {
  const tree = node(1, null, node(2, null, node(3, null, node(4))));
  assert.equal(isValidBST(tree), true);
});

test("negatives and zero are ordinary values", { skip }, () => {
  assert.equal(isValidBST(node(0, node(-5, node(-9), node(-1)), node(7))), true);
  assert.equal(isValidBST(node(0, node(-5), node(-1))), false);
});

test("a large balanced BST is valid until one deep value is broken", { skip }, () => {
  assert.equal(isValidBST(sortedBst(bigValues)), true);

  const broken = sortedBst(bigValues);
  broken.left.left.left.value = 999; // way out of its allowed window
  assert.equal(isValidBST(broken), false);
});

test("the tree is not modified", { skip }, () => {
  const tree = sortedBst([1, 2, 3, 4, 5, 6, 7]);
  const snapshot = structuredClone(tree);
  isValidBST(tree);
  assert.deepEqual(tree, snapshot);
});
