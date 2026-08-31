# 82 — Canvas bar chart

**Lesson: layout is math, drawing is I/O. Compute a layout of plain numbers first,
then let a dumb `draw()` paint it — and the arithmetic becomes testable in node.**

## Run it

```
open 82-canvas-bar-chart/original.html         (in a browser)
open 82-canvas-bar-chart/refactored/index.html (in a browser)
node --test 82-canvas-bar-chart/refactored/chart.test.js
```

Both pages draw the same six bars. The difference is what happens when the data
changes — the refactored page has buttons that change it.

## What's wrong with the original?

**The chart is a painting, not a program.** There is no `data` variable anywhere:
the six amounts live inside six `fillRect` calls, already converted to pixels by a
human. Every number on the screen is a magic number:

1. **The scale is the literal `8`** ("Jan: 1200 / 8 = 150"), chosen because it fit
   the numbers that existed the day it was written. Change March to 4200 and the bar
   is 525px tall on a 280px canvas — it draws off the top, the "1500" gridline label
   keeps lying, and *nothing errors*.
2. **Positions are hand-counted**: x = 60, 128, 196, 264, 332, 400. A seventh month
   goes at 468 on a 480-wide canvas, half off the edge. Resizing the canvas
   invalidates all thirty numbers at once.
3. **Negative values break silently.** A −300 refund gives `fillRect(x, 277.5, 40,
   -37.5)`, and canvas draws negative heights *upward* — the bar appears somewhere
   nobody intended.
4. **Nothing can be tested.** "How tall should the March bar be?" has no answer in
   code; the answer only exists as pixels already painted.

## What changed in the refactor

- **`computeLayout(data, {width, height, padding})` returns plain numbers** — bar
  rects, tick positions, the baseline — and never mentions a canvas. Every decision
  the original made by hand is now one line of arithmetic in one place.
- **One `yOf(value)` function owns value → pixel**, derived from the data's own
  range instead of a hard-coded `8`. The tallest bar always fills the plot, so
  overflow is impossible; 13 months just make thinner bars.
- **The range always includes zero**, so bars measure real size (940 vs 1010 looks
  like 7%, not 100% — the classic lying-chart bug the original was one edit away
  from). Negative bars hang below the baseline with a *positive* height, because
  `Math.min` / `Math.abs` sort the two y values.
- **`draw(ctx, layout)` makes no decisions** — 25 lines of `fillRect` and `fillText`
  reading numbers it was handed. Swap it for an SVG or ASCII renderer and the chart
  still works; that's how you know the split is real.
- **`chart.test.js` checks proportionality, empty data, zeros, negatives, rescaling
  and 13 months — with no canvas, no browser, no screenshots.** The tests assert
  every bar lands inside the plot box: the original's headline bug, now impossible.

## Key takeaway

Drawing code is I/O, and I/O is hard to test — so keep it thin and stupid. Push
every decision (scale, position, size, ticks) into a pure function that turns data
into numbers. Then "does my chart work?" becomes an ordinary unit test, and
"support a new dataset" becomes no work at all.
