# TS 02 — Type inference

**Lesson: annotate boundaries, infer middles — annotation is for where types
are load-bearing, not a tax on every line.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

Two opposite failures in one file:

1. **Noise where inference already knows**: `const port: number = 3000`
   restates the right-hand side, on every line. Beyond being static, redundant
   annotations create *two places for one fact* — add a field to `config` and
   you edit both the annotation and the value; the annotation is one refactor
   away from being a lie inference can never tell.
2. **`any` where annotation is load-bearing**: `formatPrice(price: any)` —
   parameters have no right-hand side, so they're precisely where inference
   *can't* help and annotations *matter*. The lazy `any` there means
   `formatPrice("12")` compiles and crashes (project 01's epidemic, imported
   via laziness).

## What changed in the refactor

- **Locals lost their annotations** — hover them in an editor: `number`,
  `string[]`, the exact object shape, all inferred, all incapable of going
  stale. Even the `map` callback's parameter is inferred from the array.
- **The boundary rule, applied**:
  - *parameters*: always annotated (nothing to infer from) — `price: number`
    turns the crash into a type test;
  - *exported returns*: annotated by choice — errors surface at the
    definition, not at twelve call sites;
  - *empty containers*: `pendingJobs: string[] = []` — an empty array infers
    `never[]`; the annotation supplies the intent inference can't guess.
- The mental model: inference flows *from values*. Wherever a value exists
  (initializers, callbacks in typed contexts), let it flow. Wherever one
  doesn't (params, empty collections, deferred assignment), annotate. That
  single question — "is there a value here to infer from?" — decides every
  case.

## Key takeaway

Types you don't write can't rot. Spend your annotations where they carry
weight — function signatures, exported APIs, empty containers — and trust
inference elsewhere; it's checked exactly as strictly, with none of the
maintenance.
