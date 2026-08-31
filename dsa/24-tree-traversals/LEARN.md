# 📘 Learning Guide: Tree Traversals

Four ways to walk a tree — and three of them are the same function.

## 1. The problem in plain words

Somebody hands you a tree of numbers. Produce a list of every value in it.

That sounds like it has one answer, but it has four useful ones, because a
tree has no obvious "first" and "next". An array does: index 0, then 1, then
2. A tree branches, so the moment you're at a node with two children you have
to *choose* an order, and different choices are useful for different jobs.

Your task: write `preorder`, `inorder`, `postorder`, and `levelOrder`, each
returning one flat array of values.

## 2. Concepts you need first

This is the track's first tree problem, so here is the whole vocabulary.

**A binary tree** is either nothing (`null`) or a **node**: a value plus two
smaller binary trees, called its **left** and **right children**. That
definition refers to itself — which is the single most important fact in this
section. A tree is *made of* smaller trees, so functions over trees are
naturally recursive, and `null` is naturally the base case.

In this track a node is a plain object:

```js
{ value: 7, left: someNodeOrNull, right: someNodeOrNull }
```

That's dsa/16's linked-list node with a second pointer. Nothing new.

The words, on a picture:

```
        1          <- root: the node nobody points at
      /   \
     2     3       <- 2 and 3 are children of 1; 1 is their parent
    / \     \
   4   5     7     <- leaves: nodes with no children
```

- **Subtree** — any node together with everything hanging below it. The
  subtree rooted at 2 is `{2, 4, 5}`. Every subtree is itself a whole tree,
  which is why you can hand it straight back to your own function.
- **Height / depth** — how many levels there are. The tree above has height 3.
- **Edge** — a parent→child link. A tree with n nodes has exactly n − 1
  edges (everyone but the root has one parent).
- **Balanced vs skewed** — every level roughly full (height ≈ log₂ n), versus
  one child per node (height = n). A skewed tree *is* a linked list in a
  tree costume, and the difference shows up in every space claim below.

**Depth-first (DFS)** means going all the way down one branch before trying
the next; **breadth-first (BFS)** means finishing the row you're on first.
Recursion gives you DFS for free — the call stack already works "most recent
first" (dsa/13's stack, invisible). BFS needs the opposite discipline, which
you supply with a queue (dsa/15).

## 3. How to think about it

Take the classic tree and one question: *when do I write down my own value?*

```
        1
      /   \
     2     3
    / \   / \
   4   5 6   7
```

Stand on node 2. You have three jobs — record yourself, deal with the left
subtree, deal with the right subtree — and three obvious orders:

- record, left, right → **preorder**
- left, record, right → **inorder**
- left, right, record → **postorder**

Trace preorder out loud: "I'm 1, write 1. Go left. I'm 2, write 2. Go left.
I'm 4, write 4, no children, done. Back at 2, go right: I'm 5, write 5, done.
2 is done, back at 1, go right..." → `1, 2, 4, 5, 3, 6, 7`.

Inorder on the same tree is `4, 2, 5, 1, 6, 3, 7` — look at 1, dead centre,
its whole left subtree before it and its whole right subtree after.
Postorder is `4, 5, 2, 6, 7, 3, 1` — the root last, every node after both its
children. Each order is good at something:

| Order | Comes out as | Good for |
|-------|--------------|----------|
| preorder | parent before children | copying a tree, printing an outline |
| inorder | left-to-right by position | reading a BST in sorted order (dsa/25) |
| postorder | children before parent | freeing/summing/measuring bottom-up (dsa/26) |
| level order | row by row | shortest-path-ish questions, printing by depth |

Level order is the odd one out. You cannot get `1, 2, 3, 4, 5, 6, 7` by
recursing, because recursion commits to finishing node 2's *entire* subtree
before it looks at 3. You need a waiting line:

```
queue: [1]            take 1 → out: 1        push 2, 3
queue: [2, 3]         take 2 → out: 1 2      push 4, 5
queue: [3, 4, 5]      take 3 → out: 1 2 3    push 6, 7
queue: [4, 5, 6, 7]   take 4 → out: 1 2 3 4  (no children)
...                   → 1 2 3 4 5 6 7
```

Children always join the **back** of the line, so the whole current row gets
served before any of the next row. That's it — that's BFS.

## 4. Common wrong turns

- **Putting the `out` array inside the recursive helper.** Each call then
  builds its own array and throws it away. `out` lives in the outer function;
  the helper closes over it.
