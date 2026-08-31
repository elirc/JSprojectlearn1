# 26 — Max Depth and Diameter

Two measurements of the same tree, teaching one move: **let each node return
a fact upward, and let the parent build its own fact out of it.** dsa/25
pushed information *down* the recursion; this is the other direction.

## Signature

```js
/**
 * A node: { value: number, left: Node|null, right: Node|null }
 */

/** @param {Node|null} root @returns {number} NODES on the longest root-to-leaf path */
export function maxDepth(root) { ... }

/** @param {Node|null} root @returns {number} EDGES on the longest path between any two nodes */
export function diameter(root) { ... }
```

**Mind the units.** `maxDepth` counts **nodes**; `diameter` counts **edges**.
That mismatch is the conventional definition of each, and it is where every
off-by-one here comes from.

## Worked examples

```
   tree A                tree C

        1                    1
      /   \                 /
     2     3               2
    / \   / \             / \
   4   5 6   7           3   4
                        /     \
                       5       6
                      /         \
                     7           8
```

| Input | Output | Why |
|-------|--------|-----|
| `maxDepth(A)` | `3` | 1 → 2 → 4 is three **nodes** |
| `diameter(A)` | `4` | 4 → 2 → 1 → 3 → 6 is four **edges** (five nodes) |
| `maxDepth(C)` | `5` | 1 → 2 → 3 → 5 → 7 |
| `diameter(C)` | `6` | 7 → 5 → 3 → 2 → 4 → 6 → 8 — it never touches the root |

That last row is the point of the problem: tree C's root has one child, so
any path through it is at most 4 edges. The real answer lives below.

## Constraints & edge cases

- `null` (empty tree): both are `0`.
- A single node: `maxDepth` is `1` (one node), `diameter` is `0` (no edges).
  Two nodes: `maxDepth` is `2`, `diameter` is `1`.
- The longest path may or may not pass through the root; the tests have both.
- Values are irrelevant — only the shape matters. Neither function may
  modify the tree.
- Target complexity: O(n) time and O(h) space for **both**. In particular,
  `diameter` must not be O(n²).

## Hints (take them one at a time!)

1. `maxDepth` first — three lines: an empty tree is 0, otherwise you are 1
   plus the deeper of your two children. Trust the recursion (dsa/21).
2. For `diameter`, ask what the longest path looks like *at its highest
   point*. Every path has one topmost node, and from there it runs down-left
   as far as it can and down-right as far as it can — so the best path
   topped by `n` is `depth(n.left) + depth(n.right)` edges. The answer is the
   biggest of those over all `n`.
3. Calling `maxDepth` at every node is correct but O(n²): each call re-walks
   a subtree you already walked. Instead do one post-order pass with a helper
   that **returns the depth to its parent** while **updating a `best`
   variable declared outside it**. Two jobs, one walk.

## Run it

```
node --test dsa/26-max-depth-and-diameter/attempt.test.js
```
