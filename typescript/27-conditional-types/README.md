# TS 27 — Conditional types

**Lesson: `T extends U ? X : Y` is an if/else on types — and with `infer`,
it takes types apart. "The resolved type of X" finally has a spelling.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

Two symptoms of one missing capability:

1. **Sync/async twin functions** (`getCachedSync`/`getCachedAsync`) —
   js#04 twins at the type level, with a nasty failure mode: pass an async
   compute to the sync getter and `T` infers as `Promise<...>`, so the
   "cached value" *is a promise typed as a value*. `user.name` is
   undefined; the compiler smiled.
2. **A hand-mixed endpoint table** where some entries are `Promise<X>`
   and some are `X`, because "the resolved type of endpoint K" — unwrap
   if wrapped, pass through if not — *had no spelling*.

## What changed in the refactor

- **`type Unwrap<T> = T extends Promise<infer Inner> ? Inner : T`** — the
  sentence, spelled. Two mechanisms in one line: the *conditional*
  (`extends ?:`) branches on whether T matches a pattern, and **`infer`**
  names the part inside the pattern (the type-level equivalent of a regex
  capture group — project 28 runs with this). `DeepUnwrap` shows
  conditionals recurse — that's `Awaited<T>`'s spirit.
- **One `getCached<T>` replaces the twins** — and the honest fix is worth
  noticing: the promise case now returns something *typed as a promise*,
  so the original's trap (`userPromise.name`) is a compile error, and
  `.then(...)` is the visibly correct usage.
- **The table, normalized by combining projects 25 + 27**:
  `{ [K in keyof Endpoints]: Unwrap<Endpoints[K]> }` — a mapped type
  applying a conditional to every value. Mixed wrapped/unwrapped entries
  in, uniform resolved shapes out; `fetchResolved('/user')` awaits to
  `{name}` regardless of how the table spelled it.
- Where conditionals earn their keep: *library-ish* code that must adapt
  to what callers pass. In app code, reach for them when you're about to
  write parallel types/functions differing only in wrapping.

## Key takeaway

Conditional types give the type system its `if`, and `infer` gives it
destructuring. Together with mapped types (25) and template literals
(26), you now have loops, conditionals, and string ops — a small
programming language over types. Project 28 writes a real parser in it.
