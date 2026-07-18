# TS 22 — Overloads & computed returns

**Lesson: when the return type depends on the arguments, don't average the
truths into one vague signature — write each truth (overloads) or compute it
(lookup-type generics).**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

Two functions whose input/output relationships are *real* but unexpressed:

1. `makeElement(tag: string): HTMLElement` — pass `'input'`, get back a
   type that forgot it's an input, and every useful property needs an `as
   HTMLInputElement` cast (ts#09's confession at every call site). The
   union-return "fix" is worse: now *every* caller narrows, even for
   `'div'`.
2. `getConfig(key, fallback?): string | undefined` — with a fallback the
   result can *never* be undefined, but the single signature averages both
   truths, so fallback'd callers scatter `!` (ts#05) after a value that
   was always safe.

## What changed in the refactor

- **Tool 1 — lookup-type generics** (for `makeElement`): the DOM ships
  `HTMLElementTagNameMap` ('input' → HTMLInputElement...), so one ts#18
  signature *computes* the return: `<K extends keyof Map>(tag: K):
  Map[K]`. Casts die, and unknown tags (`'blink'`) become errors as a
  bonus. When a *table* of the input→output relationship exists (or you
  can write one — ts#20's event map!), this beats overloads: N cases, one
  signature.
- **Tool 2 — overloads** (for `getConfig`): two truths, two exact
  signatures stacked above one implementation. Fallback'd calls return
  `string` (the `!` dies); bare calls keep the honest `| undefined`
  (type-tested). The detail worth knowing: **callers see only the overload
  list** — the implementation signature underneath is private plumbing and
  may be looser (`fallback?`), which is what makes the pattern workable.
- Choosing between them: relationship expressible as a type table →
  generic + lookup. Few cases, structurally different (arg present vs
  absent, different arg types) → overloads. Both beat the vague single
  signature and the `any`-hiding union.

## Key takeaway

A signature that's "sometimes too wide" makes every caller pay — in casts
on one side or `!`s on the other. When return depends on input, say so:
stack the exact truths as overloads, or encode the relationship in a map
type and let `K`/`Map[K]` compute it per call.
