# 📘 Learning Guide: Validate BST

Some facts a node needs can only come from its ancestors — so hand them down.

## 1. The problem in plain words

You're given a binary tree. Decide whether it obeys the binary-search-tree
rule everywhere, and return `true` or `false`.

The rule: for **every** node, all values in its left subtree are strictly
smaller than it, and all values in its right subtree are strictly bigger.
Not just its children — its entire left and right *subtrees*, all the way
down. Equal values count as a violation.

That word "entire" is the whole problem. If the rule were only about
immediate children, this would be a five-line warm-up.

## 2. Concepts you need first

**What a BST is for.** dsa/19 taught binary search on a sorted array: look at
the middle, and because the array is sorted you can throw away half of it.
A binary search tree is that idea built out of nodes instead of indices. The
root is the "middle"; if your target is smaller you go left and discard the
entire right subtree, unexamined. That's O(log n) lookups on a balanced tree
— but *only* if the ordering promise actually holds. Validating a BST is
checking that the discarding is safe.

**Trees and traversals (dsa/24).** You already know how to visit every node
with a recursive walk and a `null` base case. You'll reuse that skeleton
exactly; the new part is what you carry along while walking.

**Recursion carries state in two directions.** This is the idea worth
naming, because it's the difference between the two tree problems around it:

- **Down** — arguments. Facts the caller knows that the callee can't work out
  for itself. *This problem.*
- **Up** — return values. Facts the callee computes that the caller needs.
  (dsa/26, next, is entirely about that direction.)

**±Infinity as sentinels.** JavaScript's `Infinity` and `-Infinity` are real
numbers you can compare against: `x < Infinity` is true for every finite `x`.
They let you say "no upper bound yet" without a special case.

## 3. How to think about it

Start by asking the wrong question, because it's instructive.

**Wrong question:** "Is each node bigger than its left child and smaller than
its right child?" Here's the tree that punishes you:

```
      5
    /   \
   1     6
        / \
       3   7
```

1 < 5 ✓. 6 > 5 ✓. 3 < 6 ✓. 7 > 6 ✓. Every local check passes. And yet: 3 is
sitting inside 5's right subtree, where nothing smaller than 5 is allowed.
Ask node 3 whether it's in the right place and it cannot tell you — it can
see 6 above it, but not 5. **It has no idea what promises were made on its
behalf higher up.**

**Right question:** "What range of values is allowed *at this spot*?"

Walk down from the root and watch the range shrink:

```
at 5:  allowed (-∞, ∞)      5 fits.
  go left  → the ceiling becomes 5
at 1:  allowed (-∞, 5)      1 fits.
  go right → the floor becomes 5
at 6:  allowed (5, ∞)       6 fits.
  go left  → keep the floor 5, ceiling becomes 6
at 3:  allowed (5, 6)       3 does NOT fit → false
```

Look at the line for node 3. Its window is `(5, 6)` — the floor came from its
grandparent two levels up, the ceiling from its parent. Node 3 never had to
look upward; the constraint was *delivered to it*.

And notice how each step composes:

- going **left** from `v`: floor unchanged, ceiling becomes `v`
- going **right** from `v`: ceiling unchanged, floor becomes `v`

The window only ever narrows. That's why a single pass is enough.

## 4. Common wrong turns

- **Checking parent against child only.** The trap tree above. If your
  solution never passes a bound as an argument, it is wrong — no amount of
  extra `if`s at a single node can fix it, because the missing information
  isn't at that node.
- **Swapping the bounds when you descend.** `check(n.left, n.value, max)`
  looks symmetric and is backwards. Going left tightens the **ceiling**;
  going right raises the **floor**. Everyone does this once.
- **Using `<` where you need `<=`.** With `if (v <= min || v >= max) return
  false`, duplicates fail automatically — which is what the spec wants. With
  strict-only comparisons the other way round, `node(2, node(2))` sails
  through.
- **Fixing the trap by checking grandchildren too.** People sometimes patch
  the naive version by also comparing against grandparents. It fails on
  great-grandchildren. There is no fixed lookahead that works; you need the
  accumulated bound.
