# 🏋️ Practice: Undo Tree

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Everything runs in node: `node --test 81-undo-tree/`.

## Exercises

### ⭐ 1. Every version you ended on (warm-up)
A **leaf** — a node with no children — is a version you stopped at: the tip of one of your timelines. Write `leaves(tree)` taking the plain object from `toTree()` and returning the leaf ids, so a UI could offer "you have 3 unfinished drafts". Check: after `commit('a')`, `commit('b')`, `undo()`, `commit('c')` the leaves are the ids of `'b'` and `'c'`; a brand-new history's only leaf is the root `[0]`; and committing under an existing leaf leaves the count unchanged.
What it practices: recursion over `toTree()`'s nested plain data — project 37's walker on a new tree, and proof that `toTree` earns its place in the API.
Hint: three lines. A node with no children is a leaf; otherwise the answer is every child's answer joined together (`flatMap`).

### ⭐⭐ 2. When did I write that? (core)
Add timestamps so a UI can show "3 versions in the last minute". Take `{ now = Date.now }` as a constructor option, store `createdAt` on every node, and add `recent(count = 5)` returning the newest versions **across all branches** (not just the current path), newest first, as `{id, state, createdAt}`. Check with a fake clock at 1000/1100/1200/1300: `recent(3)` gives the three newest ids in order, `recent(99)` returns everything without padding, and the root is always last.
What it practices: injecting the clock instead of calling `Date.now()` inside — the same testability move as projects 28, 43 and 41's TTL exercise.
Hint: `[...this.#nodes.values()].sort((a, b) => b.createdAt - a.createdAt)`. Add `|| b.id - a.id` as a tie-break, because a fast clock (or a fake one) can stamp two versions with the same millisecond, and a test that depends on sort luck is worse than no test.

### ⭐⭐ 3. Save the whole tree (core)
History that dies on refresh isn't history. Add `toJSON()` and a static `fromJSON(text)` that round-trip the entire tree — every branch, the current position, and `nextId` so restored histories never reuse an id. Then validate on the way in, because stored data is input (project 63): reject a payload with no nodes, a `currentId` that names no version, or a `childIds`/`parentId` pointing at a node that isn't there. Check: save a 4-node tree with a fork, restore it, and `toTree()` must be deepEqual to the original; the restored history must still `commit` correctly (the new id is 4, not a reused one); and three kinds of junk must throw.
What it practices: serializing a graph by relying on ids — and the referential-integrity check that catches half-written data before it corrupts the app.
Hint: `[...this.#nodes.values()]` is already plain data because nodes reference each other by id, not by object. Rebuild with `new Map(data.nodes.map((node) => [node.id, node]))`. A `static` method may read `#private` fields of its own class, so `history.#nodes = ...` is allowed inside `fromJSON`.

### ⭐⭐ 4. Prune a branch on purpose (core)
The README says the linear model's sin was deleting without asking — not deleting at all. Add `prune(id)` that removes a version *and all its descendants* and returns the new `size`. Three refusals, all `RangeError`: never the root, never the version you're standing on, and never an ancestor of it (that would delete the ground under your feet). Check: build a fork, prune one branch of two nodes (`size` 5 → 3), confirm the pruned ids are really gone, confirm all three refusals throw — and confirm `redo()` still works afterwards, even though the branch it pointed at was the one you deleted.
What it practices: deleting safely — which means deleting the whole subtree, fixing up the parent's `childIds`, and repairing any pointer that referred to the removed node.
Hint: collect the doomed nodes with a stack (`push` the children of whatever you pop) rather than recursion, then fix the parent: filter `childIds`, and if `redoChildId` named the pruned branch, point it at a surviving child or `null`. That last line is the one everybody forgets, and `redo()` crashes a week later.

### ⭐⭐⭐ 5. The route between two versions (challenge)
`jumpTo` teleports, but a real editor has to *replay* the moves — apply each patch, move the caret, animate. Write `pathBetween(history, fromId, toId)` returning `{ up, down }`: the ids you'd pass walking up to the fork the two versions share, then the ids you'd walk down to the target. The shared fork is the **lowest common ancestor**. Check on a tree with branches `b → b2` and `c → c2` under node 1: `pathBetween(history, b2, c2)` is `{up: [b2, b], down: [c, c2]}`, the reverse is the mirror image, a version to itself is `{up: [], down: []}`, and root-to-leaf is all `down`. Finish with the assertion that makes it real: walk the route with `undo()` and `redo(id)` and land exactly where `jumpTo` would have put you.
What it practices: the lowest-common-ancestor walk — the same computation `git merge-base` does to work out where two branches diverged.
Hint: list the ancestors of each version (each list starts with the version itself and ends at the root), then find the first id from one list that also appears in the other — that's the fork. Everything before it in the first list is `up`; everything before it in the second is `down`, reversed. Note `redo(id)` takes the *specific* child id, which is exactly why that argument exists.

