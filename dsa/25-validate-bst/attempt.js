// Delete the TODO line and implement. Run: node --test dsa/25-validate-bst/attempt.test.js

// Tree nodes look like: { value: number, left: Node|null, right: Node|null }
// An empty tree is null, and an empty tree counts as a valid BST.

/**
 * Is this whole tree a valid binary search tree?
 *
 * The rule, everywhere in the tree: every value in a node's LEFT subtree is
 * strictly less than the node, every value in its RIGHT subtree is strictly
 * greater, and both subtrees are themselves valid BSTs. Duplicates are
 * therefore invalid.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {boolean} true if the tree keeps the BST ordering everywhere
 */
export function isValidBST(root) {
  throw new Error("TODO: implement me");
}
