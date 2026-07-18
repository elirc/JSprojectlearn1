# 37 — Tree utilities (flat ⇄ nested)

**Lesson: recursion on real-world data — nested loops handle *levels*, recursion
handles *trees*.**

## Run it

```
node 37-tree-utils/original.js
node --test 37-tree-utils/
```

## What's wrong with the original?

1. **One nested loop per level of depth — literally.** Three loops handle three
   levels; a reply at level four **silently vanishes from the page**. No error, no
   log: the data is there, the UI just never shows it, and the user thinks their
   comment was deleted. Structure-blind code fails structurally.
2. **It's O(n²)** (rescanning all rows for every node) — fine for 5 comments, grim
   for 5,000.
3. **The render staircase duplicates the same fixed-depth assumption**, so the bug
   exists in two places and must be fixed (never) in both.

The deep issue: the code models the tree as "levels", but a tree isn't levels —
it's *nodes whose children are themselves trees*. Code shaped like the definition
handles any depth; code shaped like an example handles the example.

## What changed in the refactor

- **`buildTree` is two passes and O(n)**: create all nodes into a `Map` by id, then
  link each to its parent. No recursion even needed for *building* — the Map does
  the finding that the nested loops did by rescanning. Orphaned rows (unknown
  `parentId`) **throw** instead of vanishing — data integrity problems should be
  loud (project 30).
- **`walkTree` is a recursive generator** — projects 22 (generators) and 07
  (recursion) shaking hands. `yield { node, depth }`, then `yield*` into the
  children. Every "do something at every node" need — render, count, search,
  flatten — becomes a consumer of this one walker; `renderIndented`, which replaced
  the original's staircase, is three lines on top of it.
- **The tests attack exactly the original's failures**: the level-4 comment it
  dropped, a 50-deep chain, the orphan. And `flattenTree(buildTree(rows))`
  round-trips — the encode/decode property test from project 19, on structure
  instead of color.

## Key takeaway

When data is self-similar — comments with replies, folders with folders, menus with
submenus — the code must be self-similar too: a function that calls itself on the
children. If you ever type the same loop nested inside itself, you've hardcoded a
depth, and reality will exceed it.
