# 24 — Image to ASCII art

**Lesson: a processing pipeline with tunable parameters — the capstone that uses
almost every lesson in the repo.**

## Run it

Open `original.html` and `refactored/index.html` in a browser and drop any image in.
In the refactor, drag the width box and switch character ramps *live*.

## What's wrong with the original?

1. **Everything lives inside one `onchange` handler**, two callbacks deep. File
   reading, image decoding, canvas sampling, brightness math, character mapping,
   DOM output — one 40-line blob. Reuse the conversion for a webcam frame or a
   pasted image? Impossible; it's welded to the file input.
2. **The tunable things are the least tunable.** Output width is a hardcoded `100`
   in the middle of the handler; the character ramp is **eight hand-computed
   threshold branches** — to try a denser ramp you'd recompute every boundary.
   The parameters users most want to play with require surgery to change.
3. **A real image-quality bug**: brightness as `(r+g+b)/3`. Human eyes weigh
   channels very differently (green ≈ 6× blue), so flat averaging renders green
   areas too dark. The refactor uses the standard Rec. 601 luminance weights —
   with a comment citing them, because numbers like `0.587` *must* say where they
   came from.

## What changed in the refactor

- **A pipeline with a data interface in the middle:**
  `image → sampleGrid → brightness[][] → asciify → string`.
  The brightness grid is the handoff (like project 12's chain): `sampleGrid` knows
  canvases but not characters; `asciify` knows characters but not canvases. Either
  half swaps out independently — webcam in, colored HTML out.
- **The ramp became a parameter and the thresholds became arithmetic.** Any
  light-to-dark string works: 5 characters or 70, no boundaries to recompute —
  `Math.floor((1 - brightness) * ramp.length)` scales automatically. When N
  hand-computed constants encode one idea, replace them with the formula that
  generated them.
- **`loadImage` promisifies the callback layers** (project 15's lesson), so the
  handler reads as a straight line: `currentImage = await loadImage(file); update()`.
- **Live controls fell out for free** — width and ramp changes just re-run the
  pipeline on the kept image. In the original this feature would be a rewrite; here
  it's two `oninput` lines. Cheap features are the proof the structure is right.

## Key takeaway

You've now seen the full toolkit: pure functions on plain data (02, 07), named
values instead of magic numbers (03, 24's luminance weights), parameters instead of
hardcoded constants (04, 24's ramp), pipelines with data interfaces (05, 12, 23),
async flattening (15), and thin I/O shells (everything since 01). None of it was
about elegance for its own sake — every move made some future change cheaper. That's
the whole discipline: **good code is code that's easy to change.**
