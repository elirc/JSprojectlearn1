# 20 — Complementary color generator

**Lesson: build on your own tested code — and know when the naive approach is
answering the wrong question.**

## Run it

```
node 20-complementary-colors/original.js
node --test 20-complementary-colors/
open refactored/demo.html in a browser (live swatches)
```

## What's wrong with the original?

1. **It computes the wrong thing convincingly.** RGB inversion (`255 - channel`)
   *looks* right on pure red and green, so it survives a quick check. But invert grey
   `#808080` and you get... nearly the same grey. Invert a dark red and you get a
   *light* cyan — the brightness flipped too. A designer asking for a complement wants
   the **opposite hue at the same saturation and brightness** — a 180° rotation in HSV
   space. Getting plausible-but-wrong answers past your own eyeballs is exactly why
   project 19's tests matter.
2. **It rewrote hex parsing from scratch** — padding dance and all — when project 19
   already has tested `hexToRgb`/`rgbToHex`. Rewriting what you already own means new
   bugs in solved problems: witness `complement("red")` → `"#NaNNaNNaN"`, silently.

## What changed in the refactor

- **`palette.js` contains zero color math.** It imports the project 19 module and
  composes it: `rotateHue = hex → hsv → h + degrees → hex`, four lines. All three
  palettes (`complementary`, `triadic`, `analogous`) are one-liners on top of
  `rotateHue`. This is the reward for 19's cleanliness — reuse across *projects*, not
  just within a file.
- **Validation came free.** The test "garbage input throws" passes with no code in
  this project — `hexToRgb` already handles it. When you reuse tested code you inherit
  its guarantees, not just its features.
- **`normalizeHue` quietly saves the day**: `h + 240` routinely exceeds 360, and
  `analogous(-30)` goes negative — precisely the inputs that broke the original
  project 19 code. Layered code multiplies the value of every edge case you handled
  below.
- `demo.html` shows the palettes live. It inlines copies of the functions (browsers
  block `import` on `file://` — the comment in the file explains), so the *tested*
  truth stays in `palette.js`.

## Key takeaway

Before optimizing how to build something, check you're building the right thing — the
original's real bug was a wrong *definition*, not wrong code. Then build it out of
parts you already trust: the entire feature is four one-liner functions because
project 19 did the heavy lifting.
