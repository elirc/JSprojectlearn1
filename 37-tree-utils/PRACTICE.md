# 🏋️ Practice: Tree Utils

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The empty tree (warm-up)

Nothing in `tree.test.js` covers "no rows at all", which is what every real list looks like on day one. Add a test asserting that `buildTree([])` is `[]`, `renderIndented([])` is the empty string `''`, `flattenTree([])` is `[]`, and `[...walkTree([])]` is `[]`. Then add one more assertion: `buildTree(ROWS)` returns roots in the order the rows appeared — ids `[1, 4]`.

What it practices: checking that recursive code needs no special "empty" branch, and pinning down ordering promises before someone accidentally changes them.

Hint: all four are the *base case* of the recursion — a `for` loop over an empty array simply never runs, and `[].join('\n')` is `''`.

### ⭐⭐ 2. findNode — search with the walker (core)

Write `findNode(nodes, predicate)` in `tree.js`, returning the first node (depth-first) for which `predicate(node, depth)` is true, or `null` if none matches. Do not write a new recursion — `walkTree` already visits everything in the right order, so this is a `for...of` and an `if`. Check offline: `findNode(tree, (n) => n.text === 'Agreed')` has `id` 5, `findNode(tree, (n, d) => d === 2)` has `id` 3, and `findNode(tree, () => false)` is `null`.

What it practices: consumers deciding what a "visit" means — the generator's whole reason for existing.

Hint: `for (const { node, depth } of walkTree(nodes)) { if (predicate(node, depth)) return node; }` — and returning early stops the generator, so it never walks the rest.

### ⭐⭐ 3. treeStats (core)

Write `treeStats(nodes)` returning `{ nodes, roots, maxDepth, byDepth }`: the total node count, how many roots there are, the deepest depth reached, and a `Map` of depth → how many nodes sit at it. One pass over `walkTree`, no extra recursion. Check offline on the sample `ROWS`: `{ nodes: 5, roots: 2, maxDepth: 2 }` with `byDepth` entries `[[0,2],[1,2],[2,1]]`. Decide deliberately what `maxDepth` should be for an empty tree and write that down as a test too.

What it practices: computing several answers in a single traversal instead of walking the tree once per question.

Hint: `Math.max(maxDepth, depth)` as you go; `byDepth.set(depth, (byDepth.get(depth) ?? 0) + 1)` is project 26's `countBy` written by hand.

### ⭐⭐ 4. The rows that vanish anyway (core)

The README celebrates that orphans throw instead of disappearing — but there's a hole. Run `buildTree([{ id: 1, parentId: 2, text: 'a' }, { id: 2, parentId: 1, text: 'b' }])`: both parents exist, so nothing throws, and the result is `[]` — two rows silently gone, because they point at each other and neither is a root. Write a test proving that happens today, then make `buildTree` catch it: after linking, verify that walking the roots reaches every row, and throw a message naming how many were lost.

What it practices: hunting for the *second* silent-loss bug after the obvious one is fixed — and using a tool you already built (`walkTree`) as the check.

Hint: `[...walkTree(roots)].length` is the reachable count; compare it with `rows.length`. Careful: `walkTree` on a cycle would loop forever, but here the cycle is unreachable from any root, so walking the roots is safe.

### ⭐⭐⭐ 5. pathTo — the breadcrumb trail (challenge)

Write `pathTo(nodes, id)` returning the array of nodes from a root down to the node with that id, or `null` if it isn't there. This one *does* want its own recursion, because you need to unwind back up the tree carrying the answer. Check offline: `pathTo(tree, 3)` maps to texts `['First!', 'Actually...', 'Well, actually...']`, `pathTo(tree, 5)` gives `['Great post', 'Agreed']`, `pathTo(tree, 1)` gives just `['First!']`, and `pathTo(tree, 999)` is `null`.

What it practices: recursion that *builds a result on the way back out*, not just on the way in.

Hint: for each node — if it's the one, return `[node]`; otherwise recurse into `node.children`, and if that returns a path, return `[node, ...below]`. Falling off the end of the loop means `null`.

### ⭐⭐⭐ 6. pruneTree — filter that keeps ancestors (challenge)

Write `pruneTree(nodes, predicate)` returning a *new* tree containing every node that matches, plus every ancestor needed to reach one — exactly how a search box in a file explorer behaves. Nodes must not be mutated; build new objects. Check offline with `predicate = (n) => n.text.toLowerCase().includes('actually')`: `renderIndented(pruneTree(tree, predicate))` is `First!` / `  Actually...` / `    Well, actually...` — "First!" survives only as an ancestor, and the whole "Great post" branch is gone. Also check `pruneTree(tree, () => false)` is `[]`, and that the original `tree` still has all 5 nodes afterwards.

What it practices: the recursion order that trips people up — you must prune the children *first*, because whether a parent survives depends on the answer.

Hint: `const children = pruneTree(node.children, predicate);` then `if (predicate(node) || children.length > 0) kept.push({ ...node, children });`.

## Solutions

### 1. The empty tree

