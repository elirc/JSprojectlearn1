# 📘 Learning Guide: Tree Utils (flat ⇄ nested)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

Imagine the comment section of a blog. The database stores comments as a flat list — each comment just remembers the id of the comment it replies to:

```
id 1: "First!"           (replies to nobody)
id 2: "Actually..."      (replies to 1)
id 3: "Well, actually..."(replies to 2)
```

But the page wants them **nested**, like this:

```
First!
  Actually...
    Well, actually...
Great post
  Agreed
```

Our program converts the flat list into that nested shape (and back), no matter how deep the replies go.

## 2. Concepts you need first

### Objects and arrays holding objects

An **object** is a bundle of named values. An **array** is an ordered list. Our data is an array of objects:

```js
const row = { id: 2, parentId: 1, text: "Actually..." };
console.log(row.parentId); // prints: 1
```

`parentId: null` means "no parent" — `null` is JavaScript's word for "deliberately empty."

### A tree

A **tree** is data where each item can contain more items of the same kind. A comment holds replies; each reply can hold its own replies. Each item is called a **node**. Nodes with no parent are **roots**; a node's nested items are its **children**. Key insight: every child is itself a little tree. That "same shape inside itself" property is called being **self-similar**.

### Recursion

**Recursion** is a function calling itself. It is the natural tool for self-similar data: handle one node, then call yourself on each child.

```js
function countDown(n) {
  if (n === 0) return;      // the "base case" — when to stop
  console.log(n);
  countDown(n - 1);         // the function calls itself
}
countDown(3); // prints: 3, 2, 1
```

Without a base case, recursion never stops and crashes. With one, it handles any depth — 3 levels or 300 — with the same few lines.

### Big-O: O(n) vs O(n²)

**Big-O notation** describes how work grows as data grows. **O(n)** ("linear"): double the data, double the work. **O(n²)** ("quadratic"): double the data, *quadruple* the work — usually caused by a loop inside a loop, where every item rescans every item. 5 comments? Who cares. 5,000 comments? O(n²) is 25 million checks.

### Map

A **Map** is a lookup table: you store values under keys and get them back instantly (no scanning).

```js
const m = new Map();
m.set(1, "hello");
console.log(m.get(1));  // prints: hello
console.log(m.get(99)); // prints: undefined (not found)
```

`m.values()` gives you everything stored, ready for a `for...of` loop.

### The spread operator `...`

`...` copies the contents of an object or array into a new one:

```js
const row = { id: 1, text: "hi" };
const node = { ...row, children: [] };
console.log(node); // prints: { id: 1, text: 'hi', children: [] }
```

### Generators, `yield`, and `yield*`

A **generator** is a special function (written `function*`) that can pause. Each `yield` hands out one value; the caller pulls values one at a time, usually with a loop or `[... ]`:

```js
function* letters() {
  yield "a";
  yield "b";
}
console.log([...letters()]); // prints: [ 'a', 'b' ]
```

`yield*` (with a star) means "hand over to another generator, pass along everything *it* yields, then continue." That is how a recursive generator visits a whole tree.

### Destructuring

**Destructuring** unpacks fields straight into variables:

```js
const { node, depth } = { node: { text: "hi" }, depth: 2 };
console.log(depth); // prints: 2
```

### `import` / `export` (modules)

A **module** is a file that shares code. `export function foo()` makes `foo` available; another file grabs it with `import { foo } from './file.js'`.

### Automated tests

A **test** is code that runs your code and checks the answer. Node has a built-in test runner (`node --test`). `assert.equal(a, b)` throws (fails loudly) if `a` and `b` differ; `assert.throws(fn)` passes only if `fn` throws an error.

## 3. Walking through the original code

The original nests comments with **one hand-written loop per level**:

```js
for (var i = 0; i < rows.length; i++) {
  if (rows[i].parentId == null) {
    var root = { id: rows[i].id, text: rows[i].text, children: [] };
```

Loop 1 scans all rows for roots (`parentId == null`). For each root it builds a node with an empty `children` array.

```js
    for (var j = 0; j < rows.length; j++) {
      if (rows[j].parentId == root.id) {
        var child = { ... };
```

Loop 2, *inside* loop 1, rescans **all** rows again looking for children of that root. Loop 3 (the `k` loop) rescans a third time for grandchildren. Then the code just... stops. The comment in the file admits it:

```js
// level 4? Copy the loop again. Level 5? Again.
```

Finally, the rendering code repeats the exact same three-level staircase to print indented text:

```js
for (var a = 0; a < tree.length; a++) {
  console.log(tree[a].text);
  for (var b = 0; b < tree[a].children.length; b++) {
    console.log("  " + tree[a].children[b].text);
```

Same fixed-depth assumption, written out a second time.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: depth is hardcoded at 3 — deeper replies silently vanish.** There are three loops, so only three levels get found. Here's how it bites you: a user replies to "Well, actually..." (level 4). The database saves it fine. But `buildTree` has no fourth loop, so that comment never appears on the page. No error, no log. The user thinks the site deleted their comment. Bugs that hide are the worst kind — nothing tells you anything went wrong.

