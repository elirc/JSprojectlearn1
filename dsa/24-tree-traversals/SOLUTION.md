# Solution walkthrough — Tree Traversals

## The naive approach and its cost

There isn't really a *slow* solution here — every traversal has to touch every
node, so O(n) is the floor and almost anything you write hits it. The naive
approach is instead a **structural** one: writing four unrelated functions,
each hand-rolled from scratch, each with its own null checks and its own
bugs. People do it, it works, and it teaches nothing.

The other naive move is trying to write `levelOrder` with recursion because
the other three used recursion. You can force it (recurse once per level, or
pass a depth down and bucket by depth), but you'll fight the language the
whole way: **recursion goes deep, and level order goes wide.** Reaching for
the wrong tool here costs you an hour and an O(n·h) algorithm.

## The insight

Two insights, one per family.

**For the DFS three:** a traversal is a walk plus a moment. The *walk* is
always the same — visit left subtree, visit right subtree, and stop at
`null`. All that changes is **when you record the node's own value**:

```js
out.push(n.value);  walk(n.left);      walk(n.right);      // preorder
walk(n.left);       out.push(n.value); walk(n.right);      // inorder
walk(n.left);       walk(n.right);     out.push(n.value);  // postorder
```

Three functions, one line moved twice. Reading them stacked like that is the
whole lesson — "pre/in/post" literally means *before / between / after the
descents*, and the names stop being arbitrary vocabulary.

**For BFS:** the call stack is a stack, and a stack always finishes the most
recent thing first — that is exactly what "go deep" means. To go wide you
need the *opposite* discipline: finish the oldest thing first. That's a
**queue**, and once you hold one, the algorithm is three lines: take from the
front, record it, put its children on the back.

## The approach, step by step

1. **Base case first.** `if (n === null) return;`. Every DFS walk starts
   here. It handles the empty tree, missing children, and the bottom of every
   branch all at once — which is why you never need `if (n.left)` guards.
2. **Write `preorder`.** An `out` array in the outer function, an inner
   `walk` that closes over it, `walk(root)`, `return out`.
3. **Copy it twice and move the `push`.** Resist the urge to be clever with a
   shared parameterised walker; three tiny explicit functions read better and
   this problem is about *seeing* the difference.
4. **`levelOrder`: guard the empty tree.** `if (root === null) return [];` —
   otherwise you'd seed the queue with `null`.
5. **Queue with a moving head.** `const queue = [root]; let head = 0;` then
   `while (head < queue.length)`. Take `queue[head++]`, push its value, and
   push each non-null child onto the back.
6. **Do not use `shift()`.** It works, but it re-indexes the entire array on
   every call — O(n) per removal, O(n²) overall. The moving index is O(1) and
   costs you one extra variable (dsa/15 made this same point about queues).

## Complexity

- **Time O(n)** for all four. Each node is reached once and pushed once. No
  node is ever revisited, because a tree has no cycles — every node has
  exactly one parent, so there is exactly one path to it. (That's the
  property dsa/27 will take away from you, and a `visited` set is the price.)
- **Space O(n)** for the output array — unavoidable, you're returning n
  values. On top of that:
  - the DFS three use **O(h)** call-stack frames, where `h` is the height:
    O(log n) for a balanced tree, but O(n) for a chain like a linked list.
    That's a real stack-overflow risk on skewed trees of ~10,000+ nodes.
  - `levelOrder` uses **O(w)** queue slots, where `w` is the widest row. For
    a perfect tree the bottom row is half the nodes, so that's O(n).

Note the trade: DFS is cheap on wide trees, BFS is cheap on deep ones. They
are not interchangeable at scale.

## Common mistakes

- **Returning the nodes instead of the values.** `out.push(n)` gives you an
  array of objects that `deepEqual` will happily *not* match against numbers.
- **Guarding the children instead of the entry.** `if (n.left) walk(n.left)`
  works, but then you also need a guard at the top for the empty tree, and
  you'll forget one. One `if (n === null) return;` covers everything.
- **Declaring `out` inside `walk`.** Then every recursive call gets a fresh
  empty array and you return `[]` (or just the root). `out` belongs to the
  outer function; `walk` closes over it.
- **`shift()` in the queue loop.** Correct answer, quadratic cost.
- **Enqueuing `null` children.** Then you'll `push(null.value)` and crash, or
  litter the output with `undefined`. Check before enqueuing, not after
  dequeuing.
- **Assuming a node has both children or neither.** The test with a single
  right child exists precisely because `n.left && n.right` style checks fail
  on it.
- **Confusing postorder with reverse preorder.** They coincide on a chain,
  which is why the chain tests can't catch this — but on the 7-node tree,
  preorder reversed is `[7,6,3,5,4,2,1]` and postorder is `[4,5,2,6,7,3,1]`.
  Different animals.
