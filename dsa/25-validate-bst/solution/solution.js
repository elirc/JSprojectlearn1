/**
 * Validate a binary search tree by passing an allowed range DOWN the
 * recursion.
 *
 * The idea: a node cannot judge itself. When you step into 5's right
 * subtree, every node down there inherits an obligation it can no longer see
 * from where it stands — "be greater than 5" — so you carry the obligation
 * along as an argument.
 *
 * 1. Start with the widest possible window: (-Infinity, Infinity).
 * 2. At each node, reject immediately if its value escapes the window.
 * 3. Descend left with the ceiling tightened to this node's value.
 * 4. Descend right with the floor raised to this node's value.
 * 5. The empty tree satisfies every window, so null is true — the base case.
 *
 * The window is OPEN on both ends (strictly between), which is exactly what
 * makes duplicates invalid.
 *
 * Time  O(n): each node is visited once and does O(1) comparing.
 * Space O(h): one stack frame per level; O(log n) balanced, O(n) skewed.
 *
 * @param {object|null} root - the root node, or null for an empty tree
 * @returns {boolean} true if the tree keeps the BST ordering everywhere
 */
export function isValidBST(root) {
  return check(root, -Infinity, Infinity);
}

/**
 * Is `current` a valid BST whose every value lies strictly between
 * `min` and `max`?
 *
 * @param {object|null} current - subtree root, or null
 * @param {number} min - exclusive lower bound inherited from above
 * @param {number} max - exclusive upper bound inherited from above
 * @returns {boolean}
 */
function check(current, min, max) {
  // Base case: an empty subtree has no values, so no value can break the
  // window. Vacuously valid.
  if (current === null) return true;

  // Strict comparisons: `<=` and `>=` are what reject duplicates. Using
  // `<` / `>` here instead would quietly allow equal values through.
  if (current.value <= min || current.value >= max) return false;

  // Everything to the left must stay below me, but it also still owes the
  // floor I inherited — so the floor travels down unchanged and only the
  // ceiling tightens. The right side is the mirror image.
  //
  // `&&` short-circuits, so a violation found on the left stops the walk
  // instead of pointlessly checking the right subtree.
  return (
    check(current.left, min, current.value) &&
    check(current.right, current.value, max)
  );
}
