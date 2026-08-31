# 24 — Tree Traversals

A binary tree is a value with (up to) two smaller trees hanging off it. There
are four classic ways to visit every node and collect its value, and three of
them differ by *a single line's position*. Write all four.

Nodes look like `{ value, left, right }`; a missing child is `null`, and an
empty tree is `null` itself. Each function returns one **flat** array of
values — not an array of levels, not the nodes.

## Signature

```js
/**
 * A node: { value: number, left: Node|null, right: Node|null }
 */

/** @param {Node|null} root @returns {number[]} me, then left subtree, then right */
export function preorder(root) { ... }

/** @param {Node|null} root @returns {number[]} left subtree, then me, then right */
export function inorder(root) { ... }

/** @param {Node|null} root @returns {number[]} left subtree, then right, then me */
export function postorder(root) { ... }

/** @param {Node|null} root @returns {number[]} top row down, left to right */
export function levelOrder(root) { ... }
```

## Worked examples

Every row below uses this tree:

```
        1
      /   \
     2     3
    / \   / \
   4   5 6   7
```

| Input | Output | Why |
|-------|--------|-----|
| `preorder(root)` | `[1, 2, 4, 5, 3, 6, 7]` | print yourself *before* descending |
| `inorder(root)` | `[4, 2, 5, 1, 6, 3, 7]` | print yourself *between* the two descents |
| `postorder(root)` | `[4, 5, 2, 6, 7, 3, 1]` | print yourself *after* both descents |
| `levelOrder(root)` | `[1, 2, 3, 4, 5, 6, 7]` | row by row — not depth-first at all |

## Constraints & edge cases

- `root` may be `null` (the empty tree). All four must return `[]`.
- A node may have a left child and no right child, or the other way round —
  `null` checks go on *each* child, not on "has children".
- Values may repeat; every occurrence must appear in the output.
- The tree must not be modified — you are reading it, not rearranging it.
- Target complexity: O(n) time and O(n) space for the output; the DFS walks
  add O(h) stack space for a tree of height h, `levelOrder` adds O(w) for the
  widest row.

## Hints (take them one at a time!)

1. Three of these are the same three-line function. Write `preorder` first,
   then stare at where the `push` sits relative to the two recursive calls.
   That's the *only* thing pre/in/post disagree about.
2. `levelOrder` is a different animal: recursion naturally goes *deep*, and
   you need *wide*. Reach for a queue — put the root in, then repeatedly take
   one out, record it, and put its children in the back of the line.
3. For the DFS three: `if (n === null) return;` then `walk(n.left)`,
   `out.push(n.value)`, `walk(n.right)` in whichever order the name asks for.
   For `levelOrder`, use a plain array as the queue plus a moving `head`
   index (`queue[head++]`) instead of `shift()` — see dsa/15 for why.

## Run it

```
node --test dsa/24-tree-traversals/attempt.test.js
```
