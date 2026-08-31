// Delete the TODO line and implement. Run: node --test dsa/24-tree-traversals/attempt.test.js

// Tree nodes look like: { value: number, left: Node|null, right: Node|null }
// An empty tree is null. All four functions return a FLAT array of values.

/**
 * Depth-first, visiting each node BEFORE its subtrees.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values in preorder: me, left subtree, right subtree
 */
export function preorder(root) {
  throw new Error("TODO: implement me");
}

/**
 * Depth-first, visiting each node BETWEEN its two subtrees.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values in inorder: left subtree, me, right subtree
 */
export function inorder(root) {
  throw new Error("TODO: implement me");
}

/**
 * Depth-first, visiting each node AFTER both of its subtrees.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values in postorder: left subtree, right subtree, me
 */
export function postorder(root) {
  throw new Error("TODO: implement me");
}

/**
 * Breadth-first: the whole top row, then the next row, each left to right.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values row by row, in one flat array
 */
export function levelOrder(root) {
  throw new Error("TODO: implement me");
}