- **Only checking the left subtree's maximum against the node.** A tempting
  variant: recursively return each subtree's min and max, then check. That
  one actually *works* (it's the up-the-recursion version, and it's a fine
  answer), but it's more bookkeeping — three values returned per node instead
  of one boolean — and it's easy to get wrong on empty subtrees.
- **Sorting an inorder walk to compare.** If you already have the inorder
  array, sorting it costs O(n log n) to learn what one linear scan of
  adjacent pairs would tell you.

## 5. The solution, step by step

**Step 1 — the public function delegates.** It exists only to supply the
starting window.

```js
export function isValidBST(root) {
  return check(root, -Infinity, Infinity);
}
```

**Step 2 — the helper's contract.** Write this down before you write the
body: `check(current, min, max)` answers *"is this subtree a valid BST whose
every value lies strictly between min and max?"* Every line below follows
from that sentence.

**Step 3 — base case.** `if (current === null) return true;` — an empty
subtree has no values, so nothing in it can escape the window. This also
handles every missing child, so no `if (n.left)` guards anywhere.

**Step 4 — check yourself against the inherited window.**

```js
if (current.value <= min || current.value >= max) return false;
```

Strict on both sides. That single line is what rejects duplicates.

**Step 5 — descend with narrowed windows.**

```js
return (
  check(current.left, min, current.value) &&
  check(current.right, current.value, max)
);
```

Left: same floor, new ceiling. Right: new floor, same ceiling. The `&&`
short-circuits, so the first violation ends the walk.

Run the tests: `node --test dsa/25-validate-bst/attempt.test.js`.

## 6. Complexity, gently

**Time O(n).** Each node is visited once, and each visit does two comparisons
and hands off to two calls — constant work per node. You cannot do better:
a violation could be hiding at any node, so you have to look at all of them.
(The short-circuit means invalid trees often finish early, but "often" isn't
a complexity claim.)

**Space O(h)** where `h` is the height, because the recursion holds one frame
per level you're currently inside — not one per node. Concretely:

- balanced tree of 1,000,000 nodes → about 20 frames. Nothing.
- skewed chain of 1,000,000 nodes → 1,000,000 frames, and Node will throw
  `RangeError: Maximum call stack size exceeded`.

That gap between O(log n) and O(n) *for the same code* is the recurring
lesson of every tree chapter: the algorithm is fine, the shape of the data
decides what it costs.

## 7. Words you learned

- **Binary search tree (BST)** — a binary tree where every left subtree is
  entirely smaller than its root and every right subtree entirely bigger.
- **The BST invariant** — that promise, stated as a property that must hold
  at every node, not just some.
- **Invariant** — something true before and after every step of an algorithm.
  Half of debugging is naming the invariant you accidentally broke.
- **Passing constraints down** — giving a recursive call the context it
  cannot derive on its own. The technique of this problem.
- **Sentinel value** — a stand-in like `-Infinity` that makes "no bound"
  behave like an ordinary bound, so you can delete a branch.
- **Short-circuit evaluation** — `a && b` skips `b` when `a` is false; here
  it stops the walk at the first violation.
- **Strict vs non-strict comparison** — `<` vs `<=`, the one-character
  difference between rejecting and accepting duplicates.

## 8. Variations to try

1. **Solve it with dsa/24's inorder walk.** An inorder traversal of a valid
   BST comes out sorted, so collect the values and check that each is
   strictly greater than the one before. Then improve it: don't build the
   array at all — keep a single `prev` variable and compare as you go.
2. **Solve it bottom-up.** Have the helper return `{ min, max, valid }` for
   each subtree instead of taking bounds as arguments. Compare the two
   versions side by side — same O(n), very different feel. That's the dsa/26
   direction.
3. **Return *where* it broke** instead of a boolean: the first offending
   node's value. Useful in real code, and it makes you think about what
   "first" means for a recursive walk.
4. **Write `insertBST(root, value)`** that adds a value in the right place,
   then generate a tree by inserting a shuffled list and validate it. You've
   now built the data structure you were only inspecting.
5. **Allow duplicates on one side.** Some BST definitions permit `<=` on the
   left. Change one comparison and one test, and notice how the "strictly
   between" window becomes half-open.
