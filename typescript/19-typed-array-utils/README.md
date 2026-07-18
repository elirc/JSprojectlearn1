# TS 19 — Typed array utilities

**Lesson: js#26's utility belt, given its true types — generic bodies
unchanged, all the downstream fiction deleted.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The port kept js#26's correct *logic* and typed every signature
`any`-flavored — so the utilities work, but everything downstream of them
is fiction. The three demos: a `keyOf` typo (`p.scroe`) makes every sort
comparison `undefined < undefined`, silently scrambling the "sorted" array;
`sorted[0].nmae` is `undefined` typed as string; and `Map<any, ...>` lets
you `.get('95')` from a number-keyed map — an always-undefined lookup js#26
chose Maps specifically to prevent. Utility functions are *infrastructure*:
`any` in their signatures leaks into every caller in the codebase (ts#01 at
maximum blast radius).

## What changed in the refactor

- **Bodies unchanged from js#26** — worth pausing on. The refactor added
  zero logic; it added *knowledge*: `<T>` for items, `K` flowing from
  `keyOf`'s return into `Map<K, T[]>` (ts#16's flow-through), `readonly`
  inputs (ts#08).
- **Inference makes the utilities frictionless**: `sortBy(players, (p) =>
  p.score)` — `p` is `Player` with no annotation (contextual typing,
  ts#15), the callback's typos are compile errors, and the result is
  `Player[]`. The four type tests are exactly the original's downstream
  fictions.
- **`groupBy`'s `Map<K, T[]>` restores js#26's key-type honesty**:
  `.get('95')` on a `Map<number, Player[]>` doesn't compile.
- **One deliberate constraint**: `sortBy`'s `K extends string | number` —
  because `<` on objects would lie at runtime. The constraint encodes a
  *runtime* truth about comparability (the last type test). Constraints
  aren't just for member access (ts#17); they encode what the body's
  operations actually require.
- Note `groupBy` also lost its `!` (ts#05): a small get-then-check
  restructure instead of asserting — de-`!`-ing as a habit.

## Key takeaway

Type your utilities *first* and hardest — they're the code with the most
callers, so their `any`s do the most damage and their generics do the most
good. The pattern is always the same: `<T>` for the items, let key types
flow through the functions callers pass, and constrain only what the body's
operations truly require.
