# TS 40 — Typed AST

**Lesson: js#49's tree, given the discriminated-union shape it always wanted
— recursive structures are where impossible-states modeling pays compound
interest.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

One `Node` interface with every field any node *might* have, optional on
all — ts#30's Big Bag, applied to a *recursive* structure, where it hurts
most: `evaluate` needs a `!` at every subtree access (five of them), each
a promise the bag can't keep — `evaluate(broken2)` crashes reading
`.type of undefined` through one of them. Malformed trees (`number`
without a value, `binary` without operands, a number node dragging binary
luggage) all construct happily, and both `return 0` buckets (unknown op,
unknown node) are ts#12's silent-default disease — an evaluator that
answers *zero* instead of *no*.

## What changed in the refactor

- **`Expr` is a recursive discriminated union** — js#49's three node
  kinds, each carrying exactly its fields, with subtrees typed `Expr`.
  Every `!` disappears (the fields *exist* where they're accessed), and
  all four malformed trees are type tests — including `'%'`, because
  `op` is a literal union (ts#06), not `string`.
- **Both silent-zero buckets became `assertNever`** (ts#12): unknown ops
  and unknown node kinds are unrepresentable at compile time and loud at
  runtime. Add a `'call'` variant and `evaluate` won't compile until it's
  handled — the extension story js#49's switch could only dream of.
- **Consumers multiply for free**: `toInfix` walks the same union — and
  because its switch covers all kinds with returns, it needs no default
  at all. Every future pass (a simplifier, a compiler, a pretty-printer)
  gets the same guarantees from the same type.
- The tree literal for `(2 + 3) * 4` reads like the math, and building
  it wrong is now the compiler's problem, not the evaluator's.

## Key takeaway

Trees, ASTs, JSON-like documents, UI element trees — any recursive "one
of several node kinds" structure is a discriminated union waiting to be
written. Model it that way and every traversal in your codebase drops
its assertions, every malformed-construction bug dies at the literal,
and adding a node kind becomes a compiler-guided checklist across all
consumers at once.
