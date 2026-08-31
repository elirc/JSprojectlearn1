/**
 * Max depth and diameter of a binary tree, both in one pass each.
 *
 * The shared technique: a recursive helper does TWO jobs at once — it
 * returns one number to its parent, and it records a different number in a
 * variable that lives outside the recursion. Information flows up (the
 * return value) while an answer accumulates on the side (the closure).
 *
 * Time  O(n) for both: every node is visited exactly once.
 * Space O(h): one stack frame per level, h = height of the tree.
 */

/**
 * Number of NODES on the longest root-to-leaf path.
 *
 * 1. An empty tree has depth 0 — the base case.
 * 2. Otherwise: I am one node, plus however deep my deeper child goes.
 *
 * Don't trace the recursion (dsa/21's lesson). Just read the contract:
 * "maxDepth returns the node count of the deepest path", assume the two
 * child calls honour it, and the line below is obviously right.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number} the node count of the deepest path
 */
export function maxDepth(root) {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

/**
 * Number of EDGES on the longest path between any two nodes. The path is not
 * required to pass through the root.
 *
 * The key observation: every path has exactly one HIGHEST node. Stand on
 * that node and the path runs straight down one side and straight down the
 * other, so its length in edges is
 *
 *     depth(left subtree) + depth(right subtree)
 *
 * (A subtree of depth d is d edges away from its parent, which is why the
 * node counts add up to an edge count without any -1 fiddling.)
 *
 * So: compute that candidate at every node and keep the biggest. The naive
 * way to do that is to call maxDepth inside a walk — but maxDepth itself
 * walks the whole subtree, so you'd re-walk deep nodes once per ancestor:
 * O(n^2) on a skewed tree. Instead, one post-order pass computes the depths
 * bottom-up and evaluates the candidate on the way back through each node.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {number} the edge count of the longest path in the tree
 */
export function diameter(root) {
  // Lives outside `depth`, so every recursive call updates the same box.
  // Fresh on every call to diameter(), so repeated calls don't interfere.
  let best = 0;

  /**
   * Returns the depth (in nodes) of `current` to its caller, and along the
   * way records the best path that peaks at `current`.
   *
   * @param {object|null} current
   * @returns {number} node count of the deepest path under and including `current`
   */
  const depth = (current) => {
    if (current === null) return 0; // empty subtree: 0 nodes deep

    // Children first — this is a post-order walk (dsa/24).
    const leftDepth = depth(current.left);
    const rightDepth = depth(current.right);

    // The job done ON THE SIDE: the longest path whose topmost node is
    // `current` goes leftDepth edges down the left and rightDepth down the
    // right. It may or may not beat what we've seen elsewhere.
    if (leftDepth + rightDepth > best) best = leftDepth + rightDepth;

    // The job REPORTED UPWARD: my parent doesn't care about paths that turn
    // a corner inside me — it can only continue straight down one side.
    return 1 + Math.max(leftDepth, rightDepth);
  };

  depth(root);
  return best;
}
