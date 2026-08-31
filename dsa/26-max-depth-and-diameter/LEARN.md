# 📘 Learning Guide: Max Depth and Diameter

One walk, two jobs: report a number upward, and keep a running best on the side.

## 1. The problem in plain words

Write two measurements for a binary tree.

**`maxDepth(root)`** — how tall is it? Count the **nodes** on the longest path
from the root straight down to a leaf. Empty tree 0; a lone node 1.

**`diameter(root)`** — how *wide* is it? Find the longest path between any two
nodes and count its **edges**. It does not have to touch the root. Empty tree
0; a lone node 0, because one node has no edges.

Both are shape questions; the values never matter.

## 2. Concepts you need first

**Post-order (dsa/24).** "Children first, then me" is not just an output
order — it's the *shape of any computation whose answer at a node is built
from its children's answers*. Both functions here are post-order walks with
something more interesting than a `push` in the middle.

**Trusting the recursion (dsa/21).** `maxDepth(root.left)` is a call to a
function documented to return a tree's depth. That it happens to be the
function you're inside is irrelevant. If you catch yourself tracing four
levels deep on paper, stop — check the base case, check the input shrinks,
check the combining step, move on.

**Nodes vs edges.** A path visiting `k` nodes has `k − 1` edges. Depth is
conventionally counted in nodes, diameter in edges, and the whole world has
agreed to be inconsistent about it. Write the unit next to every number you
scribble, or you will lose an hour to a single off-by-one.

**A closure over a mutable variable.** A function declared inside another can
read and write the outer function's variables, and every recursive call
shares that one variable — so a deep call can report to the *top* without
threading it through every return value. That's how `best` will work.

**Kadane's split (dsa/03).** You've met the two-number trick: Kadane carried
"best subarray *ending here*" forward while separately recording "best
subarray *anywhere*". Here it's "deepest path *down from here*" carried up
and "longest path *anywhere*" recorded on the side.

## 3. How to think about it

### maxDepth

Ask a node: how deep are you? "Well, I'm one node. Below me, my deeper child
knows how deep *it* is. Add one." That's the whole function:

```
depth(null) = 0
depth(n)    = 1 + max(depth(n.left), depth(n.right))
```

### diameter

Start from a fact that collapses the problem: **every path in a tree has
exactly one highest node.** Walk along any path — you rise for a while, turn
around once, and descend. You can never turn twice, because a node has only
one parent to rise to.

So stop thinking about paths and start thinking about **turning points**.
There are exactly n of them, one per node, and the longest path turning at
node `n` is:

```
depth(n.left)  +  depth(n.right)      edges
```

Take tree C from the README:

```
        1
       /
      2
     / \
    3   4
   /     \
  5       6
 /         \
7           8
```

Now hand-trace the single post-order walk. Each node reports a **depth** to
its parent and proposes a **candidate** for `best`:

| node | leftDepth | rightDepth | candidate (l + r) | best so far | returns 1 + max |
|------|-----------|------------|-------------------|-------------|-----------------|
| 7 | 0 | 0 | 0 | 0 | 1 |
| 5 | 1 | 0 | 1 | 1 | 2 |
| 3 | 2 | 0 | 2 | 2 | 3 |
| 8 | 0 | 0 | 0 | 2 | 1 |
| 6 | 0 | 1 | 1 | 2 | 2 |
| 4 | 0 | 2 | 2 | 2 | 3 |
| 2 | 3 | 3 | **6** | **6** | 4 |
| 1 | 4 | 0 | 4 | 6 | 5 |

The answer 6 is decided at node **2**, not at the root: when the walk returns
to node 1 its candidate is only 4. Compute `depth(left) + depth(right)` at
the root and stop, and you'd answer 4.

Read the last column too — node 2 returns **4**, not 6. Its parent can only
continue straight down one side, so a bend inside 2 is useless to node 1.
Two numbers, two purposes.

## 4. Common wrong turns

- **Returning the sum instead of the max.** `return leftDepth + rightDepth`
  makes the helper report a bend as if it were a depth, and every ancestor
  inherits the lie. The return value must be `1 + Math.max(...)`.
- **Only checking the root.** `maxDepth(root.left) + maxDepth(root.right)` is
  a *candidate*, not the answer. Tree C exists to kill this.
