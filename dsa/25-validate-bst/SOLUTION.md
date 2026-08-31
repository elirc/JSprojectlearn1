# Solution walkthrough — Validate BST

## The naive approach and its cost

Almost everybody writes this first, and it looks obviously right:

```js
function isValidBST(n) {
  if (n === null) return true;
  if (n.left && n.left.value >= n.value) return false;
  if (n.right && n.right.value <= n.value) return false;
  return isValidBST(n.left) && isValidBST(n.right);
}
```

It is O(n), it handles duplicates, it handles the empty tree, and it is
**wrong**. Feed it this:

```
      5
    /   \
   1     6
        / \
       3   7
```

Every check it performs passes: 1 < 5, 6 > 5, 3 < 6, 7 > 6. It returns
`true`. But 3 is in 5's right subtree while being smaller than 5 — and that
breaks the only thing a BST is *for*. Search this tree for 3: at the root,
3 < 5, so a BST search confidently turns **left**, finds 1, runs out of tree,
and reports "not found." The value was right there, two steps to the right.
The naive check declared a tree valid that cannot be searched.

The cost of the naive approach is not time. It's correctness — and it fails
on exactly the inputs an interviewer will hand you.

## The insight

**A node cannot judge itself.** Whether 3 is allowed to be here depends on
every ancestor above it, and 3 has no pointer back up to them.

So don't ask the node. Ask the *path that got you there*. Every time you
descend, you learn something permanent about the range of values allowed
below:

- Stepping **left** from a node with value `v`: everything below must be
  `< v`. That's a new ceiling.
- Stepping **right** from `v`: everything below must be `> v`. That's a new
  floor.

Neither step ever *loosens* the other bound — turning left from 5 into 1's
subtree keeps whatever floor 5 itself was under. So each node arrives with an
open interval `(min, max)` accumulated from its whole ancestry, and the check
becomes one line: is my value strictly inside it?

That is the technique this problem exists to teach: **passing constraints
down a recursion**. dsa/26 will teach you the opposite direction — returning
facts back *up*.

## The approach, step by step

1. **Public function is a one-liner.** `return check(root, -Infinity,
   Infinity);` — the root inherits no constraints, so its window is the whole
   number line. Using ±`Infinity` beats passing `null` sentinels because you
   don't then need "is this bound absent?" branches in the hot path.
2. **Base case.** `if (current === null) return true;`. An empty subtree has
   no values, so it cannot break any window. This one line also covers every
   missing child, so you never need `if (n.left)` guards.
3. **Check the window, strictly.**
   `if (current.value <= min || current.value >= max) return false;`
   The `<=` and `>=` are doing double duty: they enforce the ancestor bounds
   *and* they reject duplicates, because an equal value fails a strict
   comparison against its own ancestor.
4. **Recurse with tightened bounds.**
   `check(current.left, min, current.value) && check(current.right,
   current.value, max)`. Left keeps the inherited floor and gets a new
   ceiling; right keeps the inherited ceiling and gets a new floor. Write
   those two lines slowly — swapping `min`/`max` here is the classic bug and
   it still passes the small tests.
5. **Let `&&` short-circuit.** If the left subtree already failed, there is
   no reason to walk the right one.

Trace the trap tree: `check(5, -∞, ∞)` ✓ → `check(6, 5, ∞)` ✓ →
`check(3, 5, 6)` → 3 ≤ 5 → **false**. The floor of 5, set two levels up,
travelled down with us and caught it.

## Complexity

- **Time O(n).** Every node is visited at most once, and each visit is two
  comparisons plus two calls. The short-circuit can only make it faster; it
  never makes it slower.
- **Space O(h)**, where `h` is the height — one stack frame per level you're
  currently inside. For a balanced tree that's O(log n) (about 20 frames for
  a million nodes). For a skewed tree it degrades to O(n), which is a genuine
  stack-overflow risk on very long chains; the iterative inorder walk in the
  variations avoids it.
- There is no O(1)-space version worth writing here. You could compare
  against ±`Infinity` sentinels in an iterative inorder walk with an explicit
  stack, but that just moves the O(h) from the call stack to your own array.

## Common mistakes

- **Comparing only parent to child.** The whole point of the problem. If your
  function never passes a bound down, it is wrong no matter how it looks.
- **Swapping the bounds on descent.** `check(node.left, node.value, max)`
  reads fine and is backwards. Left tightens the *ceiling*; right raises the
  *floor*. Say it out loud before you type it.
- **Using `<` and `>` instead of `<=` and `>=`.** Then `node(2, node(2))`
  passes and duplicates slip through. Both duplicate tests exist for this.
- **Passing `null` as "no bound" and forgetting a branch.** If you go that
  route you need `(min === null || value > min)` on *both* sides; miss one
  and half the tree is unchecked. `-Infinity` / `Infinity` removes the
  branches entirely.
- **Collecting an inorder array and then sorting it to compare.** Scanning
  adjacent pairs with `<` is a legitimate alternative (see the variations);
  sorting a copy is O(n log n) to discover something one linear scan already
  told you.
