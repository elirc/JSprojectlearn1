# Solution walkthrough — Max Depth and Diameter

## The naive approach and its cost

`maxDepth` has no naive version worth worrying about — the three-line
recursion *is* the solution, and it's O(n).

`diameter` is where the naive answer bites. Once you spot that the longest
path through a node `n` is `maxDepth(n.left) + maxDepth(n.right)` edges, the
obvious move is to try every node:

```js
export function diameter(root) {
  if (root === null) return 0;
  const throughMe = maxDepth(root.left) + maxDepth(root.right);
  return Math.max(throughMe, diameter(root.left), diameter(root.right));
}
```

That is **correct**. It also re-walks the tree constantly: `maxDepth` at the
root touches all n nodes, then `diameter` recurses into each child and calls
`maxDepth` again on almost the same nodes. Each node ends up measured once
per ancestor, so the total is O(n × h) — O(n log n) balanced, but **O(n²)**
on a skewed chain, where 10,000 nodes cost ~50,000,000 visits.

The tell that you're in this trap: a recursion that calls *another* recursion
that walks the same nodes.

## The insight

Two insights stacked.

**First: every path has a single highest node.** Pick any path and walk it —
you go up for a while, turn around exactly once, and go down. (Turning twice
would need two parents.) So instead of enumerating paths, enumerate *turning
points* — one per node — and the longest path peaking at node `n` is

```
depth(n.left) + depth(n.right)      edges
```

where `depth` is measured in nodes. The node counts add to an edge count
because a subtree that is `d` nodes deep sits `d` edges below its parent's
position on the path.

**Second: one walk can do two jobs.** The naive version is slow only because
it asks for depths *after* the fact. But a post-order walk already computes
every node's depth on the way back up. So while you're there, evaluate the
candidate and stash the best one:

- **return upward:** `1 + max(leftDepth, rightDepth)` — what my parent needs,
  since a path continuing through my parent can only go straight down one of
  my sides.
- **record on the side:** `leftDepth + rightDepth` — the best path that turns
  around *at me*, which my parent cannot use but the final answer might.

Those are two different numbers, and mixing them up is the classic bug. The
return value is a *depth*; `best` is a *diameter*.

If that split feels familiar, it should: dsa/03's Kadane kept "best subarray
ending here" (carried forward) separate from "best subarray anywhere"
(recorded on the side). Same shape, different container.

## The approach, step by step

1. **`maxDepth`, base case.** `if (root === null) return 0;` — the empty
   tree has no nodes, so zero.
2. **`maxDepth`, recursive case.**
   `return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));`
   The `1` is you. `Math.max` picks the deeper side. Do not trace it; trust
   the contract (dsa/21).
3. **`diameter`: declare `best` outside the walk.** `let best = 0;` inside
   `diameter` but outside the helper. It has to survive across sibling calls,
   which a parameter cannot do. Declaring it fresh per call to `diameter`
   also keeps repeated calls independent.
4. **Write the helper's contract down first.** "`depth(current)` returns how
   many nodes deep `current` is, and updates `best` with the longest path
   turning around anywhere inside `current`." Every line follows from that.
5. **Post-order body.** Base case `if (current === null) return 0;`. Then
   `const leftDepth = depth(current.left);` and the same for right —
   children before self, dsa/24's postorder shape.
6. **Update, then return.**
   `if (leftDepth + rightDepth > best) best = leftDepth + rightDepth;`
   then `return 1 + Math.max(leftDepth, rightDepth);`
7. **Kick it off and hand back the side-channel.** `depth(root); return
   best;` — note you *discard* the return value of the outer call. The
   answer was never in the return value.

## Complexity

- **`maxDepth`: O(n) time.** One visit per node, constant work per visit.
- **`diameter`: O(n) time.** Same — one visit per node. The comparison and
  the two additions are O(1), so folding the diameter bookkeeping into the
  depth walk is free. That's the whole win over the O(n·h) naive version.
- **Space O(h)** for both, where `h` is the height: the call stack holds one
  frame per level you are currently inside, not one per node. Balanced tree
  of a million nodes → ~20 frames; skewed chain of a million → a million
  frames and a `RangeError`. `best` itself is one number, so O(1).

## Common mistakes

- **Returning `leftDepth + rightDepth` from the helper.** This is *the*
  mistake. It gives your parent a nonsense "depth" and quietly corrupts every
  measurement above it. The parent needs a straight-down depth; the sum is a
  bend, and a bend cannot be extended upward.
- **Mixing the units.** `maxDepth` in nodes, `diameter` in edges. If your
  single-node case returns 1 for the diameter, or your two-node case returns
  2, you've counted nodes where the spec wants edges.
- **Only measuring paths through the root.** `maxDepth(left) +
  maxDepth(right)` computed once, at the root, is a common "done!" moment.
  It fails on any tree whose deepest branching happens below the root — see
  tree C in the README.
- **Putting `best` inside the helper.** Then every call gets its own `best`
  starting at 0 and nothing accumulates. It belongs to `diameter`, and the
  helper closes over it.
- **Initialising `best` to `-Infinity`.** Start it at 0 and the empty tree
  and the lone node both fall out for free.
- **Calling `maxDepth` from inside the diameter walk.** Correct, quadratic.
  If you wrote it that way first, good — now make it one pass.
- **`return depth(root);` out of habit.** The answer lives in `best`.
