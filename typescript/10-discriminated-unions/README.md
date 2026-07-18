# TS 10 — Discriminated unions

**Lesson: THE TypeScript lesson — model *states*, not *fields*, and the
compiler bans every combination that can't happen.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`{ isLoading, data?, error? }` models the *fields* a request might have, not
the *states* it can be in. Four real states; eight representable field
combinations; four of them lies — and the file constructs two
(`loading+data+error`, `finished-with-neither`) with the compiler's
blessing. This is react#20's bug shown as a *type-level* failure: the
runtime fix there (one status object) had a typed destiny, and this is it.

Second-order cost: because `data` is optional *everywhere*, even the branch
that logically guarantees it needs a `?? '(data missing??)'` fallback — the
type forces defensive code against states you know you're not in.

## What changed in the refactor

- **The union of states**: each variant is `{ status: '...', ...its own
  fields }`. `'loading'` *has no data field to fill with stale results* —
  the nonsense isn't checked-against, it's inexpressible (all four type
  tests). The `status` literal is the **discriminant**: the field narrowing
  keys on.
- **`switch (state.status)`** narrows each case to its exact variant —
  inside `case 'success'`, `state.data` is `string`, present, certain. The
  fallbacks disappear because uncertainty disappeared. (Project 12 adds the
  `never` trick that makes such switches provably exhaustive.)
- **This shape is everywhere once you see it**: js#40's order states,
  react#16's wizard, react#20's requests, project 32's reducer actions,
  project 40's AST nodes, project 36's `Result`. One pattern, learned once,
  reused for the rest of your career.
- The mechanical recipe: list the real states → one variant per state →
  give each variant exactly its own data → tag with a literal `status`/
  `type`/`kind` field → narrow with `switch`.

## Key takeaway

When you catch yourself writing optional fields that are "only there
sometimes," stop modeling fields and model the *sometimes*: a discriminated
union with one variant per real state. It's the single highest-leverage
pattern in TypeScript — the compiler starts rejecting bugs you used to
write tests for.
