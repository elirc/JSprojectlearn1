# 19 — HSV color representation

**Lesson: math code earns its keep through round-trip tests; branch tables beat
copy-pasted cases.**

HSV is the human-friendly way to describe color: **h**ue (0–360° around the color
wheel), **s**aturation (0 = grey, 1 = vivid), **v**alue (0 = black, 1 = bright).
Screens want RGB, so conversion functions are the bridge — and projects 20–22 build
on this file.

## Run it

```
node 19-hsv-color/original.js
node --test 19-hsv-color/
```

## What's wrong with the original?

1. **`hsvToRgb(360, ...)` returns `[NaN, NaN, NaN]`.** `Math.floor(360/60)` is 6, no
   branch matches, and `r`,`g`,`b` stay `undefined`. Hue 360 is a completely reasonable
   red (it's the same angle as 0), and negative hues — natural results of hue
   arithmetic like "rotate 180°" — explode the same way. The refactor's
   `normalizeHue` (the double-modulo idiom from project 04, reused for angles) fixes
   the whole class of bugs in one line.
2. **Six copy-pasted branches shuffling single-letter variables.** One transposed
   letter in any branch = subtly wrong colors in one sixth of the color wheel — the
   kind of bug you *cannot* see in a code review. The refactor turns the six cases
   into a **table of triples** indexed by sector: the pattern (chroma and x rotating
   through the channels) becomes visible, and the compiler-checkable structure
   replaces six chances to typo.
3. **"The reds look red" was the entire test suite.** There's no `rgbToHsv`, so
   round-trip checking wasn't even possible.

## What changed in the refactor

- **Objects, not positional arrays**: `{ h, s, v }` and `{ r, g, b }` in, out, and in
  every intermediate. `color.h` documents itself; `result[0]` doesn't. The shapes are
  documented once at the top of the file.
- **Named intermediates from the actual math**: `chroma`, `hPrime`, `sector` — the
  same lesson as project 09, applied to a formula. Comments explain the *geometry*
  ("which sixth of the wheel"), not the syntax.
- **Both directions + hex helpers**, making this a small reusable color library —
  project 20 imports it directly.
- **The round-trip test is the star**: `hsvToRgb(rgbToHsv(c)) ≈ c` for a grid of 216
  colors across the whole RGB cube. When you write a pair of inverse functions, this
  one test catches transposed channels, sector bugs, off-by-one-degree errors — nearly
  anything. (Within ±1 per channel: rounding to integers loses a little precision, and
  the test honestly encodes that.)

## Key takeaway

Any time you write `encode`/`decode`, `parse`/`serialize`, or `toX`/`fromX`, the
round-trip property test should be the first test you write — enormous coverage for
five lines. And when branches differ only in which variable goes where, that's not
six cases, it's one case and a table.
