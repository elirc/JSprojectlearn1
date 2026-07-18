# TS 08 — readonly

**Lesson: js#26's "never mutate inputs" was a house rule kept by discipline —
`readonly` makes the compiler keep it.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/08-readonly/refactored/roster.ts
```

## What's wrong with the original?

The full js#26 disaster, typed as permissible: `topScorers` sorts the
*caller's* array in place, destroying the roster's join order for every later
reader; `applyBonus` edits the caller's object while also returning it;
`getRoster` hands out the module's actual state array for anyone to
rearrange. Every function that returns something also *edits* something —
and no signature warns anyone, because `Player[]` means *mutable* array;
mutable is TypeScript's default, and the default was taken.

## What changed in the refactor

- **`readonly Player[]` in the signatures** — and the mutating methods
  (`sort`, `push`, `splice`) *don't exist on the type*. The copy-first idiom
  (`[...players].sort(...)`) stops being a convention you remember and
  becomes the only version that compiles. The type tests keep the original's
  three mutations impossible.
- **`readonly` fields on `Player`** — `player.score += 50` won't compile, so
  "apply a bonus" *must* mean "return a new player" (`{...player, score:
  ...}`) — the react#10 idiom, compiler-mandated.
- **The asymmetry that makes it practical**: mutable arrays *are* assignable
  to `readonly` parameters (callers aren't burdened), but not the reverse
  (the last type test). So: **accept readonly, return what you own** —
  functions declare "I won't touch this" and everyone can call them with
  anything.
- **Honest notes in the code**: `readonly` erases at runtime — it's a
  contract, not `Object.freeze`; and array-readonly is shallow, which is why
  `Player`'s fields carry their own `readonly`.

## Key takeaway

Make `readonly` your default for parameters and returned views: it costs
nothing at runtime, documents "no mutation" in the one place people read
(the signature), and turns js#26's whole spooky-action bug family into red
squiggles. Mutability should be the exception you opt into, not the default
you forget about.
