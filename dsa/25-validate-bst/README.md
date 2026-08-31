# 25 — Validate BST

A **binary search tree** is a binary tree with one extra promise: everything
to the left of a node is smaller than it, everything to the right is bigger.
That promise is what makes a BST searchable in O(log n) — and it is easy to
break by accident.

Given a tree of `{ value, left, right }` nodes, return `true` if it keeps the
promise everywhere and `false` if it breaks it anywhere.

## Signature

```js
/**
 * A node: { value: number, left: Node|null, right: Node|null }
 *
 * @param {Node|null} root - the root node, or null for an empty tree
 * @returns {boolean} true if the whole tree is a valid binary search tree
 */
export function isValidBST(root) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `isValidBST(node(2, node(1), node(3)))` | `true` | 1 < 2 < 3 |
| `isValidBST(node(5, node(1), node(6, node(3), node(7))))` | `false` | 3 sits in 5's **right** subtree but 3 < 5 |
| `isValidBST(node(2, node(2), node(3)))` | `false` | duplicates break the strict ordering |
| `isValidBST(null)` | `true` | an empty tree keeps every promise vacuously |

That second row is the whole problem, so look at it closely:

```
      5
    /   \
   1     6
        / \
       3   7
```

Check every parent against its own children and everything passes: 1 < 5 ✓,
6 > 5 ✓, 3 < 6 ✓, 7 > 6 ✓. And yet the tree is *not* a BST, because 3 lives
somewhere in 5's right subtree while being smaller than 5. **Checking parents
against children is not enough.**

## Constraints & edge cases

- `null` (the empty tree) is valid → `true`.
- A single node is always valid → `true`.
- The ordering is **strict**: left values must be `<` and right values must
  be `>`. Equal values anywhere make the tree invalid.
- The rule applies to whole *subtrees*, not just immediate children: every
  value in a node's left subtree must be smaller than that node, however deep.
- Values may be negative or zero. A skewed chain can be perfectly valid.
- The tree must not be modified.
- Target complexity: O(n) time, O(h) space for the recursion (h = height).

## Hints (take them one at a time!)

1. Write the two-line naive version first — compare each node with its left
   and right children — and then run it against the tree drawn above.
   Watching it confidently say `true` is the fastest way to understand what
   the problem is really asking.
2. A node deep in the tree can't judge itself. When you descend into 5's
   right subtree, *every* node down there is under an obligation it can't see
   from where it stands: "be bigger than 5." So carry the obligation with
   you — pass it down as an argument.
3. Write a helper `check(node, min, max)` meaning "is this subtree valid
   **and** are all its values strictly between `min` and `max`?" Start with
   `check(root, -Infinity, Infinity)`. Going left tightens the ceiling:
   `check(node.left, min, node.value)`. Going right raises the floor:
   `check(node.right, node.value, max)`.

## Run it

```
node --test dsa/25-validate-bst/attempt.test.js
```