### ⭐⭐⭐ 6. Patches instead of snapshots (challenge)
A thousand versions of a 10,000-character document is ten million characters of nearly identical text. Real editors store the **change** between versions instead. Write `makePatch(before, after)` producing `{at, remove, insert}` by trimming the common prefix and suffix, `applyPatch(text, patch)` to undo that, and a `PatchHistory` class with the same public feel (`commit`, `undo`, `redo`, `jumpTo`, `stateAt(id)`) that stores one patch per node and rebuilds any version by walking from the root. Check: `makePatch('Fast, safe, cheap', 'Fast, safe, cheap — pick two')` is `{at: 17, remove: 0, insert: ' — pick two'}`; the tagline scenario behaves exactly as before; and fuzz it — 200 random editing sessions of 12 edits each (inserts, deletions, truncations, with undos mixed in), asserting every version reconstructs to the exact string it was committed with.
What it practices: changing what a node *stores* without changing what the tree *means* — and a round-trip property test to prove the reconstruction is exact.
Hint: build it *on top of* `HistoryTree` rather than editing it — commit `null` as the state and keep a `Map` of id → patch alongside. Careful with the suffix scan: it must stop before it walks back into the prefix it already matched, or `'aa' → 'a'` counts the same character twice.

## Solutions

### 1. Every version you ended on
```js
export function leaves(tree) {
  if (tree.children.length === 0) return [tree.id];
  return tree.children.flatMap(leaves);
}
```
WHY: three lines, because `toTree()` already handed over the shape as plain nested data and because the function is shaped like the definition of a tree — a node, or some nodes each of which is a tree (project 37's rule, arriving unchanged). `flatMap` is what keeps it flat: `map` would give you nested arrays mirroring the tree. In a real editor this is the "unfinished drafts" list, and it's the number that makes the tree's value visible to a user who never asked for one — the original couldn't offer it, because its abandoned drafts no longer existed. Verified by running.

### 2. When did I write that?
```js
constructor(initialState, { now = Date.now } = {}) {
  this.#now = now;
  this.#nodes.set(0, { id: 0, state: initialState, parentId: null, childIds: [],
                       redoChildId: null, createdAt: now() });
}

// in commit():
this.#nodes.set(id, { id, state, parentId: parent.id, childIds: [],
                      redoChildId: null, createdAt: this.#now() });

recent(count = 5) {
  return [...this.#nodes.values()]
    .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)
    .slice(0, count)
    .map((node) => ({ id: node.id, state: node.state, createdAt: node.createdAt }));
}
```
WHY: `now` as an injected option is the difference between a test that asserts `1300` and a test that sleeps. The default keeps every existing call site working — `new HistoryTree('')` is unchanged — which is the same backwards-compatible-option pattern as project 41's TTL. `recent` deliberately ignores branches: "what did I write lately" is a question about time, not about the path you're on, and the tree is the only version of this structure that can answer it at all. The `|| b.id - a.id` tie-break makes the order deterministic when two versions share a millisecond, which a fake clock guarantees and a real one manages surprisingly often. Verified by running.

### 3. Save the whole tree
```js
toJSON() {
  return JSON.stringify({
    currentId: this.#currentId,
    nextId: this.#nextId,
    nodes: [...this.#nodes.values()],
  });
}

static fromJSON(text, { now = Date.now } = {}) {
  const data = JSON.parse(text);
  if (!Array.isArray(data?.nodes) || data.nodes.length === 0) throw new TypeError('Not a history');
  const ids = new Set(data.nodes.map((node) => node.id));
  if (!ids.has(data.currentId)) throw new TypeError('currentId points at no version');
  for (const node of data.nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) throw new TypeError(`Dangling parent on ${node.id}`);
    if (node.childIds.some((childId) => !ids.has(childId))) throw new TypeError(`Dangling child on ${node.id}`);
  }
  const history = new HistoryTree(null, { now });
  history.#nodes = new Map(data.nodes.map((node) => [node.id, node]));
  history.#currentId = data.currentId;
  history.#nextId = data.nextId;
  return history;
}
```
WHY: this is nearly free, and the reason is the design decision from LEARN section 2 — nodes refer to each other **by id**, so the tree is already plain data and `JSON.stringify` just works. Try the same trick on a structure where nodes hold each other's objects and you get either infinite recursion or a file full of duplicated subtrees. Saving `nextId` matters more than it looks: restore without it and the next commit reuses an id, so a `jumpTo` bookmark from before the save silently lands on a different version. The integrity checks are project 64's dangling-reference lesson: a half-written file should fail loudly at load, not produce a tree that half-works. Verified by running: a 4-node forked tree round-trips deep-equal, keeps working afterwards, and three kinds of junk throw.

### 4. Prune a branch on purpose
```js
prune(id) {
  const node = this.#nodes.get(id);
  if (!node) throw new RangeError(`No such version: ${id}`);
  if (node.parentId === null) throw new RangeError('The root cannot be pruned');
  if (this.path().includes(id)) throw new RangeError('Cannot prune the branch you are standing on');

  const doomed = [id];
  while (doomed.length > 0) {
    const victim = this.#nodes.get(doomed.pop());
    doomed.push(...victim.childIds);   // children go too, and their children
    this.#nodes.delete(victim.id);
  }

  const parent = this.#nodes.get(node.parentId);
  parent.childIds = parent.childIds.filter((childId) => childId !== id);
  if (parent.redoChildId === id) parent.redoChildId = parent.childIds.at(-1) ?? null;
  return this.size;
}
```
WHY: `this.path().includes(id)` is one line covering two refusals at once — you can't prune where you stand, and you can't prune anything above you, because both are on the path from the root to the present. The stack loop deletes the whole subtree without recursion; forget the descendants and you leave orphans whose `parentId` points at nothing, which is exactly the corruption exercise 3's loader was written to detect. And the `redoChildId` repair is the line that separates a working `prune` from a time bomb: the parent may still be pointing at the branch you just deleted, and `redo()` would hand back `undefined` days later. Deleting is fine when the user *asked*; deleting badly is what leaves the structure lying. Verified by running: size 5 → 3, all three refusals throw, and `redo()` still works.

### 5. The route between two versions
```js
export function pathBetween(history, fromId, toId) {
  const ancestors = (id) => {
    const ids = [];
    let current = id;
    while (current !== null) { ids.push(current); current = history.node(current).parentId; }
    return ids;                                   // [self, parent, ..., root]
  };
  const fromLine = ancestors(fromId);
  const toLine = ancestors(toId);
  const meeting = fromLine.find((id) => toLine.includes(id)); // lowest common ancestor
  return {
    up: fromLine.slice(0, fromLine.indexOf(meeting)),
    down: toLine.slice(0, toLine.indexOf(meeting)).reverse(),
  };
}
```
WHY: both lines end at the root, so they *must* share something — the first shared id, scanning upwards from `fromId`, is the lowest one, and there's no need to compute depths or walk in lockstep. Note this is a free function using only the public `node(id)`: the tree exposed enough to make new algorithms possible without opening up its internals, which is what a good API boundary looks like. The final check in the test is the one that proves it: walking `up` with `undo()` and `down` with `redo(id)` lands on exactly the version `jumpTo` would have reached — the same destination by two very different roads. (`git merge-base` computes the same fork for the same reason.) Verified by running.

### 6. Patches instead of snapshots
```js
export function makePatch(before, after) {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix &&
         before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  return { at: prefix, remove: before.length - prefix - suffix, insert: after.slice(prefix, after.length - suffix) };
}

export function applyPatch(text, patch) {
  return text.slice(0, patch.at) + patch.insert + text.slice(patch.at + patch.remove);
}

export class PatchHistory {
  #history = new HistoryTree(null);   // the SHAPE, unchanged
  #patches = new Map();               // node id -> the patch from its parent
  #rootState;

  constructor(initialState) { this.#rootState = initialState; }

  get present() { return this.stateAt(this.#history.currentId); }

  commit(state) {
    const before = this.present;
    const id = this.#history.commit(null);
    this.#patches.set(id, makePatch(before, state));
    return id;
  }

  stateAt(id) {
    let text = this.#rootState;
    for (const nodeId of this.#pathTo(id)) {         // root -> id
      if (nodeId !== 0) text = applyPatch(text, this.#patches.get(nodeId));
    }
    return text;
  }

  undo() { this.#history.undo(); return this.present; }
  redo(childId) { this.#history.redo(childId); return this.present; }
  jumpTo(id) { this.#history.jumpTo(id); return this.present; }
}
```
WHY: the tree didn't change at all — only what hangs off each node did. That's the payoff of having separated "the shape of history" from "what a version is": `PatchHistory` composes `HistoryTree` instead of forking it, and every branching rule, no-op and error message comes along for free. The trade is explicit: memory drops from "a whole document per version" to "a few characters per version", and reading a version costs a walk from the root instead of a lookup (real editors cache, or store a full snapshot every N nodes). The suffix loop's `- prefix` guards are the whole correctness argument: without them, `'aa' → 'a'` matches the same character as both prefix and suffix and produces a patch that deletes nothing. That's precisely the bug the fuzz test hunts — 200 sessions × 12 random edits, every intermediate version reconstructed and compared. Verified by running: the tagline scenario, the exact `{at: 17, remove: 0, insert: ' — pick two'}` patch, and ~2,400 reconstructions all exact.