- **Checking `if (n.left)` instead of `if (n === null) return`.** Both work,
  but the second handles the empty tree, the missing children, and the bottom
  of every branch in one line. Guard on entry, not on descent.
- **Writing `levelOrder` recursively "for consistency".** You end up passing
  a depth down and bucketing by it — more code, worse complexity, idea
  hidden. Use the queue.
- **Using `shift()` as your dequeue.** It removes the front by moving every
  other element down a slot: O(n) per call, O(n²) for the walk. A `head`
  index you only increment is O(1) — dsa/15's whole point.
- **Pushing `null` children into the queue.** Then the next iteration reads
  `null.value` and crashes. Filter on the way in.
- **Believing postorder is preorder reversed.** On a straight chain they
  happen to match, which is a trap. On the classic tree, reversed preorder is
  `7, 6, 3, 5, 4, 2, 1`; postorder is `4, 5, 2, 6, 7, 3, 1`.

## 5. The solution, step by step

**Step 1 — the DFS skeleton.** Outer function owns the output; inner function
owns the walking.

```js
export function preorder(root) {
  const out = [];
  const walk = (n) => {
    if (n === null) return; // base case
    // ...three lines go here...
  };
  walk(root);
  return out;
}
```

**Step 2 — fill in the three lines** in the order the name asks for:
`out.push(n.value)` before, between, or after `walk(n.left)` and
`walk(n.right)`.

**Step 3 — copy the whole thing twice** and move the `push`. Yes, really.
Three explicit five-line functions beat one clever parameterised one here,
because the point of this problem is to *see* the difference.

**Step 4 — `levelOrder`: guard, then queue.**

```js
if (root === null) return [];
const queue = [root];
let head = 0;
```

**Step 5 — serve the line.** While `head < queue.length`: take
`queue[head++]`, push its value into `out`, then push each non-null child
onto the back of `queue`. The array grows at the back while `head` crawls
along the front; when they meet, every node has been served.

Run the tests: `node --test dsa/24-tree-traversals/attempt.test.js`.

## 6. Complexity, gently

All four are **O(n) time**. Each node gets taken off the stack or the queue
exactly once and pushed into `out` exactly once, so the work is proportional
to the node count and nothing else. There is no cleverness to find here —
you have to look at everything, so you look at everything once.

Space is where they differ, and the difference is real:

- The DFS three hold **O(h)** stack frames — one per level you're inside. A
  balanced million-node tree: ~20 frames, free. A skewed million-node tree:
  a million frames, and Node throws `RangeError: Maximum call stack size
  exceeded` long before that.
- `levelOrder` holds **O(w)** queue entries, `w` being the widest row — about
  n/2 on a perfect tree, but just 1 on a skewed one. BFS strolls through the
  case that kills DFS.

Both also pay **O(n)** for the answer itself, which nothing can avoid.

## 7. Words you learned

- **Binary tree** — nothing, or a value with a left and a right binary tree.
- **Node / root / leaf / parent / child** — one record; the top one; one with
  no children; the pointing one; the pointed-at one.
- **Subtree** — a node plus everything below it; itself a valid tree.
- **Height** — the number of levels; `h` in every complexity claim above.
  Skewed (h = n) versus balanced (h ≈ log₂ n) is the same code with wildly
  different memory behaviour.
- **DFS (depth-first search)** — finish a branch before starting the next;
  what recursion does for free.
- **BFS (breadth-first search)** — finish a row before going deeper; needs an
  explicit queue. On a tree that's **level order**, row by row.
- **Preorder / inorder / postorder** — record the node before / between /
  after its two descents.

## 8. Variations to try

1. Make `levelOrder` return an **array of levels** — `[[1], [2,3],
   [4,5,6,7]]`. The trick: before each pass, capture the current queue
   length; exactly that many nodes make up this row.
2. Write `preorder` **iteratively** with your own explicit stack (dsa/13).
   Push the root; loop: pop, record, then push right and *then* left. Why
   right before left?
3. Write `inorder` iteratively. Genuinely harder than preorder — you push a
   node, dive left, and come back to it later. Do it once and you'll never
   take recursion for granted again.
4. Add `countNodes(root)` and `sumValues(root)`. Three lines each, both
   postorder in disguise — a warm-up for dsa/26.
5. Write `rightSideView(root)`: the values you'd see standing to the right of
   the tree, i.e. the last node of each level.
