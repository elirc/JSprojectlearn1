# TS 13 — The unknown boundary

**Lesson: a return annotation on `JSON.parse` doesn't check — it launders.
Runtime validation is what makes compile-time types true.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/13-unknown-boundary/refactored/savegame.ts
```

## What's wrong with the original?

`function loadGame(json): SaveGame { return JSON.parse(json) }` — the
annotation is a wish. `JSON.parse` returns `any` (the stdlib's original
sin), and `any` assigns to anything, so *whatever the string contains* comes
out wearing the `SaveGame` type. The demo payload has `level: "nine"` and a
bare-string inventory: `"nine" + 1` renders `"nine1"` to a player, and
`.join` on a string throws three functions away from the parse that caused
it. The type system did exactly what it was told — trust. Types describe
compile-time knowledge; JSON is a runtime visitor; someone has to actually
look at it.

## What changed in the refactor

- **The three-step boundary**, the pattern to memorize:
  1. `JSON.parse(json) as unknown` — the one assertion in the file, and
     note its direction: `any → unknown` *removes* capability, so it's
     always safe (the opposite of the original's laundering);
  2. **validate**: `isSaveGame` checks every field — composed from small
     guards (`isRecord`, `isStringArray`) exactly like js#31 composed
     rules;
  3. only then does the data wear the type — earned by checks, not claimed
     by annotation.
- **The signature confesses**: `SaveGame | null`, because parsing *can*
  fail — callers must handle it (type-tested). Project 36's `Result` will
  carry the reason; `null` keeps this lesson focused.
- **Inside the boundary, code trusts plainly** — `save.level + 1`, no
  defensive re-checks — because the trust was established once, at the
  door (js#30's architecture, now type-bearing).
- At scale, schema libraries (zod et al.) generate the guard *and* the type
  from one definition — project 34 shows the bridge. The hand-rolled
  version here is what they automate.

## Key takeaway

Where data enters — JSON, storage, APIs, forms — the honest type is
`unknown`, and the passage from `unknown` to your interface must be a
*check*, never an annotation or cast. Do it once at the boundary and the
entire interior gets to be plainly, justifiably confident.
