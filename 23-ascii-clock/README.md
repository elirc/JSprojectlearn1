# 23 — ASCII digital clock

**Lesson: a rendering pipeline — data → string → screen — with the font as data, and
time/timers pushed to the edge.**

## Run it

```
node 23-ascii-clock/original.js        (Ctrl+C to stop)
node 23-ascii-clock/refactored/clock.js
node --test 23-ascii-clock/
```

## What's wrong with the original?

1. **The font is smeared across five loops.** Each output row is built by a chain of
   ternaries per character — the shape of the digit "2" exists as five fragments in
   five different expressions that must stay in sync. Is the "9" correct? *Which
   ternary chain would you even check?* You genuinely can't tell by reading.
2. **Untestable twice over**: `show()` reads the *current* time (different every run)
   and writes to *your* terminal (clears it, even). There is no seam anywhere to
   assert on.
3. Manual zero-padding with ternaries — `padStart` exists (project 05).

## What changed in the refactor

Three files, one pipeline stage each:

- **`font.js` — the font is data you can *see*.** Each glyph is written as its actual
  5-row picture. To fix a digit, edit its picture. To add characters, add entries.
  And look at the third test: it validates the *data* (every glyph exactly 5×3), so a
  malformed glyph is caught by CI, not by squinting at a garbled clock. When something
  is fundamentally a picture/table/list, store it as one — code that *generates* it
  row-by-row obscures it.
- **`render.js` — two pure functions.** `formatTime(date)` takes the date *as a
  parameter* (so tests pass a fixed date — the injectable-clock trick, sibling of
  project 06's injectable rng). `renderText(text)` assembles glyph rows with a
  `map`/`join` per row and *returns* the string. The row-assembly logic — the only
  genuinely tricky bit — is written once, not five times.
- **`clock.js` — the only impure file**, 6 lines: `new Date()`, `console`,
  `setInterval`. Nothing in it can meaningfully break.

The pipeline: `Date → formatTime → "14:03:59" → renderText → big string → console`.
Each `→` is a testable seam. This is the same architecture as a compiler, a static
site generator, or React's render — a chain of representations with pure
transformations between them.

## Key takeaway

Two moves made this testable: representing the font as data instead of logic, and
passing time in instead of reaching for `new Date()` inside. Anything your code
"reaches out" for — the clock, randomness, the network, the terminal — is a
dependency; take it as a parameter and keep the reaching at the edges.
