# TS 04 — Optional fields

**Lesson: `?` is three different situations wearing one punctuation mark —
model optional-with-default, genuinely-absent, and required separately.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/04-optional-fields/refactored/settings.ts
```

## What's wrong with the original?

Everything is `?`, so `Settings = {}` is legal — and every read is a coin
flip. Strict mode *did* flag the naked accesses, so the author reached for
`!`, the non-null assertion: a promise the compiler takes on faith, wrong
here every time (`undefined + 2` = NaN; `.toUpperCase()` = crash — with the
compiler's blessing).

The deeper failure is modeling: `?` was covering **three distinct
situations** — theme is optional *with a default*, email is *genuinely
maybe-absent*, fontSize is required-but-filled-in-later — and the type tells
callers none of it. (This is js#25's missing-vs-undefined distinction,
resurfacing as API design.)

## What changed in the refactor

- **Two types, one boundary** — the central move:
  - `SettingsInput` — the lenient *edge* shape callers pass (`?` everywhere
    it's honest);
  - `Settings` — the strict *inside* shape: defaults applied, everything
    present. `resolveSettings` converts, deciding every default in one
    place (js#30's validate-at-the-boundary, as types).
  After the edge, `settings.fontSize + 2` is plain access — no `!`, `?.`, or
  `??` sprinkled through the app, because the *type* promises presence.
- **The genuine maybe stays a maybe, loudly**: `email: string | undefined`
  (not `email?:`) — it must be *provided* explicitly even as undefined, and
  every read must branch: the type test proves `.toUpperCase()` without a
  check doesn't compile. Note the nuance: `?` means "may be omitted";
  `| undefined` means "always there, possibly empty" — the refactor uses
  each where it's true.
- **`!` disappeared entirely.** Each `!` in the original was a place the
  model was wrong; fixing the model made them unnecessary. Treat `!` as a
  todo marker at best.

## Key takeaway

Before typing `?`, ask which of the three you mean: default exists →
optional at the edge, required inside; genuinely absent-able →
`| undefined` and force the branch; required → no question mark. And when
you catch yourself typing `!`, the model is wrong somewhere upstream —
resolve at the boundary instead of asserting at every read.
