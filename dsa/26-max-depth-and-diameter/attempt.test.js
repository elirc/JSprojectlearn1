import { test } from "node:test";
import assert from "node:assert/strict";
import { maxDepth, diameter } from "./attempt.js";

// Tiny tree builder: node(1, node(2), node(3)) → { value: 1, left: {...}, right: {...} }
function node(value, left = null, right = null) {
  return { value, left, right };
}

// A left-only chain of n nodes: root is 1, its left child 2, and so on.
function chain(n) {
  let root = null;
  for (let value = n; value >= 1; value--) root = node(value, root);
  return root;
}

// A perfect tree of the given depth, numbered so an inorder walk reads 1..n.
function perfect(depth) {
  let counter = 0;
  const build = (d) => {
    if (d === 0) return null;
    const left = build(d - 1);
    const value = ++counter;
    const right = build(d - 1);
    return node(value, left, right);
  };
  return build(depth);
}

const todo = [maxDepth, diameter].some((fn) => fn.toString().includes("TODO"));
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("an empty tree has depth 0 and diameter 0", { skip }, () => {
  assert.equal(maxDepth(null), 0);
  assert.equal(diameter(null), 0);
});

test("a single node has depth 1 (one node) and diameter 0 (no edges)", { skip }, () => {
  const tree = node(9);
  assert.equal(maxDepth(tree), 1);
  assert.equal(diameter(tree), 0);
});

test("two nodes: depth 2, diameter 1", { skip }, () => {
  assert.equal(maxDepth(node(1, node(2))), 2);
  assert.equal(diameter(node(1, node(2))), 1);
  assert.equal(maxDepth(node(1, null, node(2))), 2);
  assert.equal(diameter(node(1, null, node(2))), 1);
});

test("a balanced 3-node tree: depth 2, diameter 2", { skip }, () => {
  const tree = node(1, node(2), node(3));
  assert.equal(maxDepth(tree), 2);
  assert.equal(diameter(tree), 2);
});

test("the classic 7-node tree: depth 3, diameter 4", { skip }, () => {
  const tree = node(1, node(2, node(4), node(5)), node(3, node(6), node(7)));
  assert.equal(maxDepth(tree), 3);
  assert.equal(diameter(tree), 4);
});

test("a left-only chain of 4: depth 4, diameter 3", { skip }, () => {
  assert.equal(maxDepth(chain(4)), 4);
  assert.equal(diameter(chain(4)), 3);
});

test("depth counts nodes, diameter counts edges", { skip }, () => {
  // The same straight line, measured two ways: 3 nodes, 2 edges.
  assert.equal(maxDepth(chain(3)), 3);
  assert.equal(diameter(chain(3)), 2);
});

test("the longest path need not pass through the root", { skip }, () => {
  //        1
  //       /
  //      2
  //     / \
  //    3   4
  //   /     \
  //  5       6
  // /         \
  // 7          8
  const tree = node(
    1,
    node(2, node(3, node(5, node(7))), node(4, null, node(6, null, node(8))))
  );
  assert.equal(maxDepth(tree), 5);
  // 7-5-3-2-4-6-8 is 6 edges; anything through the root is at most 4.
  assert.equal(diameter(tree), 6);
});

test("the longest path may pass through the root", { skip }, () => {
  const tree = node(1, node(2, node(3, node(4))), node(5, node(6, node(7))));
  assert.equal(maxDepth(tree), 4);
  assert.equal(diameter(tree), 6);
});

test("a lopsided tree", { skip }, () => {
  const tree = node(1, node(2, node(3, node(4, node(5)))), node(6));
  assert.equal(maxDepth(tree), 5);
  assert.equal(diameter(tree), 5);
});

test("a perfect 15-node tree: depth 4, diameter 6", { skip }, () => {
  const tree = perfect(4);
  assert.equal(maxDepth(tree), 4);
  assert.equal(diameter(tree), 6);
});

test("a deep skewed tree of 200 nodes", { skip }, () => {
  assert.equal(maxDepth(chain(200)), 200);
  assert.equal(diameter(chain(200)), 199);
});

test("neither function modifies the tree", { skip }, () => {
  const tree = node(1, node(2, node(4), node(5)), node(3, node(6), node(7)));
  const snapshot = structuredClone(tree);
  maxDepth(tree);
  diameter(tree);
  assert.deepEqual(tree, snapshot);
});
