# TS 25 — Mapped types

**Lesson: `{ [K in keyof T]: ... }` is a loop over a type's keys — write it
yourself once and the stdlib stops being magic, and its gaps stop being
walls.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The team uses `Partial`/`Pick` daily but treats them as sealed magic — so
the moment they need a variation the stdlib doesn't ship ("every field as a
getter", "a boolean per key"), they're back to hand-copying interfaces, and
ts#24's rot returns: the touched-tracker is already a field behind, and the
"readonly + optional" shape was hand-merged instead of composed. Knowing
*of* utility types without knowing their *mechanism* leaves you dependent
on exactly the forty types someone else predicted you'd need.

## What changed in the refactor

- **The mechanism, exposed**: `MyPartial`, `MyReadonly`, `MyPick` — each a
  one-line loop (`[K in keyof T]`) with a modifier. This is js#45/react#50's
  build-your-tools move for the type system: once you've written `Partial`
  yourself, none of the stdlib is magic. Bonus mechanics: modifiers can be
  *removed* (`-readonly`, `-?`) — `Editable` and `Complete` don't ship in
  the stdlib and are one line each.
- **The gaps, filled in one line each**: `Getters<T>` wraps every value in
  `() => T[K]`; `FlagsOf<T>` maps every key to boolean. Both *track the
  source* — add a field to `Settings` and both refuse to compile until
  updated (type-tested). The hand-copies could rot; the loops can't.
- **Compose, don't hand-merge**: `Readonly<Partial<Settings>>` — utility
  types are ordinary types and stack like functions (ts#24's point, now
  with home-built pieces in the stack).
- You've already used this machinery: ts#23's `Schema<T>` was a mapped
  type with a payload (`Rule<T[K]>[]`). Today it got a name and a toolbox.

## Key takeaway

Read `{ [K in keyof T]: F<T[K]> }` as "for each key of T, transform its
value type" — a for-loop that runs at compile time. Any "same keys,
different value treatment" shadow you're tempted to hand-write is one of
these loops, and shadows written as loops maintain themselves.
