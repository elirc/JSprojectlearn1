# TS 16 — Generics intro

**Lesson: js#04's rule of three, type-level — when copies differ only by a
type, the type becomes a parameter.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`firstString` / `firstNumber` / `firstUser` — identical bodies, one per
type, breeding on demand (the `pair` family is already multiplying). It's
js#04's copy-paste generalization where the difference is a *type*. The
team's other "fix" — `firstAny(items: any[]): any` — trades N drifting
copies for zero checking: `firstAny([1,2]).toUpperCase()` compiles and
crashes, ts#01's epidemic through the return value. Duplicated-but-checked
vs single-but-unchecked: the same dilemma as ts#14, and again there's a
third option.

## What changed in the refactor

- **`first<T>(items: readonly T[]): T | null`** — read it as a function
  that takes a type parameter alongside its value parameter. `<T>`
  declares; `T[]` uses; `T | null` returns. **One implementation, checked
  for every caller** — and callers never write `<T>`: it's *inferred* from
  the argument (`first(scores)` → `T = number` → returns `number | null`,
  hover to confirm).
- **The checking survived the generalization** — that's the point the
  `any` version missed. `first(scores)` assigned to `string` is a compile
  error; the `| null` still demands its check (ts#05); `pair('a', 1)` is
  rejected because both args must share one `T`. Generic ≠ permissive.
- **Types flow *through***: `firstMapped(items, fn)` has two parameters —
  `T` from the array, `R` from the callback's return — so
  `firstMapped(names, n => n.length)` is `number | null` with zero
  annotations. This flow-through is what makes js#26-style utilities
  fully typeable (project 19 does exactly that).
- When to reach for a generic: the same test as extracting any parameter —
  you have (or foresee) two copies differing only in type. Not before;
  a generic nobody instantiates twice is speculative generality (js#03's
  restraint).

## Key takeaway

Generics are parameters for types, inferred like arguments. When you
catch yourself writing `xString`/`xNumber` twins — or reaching for `any`
to avoid them — write `x<T>` once: single implementation, per-caller
checking, and the honesty (`| null`, readonly) rides along intact.
