import { test } from "node:test";
import assert from "node:assert/strict";
import { preorder, inorder, postorder, levelOrder } from "./solution.js";

// Tiny tree builder: node(1, node(2), node(3)) → { value: 1, left: {...}, right: {...} }
function node(value, left = null, right = null) {
  return { value, left, right };
}

// A perfect tree of the given depth, numbered so an INORDER walk comes out
// as 1, 2, 3, ... — one assertion then covers the whole shape.
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

//        1
//      /   \
//     2     3
//    / \   / \
//   4   5 6   7
const classic = () =>
  node(1, node(2, node(4), node(5)), node(3, node(6), node(7)));

test("empty tree gives [] in all four orders", () => {
  assert.deepEqual(preorder(null), []);
  assert.deepEqual(inorder(null), []);
  assert.deepEqual(postorder(null), []);
  assert.deepEqual(levelOrder(null), []);
});

test("a single node is the whole answer in all four orders", () => {
  const tree = node(42);
  assert.deepEqual(preorder(tree), [42]);
  assert.deepEqual(inorder(tree), [42]);
  assert.deepEqual(postorder(tree), [42]);
  assert.deepEqual(levelOrder(tree), [42]);
});

test("preorder on the classic 7-node tree", () => {
  assert.deepEqual(preorder(classic()), [1, 2, 4, 5, 3, 6, 7]);
});

test("inorder on the classic 7-node tree", () => {
  assert.deepEqual(inorder(classic()), [4, 2, 5, 1, 6, 3, 7]);
});

test("postorder on the classic 7-node tree", () => {
  assert.deepEqual(postorder(classic()), [4, 5, 2, 6, 7, 3, 1]);
});

test("levelOrder on the classic 7-node tree", () => {
  assert.deepEqual(levelOrder(classic()), [1, 2, 3, 4, 5, 6, 7]);
});

test("a left-only chain", () => {
  const tree = node(1, node(2, node(3, node(4))));
  assert.deepEqual(preorder(tree), [1, 2, 3, 4]);
  assert.deepEqual(inorder(tree), [4, 3, 2, 1]);
  assert.deepEqual(postorder(tree), [4, 3, 2, 1]);
  assert.deepEqual(levelOrder(tree), [1, 2, 3, 4]);
});

test("a right-only chain", () => {
  const tree = node(1, null, node(2, null, node(3)));
  assert.deepEqual(preorder(tree), [1, 2, 3]);
  assert.deepEqual(inorder(tree), [1, 2, 3]);
  assert.deepEqual(postorder(tree), [3, 2, 1]);
  assert.deepEqual(levelOrder(tree), [1, 2, 3]);
});

test("nodes with just one child are not skipped", () => {
  // 8 has a left child (7) and no right child.
  const tree = node(5, node(3, node(1), node(4)), node(8, node(7)));
  assert.deepEqual(preorder(tree), [5, 3, 1, 4, 8, 7]);
  assert.deepEqual(inorder(tree), [1, 3, 4, 5, 7, 8]);
  assert.deepEqual(postorder(tree), [1, 4, 3, 7, 8, 5]);
  assert.deepEqual(levelOrder(tree), [5, 3, 8, 1, 4, 7]);
});

test("duplicate values all survive", () => {
  const tree = node(2, node(2, node(1)), node(2, null, node(1)));
  assert.deepEqual(preorder(tree), [2, 2, 1, 2, 1]);
  assert.deepEqual(inorder(tree), [1, 2, 2, 2, 1]);
  assert.deepEqual(postorder(tree), [1, 2, 1, 2, 2]);
  assert.deepEqual(levelOrder(tree), [2, 2, 2, 1, 1]);
});

test("the tree is not modified", () => {
  const tree = classic();
  const snapshot = structuredClone(tree);
  preorder(tree);
  inorder(tree);
  postorder(tree);
  levelOrder(tree);
  assert.deepEqual(tree, snapshot);
});

test("a perfect 15-node tree", () => {
  const tree = perfect(4);
  // inorder numbering means the inorder walk is just 1..15
  assert.deepEqual(inorder(tree), Array.from({ length: 15 }, (_, i) => i + 1));
  assert.deepEqual(preorder(tree), [8, 4, 2, 1, 3, 6, 5, 7, 12, 10, 9, 11, 14, 13, 15]);
  assert.deepEqual(postorder(tree), [1, 3, 2, 5, 7, 6, 4, 9, 11, 10, 13, 15, 14, 12, 8]);
  assert.deepEqual(levelOrder(tree), [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]);
});

test("a deep skewed tree does not lose nodes", () => {
  // 400 nodes down the left spine: values 1..400 from the root down.
  let tree = null;
  for (let v = 400; v >= 1; v--) tree = node(v, tree);
  assert.equal(preorder(tree).length, 400);
  assert.deepEqual(preorder(tree).slice(0, 3), [1, 2, 3]);
  assert.deepEqual(inorder(tree).slice(0, 3), [400, 399, 398]);
  assert.deepEqual(levelOrder(tree).at(-1), 400);
});