- **Calling `maxDepth` inside the diameter recursion.** Correct and
  quadratic: each node gets re-measured once per ancestor. Write it if it
  helps you see the shape, then fold it into one pass.
- **Declaring `best` inside the helper** (each call gets its own, nothing
  accumulates) **or at module level** (the second call to `diameter` inherits
  the first one's answer). It belongs to `diameter`'s own scope.
- **Node/edge confusion.** `diameter(node(1))` giving 1 means you counted the
  node; `maxDepth(node(1))` giving 0 means you counted edges.
- **`return depth(root);`** out of muscle memory. The answer is `best`.

## 5. The solution, step by step

**Step 1 — `maxDepth`, in full.**

```js
export function maxDepth(root) {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

That's the entire function. The `null` base case also covers every missing
child, so no other guards are needed.

**Step 2 — `diameter`: the box on the side.** Inside `diameter`, before the
helper: `let best = 0;`. Starting at 0 is what makes the empty tree and the
single node come out right without special cases.

**Step 3 — write the helper's contract as a sentence:** *"`depth(current)`
returns how many nodes deep `current` is, and updates `best` along the way."*

**Step 4 — base case, then children first.**
`if (current === null) return 0;`, then `const leftDepth =
depth(current.left);` and the same for the right. Post-order, dsa/24's shape.

**Step 5 — do the side job, then the up job.**

```js
if (leftDepth + rightDepth > best) best = leftDepth + rightDepth;
return 1 + Math.max(leftDepth, rightDepth);
```

Read those as two different questions: *"is the best bend I've ever seen
actually right here?"* and *"what can my parent build on?"*

**Step 6 — run it and hand back the side channel:** `depth(root);` then
`return best;` — you deliberately discard that return value.

Run the tests: `node --test dsa/26-max-depth-and-diameter/attempt.test.js`.

## 6. Complexity, gently

**Both are O(n) time.** Each node is entered once and does a fixed amount of
work: two comparisons, an addition, a `Math.max`.

The interesting comparison is the naive diameter, where every node is
re-measured once per ancestor, for a total of O(n × h):

| tree | n | naive O(n·h) | one-pass O(n) |
|------|---|--------------|---------------|
| balanced | 1,000,000 | ~20,000,000 | 1,000,000 |
| skewed chain | 10,000 | ~50,000,000 | 10,000 |

The balanced case is survivable; the skewed case turns a 20-millisecond
function into a 20-second one. And the fix cost nothing — the same walk, two
lines rearranged.

**Space O(h)** for both: one frame per *level* you're inside, not one per
node. A balanced million-node tree costs about 20 frames; a skewed one costs
a million and throws `RangeError: Maximum call stack size exceeded` — the
same shape-dependent cliff you met in dsa/24.

## 7. Words you learned

- **Depth / height** — how many levels a tree has; here counted in nodes.
- **Diameter** — the longest path between any two nodes; counted in edges,
  and free to avoid the root entirely.
- **Post-order computation** — computing a node's answer only after both
  children's answers exist; the shape of nearly every "measure a tree" job.
- **Returning information up** — the callee computes what the caller needs;
  the mirror of dsa/25's passing constraints down.
- **Closure / side channel** — an inner function writing to an outer
  function's variable, so `best` survives across every recursive call and
  carries an answer the return values can't.
- **Redundant recomputation** — the O(n²) smell of a recursion that calls
  another recursion over the same nodes. dsa/30 is built on noticing it.

## 8. Variations to try

1. Make `diameter` return the **path itself**, not just its length. Each node
   now reports its deepest *path* upward — and you'll feel immediately why
   returning a single number was nice.
2. Write `maxDepth` **iteratively** with dsa/24's level-order queue: count
   the rows. Bonus: it can't blow the call stack on a skewed tree.
3. Write `isBalanced(root)` — true when every node's subtrees differ in depth
   by at most 1. Naively O(n²) for the same reason diameter was; do it in one
   pass by returning `-1` upward as an "already unbalanced" flag.
4. Write `minDepth(root)`: nodes on the shortest root-to-**leaf** path. It is
   *not* `1 + min(left, right)` — think about a node with one child, then
   about why BFS answers this faster than DFS.
5. Generalise `diameter` to an **n-ary tree** whose nodes have a `children`
   array. The turning-point idea survives untouched; you just need the two
   deepest children instead of "left and right."
