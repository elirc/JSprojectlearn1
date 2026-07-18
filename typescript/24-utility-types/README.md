# TS 24 — Utility types

**Lesson: type variations are formulas, not copies — `Partial`, `Pick`,
`Omit`, `Record` derive the shadows that hand-copies let rot.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

One `User` and four hand-copied variations, each a snapshot that stopped
tracking the original the day it was written. The rot is already in:
`UserUpdate` and `NewUser` are both missing `createdAt` (added to `User`
later, propagated nowhere), and `PublicUser` grew a `rol` typo during the
copy — a third spelling of that field now lives in the codebase. Every
`User` change is a five-interface scavenger hunt. And note what hand-copies
structurally *can't* record: intent. Is `createdAt` absent from `NewUser`
on purpose? A snapshot doesn't say.

## What changed in the refactor

- **Each shadow became a formula**:
  - `Partial<User>` — "everything optional" (PATCH), forgotten fields
    impossible;
  - `Pick<User, 'id' | 'username' | 'role'>` — "just these", with the key
    list *checked against User* (the `rol` typo is a type test now);
  - `Omit<User, 'id' | 'createdAt'>` — "all except server-assigned", and
    the formula *states the why* the hand-copy lost;
  - `Record<number, string>` — the index shape (ts#06's companion).
- **Formulas track the source**: add a field to `User` and every derived
  type updates itself — correctly per its own intent (optional in
  `UserUpdate`, absent from `PublicUser` unless picked...). The scavenger
  hunt is over.
- **They compose** (`Partial<Pick<...>>`) because they're ordinary types —
  and they're not magic: each is a one-line mapped/conditional type from
  the stdlib. Project 25 opens the hood and writes them from scratch.
- The type tests double as security checks: `PublicUser` rejecting an
  `email` field means *leaking a private field is a compile error* — a
  nice upgrade from convention.

## Key takeaway

Never hand-write a type that's expressible as a transformation of another:
say `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>` and let the
relationship maintain itself. Derived types are js#09's "derive, don't
store" — for types: a stored copy can be stale; a formula can't.