**Flaw 2: it's O(n²).** Every root rescans the *entire* row list for children, and every child rescans it again. With 5,000 comments that's millions of pointless checks, and the page gets slow for no visible reason.

**Flaw 3: the bug lives in two places.** The build code and the render code both assume "3 levels max." Fixing one and forgetting the other leaves the site half-broken. Duplicated logic means duplicated bugs.

The root cause: the code models the tree as *levels*, but a tree is really *nodes whose children are themselves trees*. Code shaped like an example handles the example; code shaped like the definition handles everything.

## 5. Try it yourself first!

Try fixing `original.js` before peeking at the solution.

1. **Vague hint:** The data is self-similar. What kind of function handles self-similar data?
2. **Warmer:** You need something that works for *any* depth — a function that, after handling one node, calls itself on that node's children.
3. **Warmer still:** For speed, avoid rescanning. Could you first put every row into a `Map` keyed by `id`, so finding any node's parent is one instant `get`?
4. **Almost the answer:** Two passes. Pass 1: turn every row into a node (`{ ...row, children: [] }`) and store it in a Map by id. Pass 2: for each node, if `parentId` is `null` it's a root; otherwise `map.get(parentId).children.push(node)`.
5. **For rendering:** write one recursive function `print(nodes, depth)` that logs each node with `"  ".repeat(depth)` and calls itself with `depth + 1` on the children.

## 6. Understanding the refactored solution

**`buildTree` — no recursion needed, two passes, O(n).**

```js
const nodeById = new Map(
  rows.map((row) => [row.id, { ...row, children: [] }]),
);
```

Pass 1: every row becomes a node stored in a Map under its id. Now finding any node is instant — the Map replaces all that rescanning.

```js
if (node.parentId === null) {
  roots.push(node);
} else {
  const parent = nodeById.get(node.parentId);
  if (!parent) throw new Error(`Row ${node.id} has unknown parentId ...`);
  parent.children.push(node);
}
```

Pass 2: link each node to its parent. Notice the design choice: a row pointing at a parent that doesn't exist (an **orphan**) now **throws an error** instead of quietly disappearing. Broken data should be loud, not invisible.

**`walkTree` — one recursive generator that visits everything.**

```js
export function* walkTree(nodes, depth = 0) {
  for (const node of nodes) {
    yield { node, depth };
    yield* walkTree(node.children, depth + 1);
  }
}
```

For each node: yield it (with its depth), then `yield*` recursively into its children with `depth + 1`. This visits nodes **depth-first** — it dives all the way down a branch before moving to the next sibling — which matches how comment threads read on a page.

**Everything else is built on the walker.** `renderIndented` is three lines: walk, indent each line by `depth`, join. `flattenTree` walks and collects rows back out. One walker, many uses — write the traversal once, reuse it forever.

**The tests attack exactly the original's failures:** a level-4 reply (the one the original dropped), a 50-deep chain, an orphan row (`assert.throws` checks it errors), and a **round-trip** test — flatten(build(rows)) must give back the original ids and parents, proving nothing is lost in translation.

## 7. Words you learned (glossary)

- **Node** — one item in a tree.
- **Root** — a node with no parent.
- **Children** — the nodes nested directly under a node.
- **Tree** — data where nodes contain child nodes of the same kind.
- **Self-similar** — having the same shape inside itself (a reply is itself a comment).
- **Recursion** — a function calling itself.
- **Base case** — the condition that stops recursion.
- **Big-O** — notation for how work grows with data size.
- **O(n) / O(n²)** — linear growth / quadratic growth (loop inside a loop).
- **Map** — a key→value lookup table with instant `get`.
- **Spread (`...`)** — copies an object's or array's contents into a new one.
- **Generator (`function*`)** — a function that pauses at each `yield` and hands out values one at a time.
- **`yield*`** — delegate to another generator and pass along its values.
- **Depth-first** — visiting a whole branch before its siblings.
- **Destructuring** — unpacking object fields into variables in one step.
- **Module** — a file that `export`s code for other files to `import`.
- **Assertion** — a test check that fails loudly when the answer is wrong.
- **Orphan** — a row whose `parentId` points at a node that doesn't exist.
- **Round-trip** — converting data there and back to prove nothing was lost.

## 8. Experiments to try on the plane (no internet needed)

1. **Break the original on purpose.** Add `{ id: 6, parentId: 3, text: "level 4!" }` to `rows` in `original.js` and run it. Expected: id 6 appears nowhere in the output — silently gone.
2. **Feed the same row to the refactor.** Add it to `ROWS` logic in a scratch file that imports `buildTree` and `renderIndented`. Expected: "level 4!" prints, indented six spaces.
3. **Test the orphan.** Call `buildTree([{ id: 1, parentId: 42, text: "lost" }])`. Expected: an error saying `unknown parentId 42` — loud, not silent.
4. **Change the walk order.** In `walkTree`, swap the two lines (do `yield*` before `yield`). Expected: children print *before* parents — the depth-first "visit order" reverses, and the render looks upside-down.
5. **Count nodes with the walker.** Write `const count = [...walkTree(tree)].length;`. Expected: 5 for the sample data — one more use of the single walker, no new loops.
