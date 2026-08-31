/**
 * The four classic binary-tree traversals.
 *
 * Nodes are { value, left, right }; a missing child is null, and an empty
 * tree is null. Every function returns one flat array of values.
 *
 * The first three are depth-first (DFS) and are literally the same function:
 *
 *   preorder:   push, walk(left), walk(right)
 *   inorder:    walk(left), push, walk(right)
 *   postorder:  walk(left), walk(right), push
 *
 * The fourth is breadth-first (BFS) and needs a queue instead of recursion.
 *
 * Time  O(n) for all four: every node is pushed exactly once.
 * Space O(n) for the returned array, plus O(h) recursion stack for the DFS
 *       three (h = height) and O(w) queue for levelOrder (w = widest row).
 */

/**
 * Preorder: record a node BEFORE descending into either subtree.
 * "Copy this tree" and "print an outline" are preorder jobs — you need the
 * parent before you can attach the children.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values in preorder
 */
export function preorder(root) {
  const out = [];

  const walk = (n) => {
    if (n === null) return; // base case: the empty tree contributes nothing
    out.push(n.value); // me...
    walk(n.left); // ...then everything on the left...
    walk(n.right); // ...then everything on the right
  };

  walk(root);
  return out;
}

/**
 * Inorder: record a node BETWEEN its two subtrees.
 * On a binary search tree (dsa/25) this comes out sorted — that is the
 * single most useful fact about inorder.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values in inorder
 */
export function inorder(root) {
  const out = [];

  const walk = (n) => {
    if (n === null) return;
    walk(n.left); // everything smaller/left first...
    out.push(n.value); // ...then me...
    walk(n.right); // ...then everything right
  };

  walk(root);
  return out;
}

/**
 * Postorder: record a node AFTER both subtrees are done.
 * "Children first, then me" is the shape of every problem where a node's
 * answer depends on its children's answers — see dsa/26.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values in postorder
 */
export function postorder(root) {
  const out = [];

  const walk = (n) => {
    if (n === null) return;
    walk(n.left);
    walk(n.right);
    out.push(n.value); // me last — the root is always the final element
  };

  walk(root);
  return out;
}

/**
 * Level order (breadth-first): the whole top row, then the next row down,
 * each row left to right. Recursion cannot do this — the call stack always
 * dives deep. A queue is what makes the walk go wide.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number[]} values row by row, in one flat array
 */
export function levelOrder(root) {
  if (root === null) return [];

  const out = [];

  // A plain array used as a queue. `head` is the front of the line; we never
  // call shift(), because shift() re-indexes the whole array (O(n) each time,
  // O(n^2) overall). Moving an index instead is O(1) — the dsa/15 lesson.
  const queue = [root];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++]; // take the front of the line

    out.push(current.value);

    // Children join the BACK of the line, so the entire current row is
    // recorded before any of the next row is touched.
    if (current.left !== null) queue.push(current.left);
    if (current.right !== null) queue.push(current.right);
  }

  return out;
}
