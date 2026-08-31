// Delete the TODO line and implement. Run: node --test dsa/26-max-depth-and-diameter/attempt.test.js

// Tree nodes look like: { value: number, left: Node|null, right: Node|null }
// An empty tree is null. Only the SHAPE matters here — values are ignored.

/**
 * How many NODES are on the longest root-to-leaf path?
 *
 * Empty tree → 0. A single node → 1. Two nodes → 2.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number} the node count of the deepest path
 */
export function maxDepth(root) {
  throw new Error("TODO: implement me");
}

/**
 * How many EDGES are on the longest path between any two nodes?
 *
 * The path does not have to pass through the root. Empty tree → 0.
 * A single node → 0 (no edges). Two nodes → 1.
 *
 * Aim for one pass: O(n) time, not O(n^2).
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number} the edge count of the longest path in the tree
 */
export function diameter(root) {
  throw new Error("TODO: implement me");
}
