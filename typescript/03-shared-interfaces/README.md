# TS 03 — Shared interfaces

**Lesson: inline object types are copy-paste with extra steps — one *named* type
per concept, or the copies drift.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The user shape is described **inline, four times** — and the copies have
already diverged: one gained a `plan` field nobody else knows about; one
misspelled `email` as `emial`. Both compile, because TypeScript checks each
function against its *own* inline type — nothing checks the types against
each other. The damage shows at call sites, pointed the wrong way: the typo'd
signature produces errors about the *caller's* object ("emial is missing"),
so the caller "fixes" their data instead of the signature. This is js#04's
copy-paste drift, in the type layer — and renaming `email` means grepping for
every inline copy by hand.

## What changed in the refactor

- **One `interface User`**, four signatures pointing at it. The interface is
  now the *single spelling authority*: the `emial` typo becomes an error
  inside `mailtoLink` (where the bug is), and adding `plan` updated every
  function's contract in one edit. Rename a field and the compiler walks you
  to every usage — the drift class is dead.
- **The type tests pin both original bugs**: a plan-less user and a typo'd
  field are `@ts-expect-error` — required to *not* compile, forever.
- **`plan: 'free' | 'pro'`** instead of `string` — a preview of project 06:
  name the type, then make the type *narrow*.
- When inline types are fine: one-off shapes used exactly once (a function's
  options bag no one else touches). The moment a shape appears twice — or
  *means* something ("a User") — it gets a name. Same rule as extracting a
  function (js#04's rule of three, at the type layer; here even two copies
  had already rotted).
- `interface` vs `type`? For object shapes, either works; pick one style per
  codebase. (This track uses `interface` for object shapes, `type` for
  unions and compositions — a common convention.)

## Key takeaway

Types are code: duplicated types rot exactly like duplicated logic. Give
every domain concept one named type, make all signatures reference it, and
shape changes become one-edit refactors with a compiler-generated todo list.