```js
test('an empty row list produces an empty everything', () => {
  assert.deepEqual(buildTree([]), []);
  assert.equal(renderIndented([]), '');
  assert.deepEqual(flattenTree([]), []);
  assert.deepEqual([...walkTree([])], []);
});

test('roots come back in row order', () => {
  assert.deepEqual(buildTree(ROWS).map((node) => node.id), [1, 4]);
});
```

WHY: every one of these passes with zero special-case code, because the empty array *is* the base case of both the loop in `buildTree` and the recursion in `walkTree`. That's the quiet advantage of self-similar code: the "nothing" case is not a case at all. The root-order test matters because `buildTree` iterates `nodeById.values()`, and Map preserves insertion order — a promise worth pinning before a refactor breaks it.

### 2. findNode

```js
export function findNode(nodes, predicate) {
  for (const { node, depth } of walkTree(nodes)) {
    if (predicate(node, depth)) return node;
  }
  return null;
}
```

WHY: no new traversal — the walker already knows how to visit every node in depth-first order, so "search" is a filter over its output. Passing `depth` to the predicate costs nothing and makes queries like "the first node at depth 2" possible. Because `walkTree` is a generator, returning early actually *stops* the walk: on a 10,000-node tree where the match is the third node, the other 9,997 are never visited. Verified by running: `'Agreed'` → id 5, `depth === 2` → id 3, never-true → `null`.

### 3. treeStats

```js
export function treeStats(nodes) {
  let count = 0;
  let maxDepth = 0;
  const byDepth = new Map();

  for (const { depth } of walkTree(nodes)) {
    count++;
    maxDepth = Math.max(maxDepth, depth);
    byDepth.set(depth, (byDepth.get(depth) ?? 0) + 1);
  }

  return { nodes: count, roots: nodes.length, maxDepth: count === 0 ? -1 : maxDepth, byDepth };
}
```

WHY: three questions, one traversal — on a big tree that's three times less work than calling three separate helpers, and it costs no extra readability because the walker hides the recursion. The `count === 0 ? -1 : maxDepth` line is a decision, not an accident: an empty tree has no depths at all, and returning `-1` says so instead of pretending there's a level 0. Verified by running: `{ nodes: 5, roots: 2, maxDepth: 2 }` and `byDepth` `[[0,2],[1,2],[2,1]]`.

### 4. Catching the cycle

```js
test('rows in a parent cycle are lost silently today', () => {
  const cycle = [
    { id: 1, parentId: 2, text: 'a' },
    { id: 2, parentId: 1, text: 'b' },
  ];
  assert.deepEqual(buildTree(cycle), []); // two rows in, zero out
});
```

```js
export function buildTree(rows) {
  const nodeById = new Map(rows.map((row) => [row.id, { ...row, children: [] }]));

  const roots = [];
  for (const node of nodeById.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodeById.get(node.parentId);
      if (!parent) {
        throw new Error(`Row ${node.id} has unknown parentId ${node.parentId}`);
      }
      parent.children.push(node);
    }
  }

  // Every row must be reachable from some root. If not, rows point at
  // each other in a cycle and would otherwise vanish without a word.
  const reachable = [...walkTree(roots)].length;
  if (reachable !== rows.length) {
    throw new Error(
      `${rows.length - reachable} row(s) are unreachable from any root — a parent cycle`,
    );
  }
  return roots;
}
```

WHY: the orphan check catches "my parent doesn't exist", but a cycle is "my parent exists and so does theirs, and none of us are roots" — a different failure that slipped through the same door the original bug used. Counting reachable nodes is a complete check with no new code, because `walkTree` already exists. Note the subtlety: walking a cycle *would* recurse forever, but nodes in a cycle are unreachable from the roots by definition, so the walk never touches them. Verified by running: the two-row cycle now throws `2 row(s) are unreachable from any root — a parent cycle`, and the normal `ROWS` still build fine.

### 5. pathTo

```js
export function pathTo(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const below = pathTo(node.children, id);
    if (below) return [node, ...below];
  }
  return null;
}
```

WHY: this is the shape of recursion the walker can't give you — the walker yields nodes *going down*, but a breadcrumb has to be assembled *coming back up*. Each frame asks its children "did you find it?", and only if they say yes does it add itself to the front. Returning `null` rather than `[]` for "not found" matters: an empty array is a valid path (from an empty tree), so `null` keeps "no path" distinguishable. Verified by running: id 3 → `['First!', 'Actually...', 'Well, actually...']`, id 5 → `['Great post', 'Agreed']`, id 999 → `null`.

### 6. pruneTree

```js
export function pruneTree(nodes, predicate) {
  const kept = [];
  for (const node of nodes) {
    const children = pruneTree(node.children, predicate); // children FIRST
    if (predicate(node) || children.length > 0) {
      kept.push({ ...node, children });                   // a NEW node
    }
  }
  return kept;
}
```

WHY: the order is everything. A parent's fate depends on whether any descendant survived, so the recursive call has to happen *before* the `if` — write the `if` first and matching grandchildren get thrown away with their non-matching parent. `{ ...node, children }` builds a fresh node with the pruned child list, so the input tree is untouched and you can run several different searches over the same tree. Verified by running: the `'actually'` search keeps only the `First!` chain, `() => false` gives `[]`, and the original `tree` still walks to 5 nodes afterwards.
