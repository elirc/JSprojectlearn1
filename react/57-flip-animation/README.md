# React 57 — FLIP animation

**Lesson: you can't transition a reorder, because nothing changed on any
element. FLIP animates the difference between two layouts — and the only
part worth extracting is the subtraction.**

## Run it

Open `original.html`, star two tiles, press **shuffle**: the names blink
into place and the stars stay behind. Every tile has
`transition: all 300ms` and it buys nothing. The refactor slides the tiles
to their new positions with the stars riding along; untick **animate** to
watch the teleport come back.

```
node --test react/57-flip-animation/refactored/flip.test.js
```

## What's wrong with the original?

1. **`transition: all` can't see a reorder.** A CSS transition animates a
   *property changing on one element*. Reordering a list changes neither —
   it changes which content sits in which box. The boxes stay exactly
   where they were, so there is nothing to interpolate and the browser is
   right to do nothing.
2. **`key={index}` guarantees it stays that way.** Index keys tell React
   "the thing at position 3 is the same thing as before", so React keeps
   each tile parked and swaps its `item` prop. There is no element that
   *is* Fig, so no element can move — the animation isn't just missing,
   it's unreachable.
3. **The same keys corrupt state** (project 03, live): each tile owns a
   `starred` flag, and the flag belongs to the *position*. Shuffle and the
   stars sit on whatever fruit arrives.
4. **The fix people reach for next is worse**: absolutely position
   everything and transition `top`/`left`. That animates layout properties
   — every frame re-runs layout for the whole list, on the main thread —
   and it throws away flex/grid, which is why the list was readable.

## What changed in the refactor

- **Stable keys first.** `key={item.id}` makes each tile a real, persistent
  element that React *moves* instead of rewrites. The stars follow their
  fruit, and now there is something to animate.
- **FLIP** — First, Last, Invert, Play. Measure where tiles were, let React
  reorder them, measure where they landed, offset each one back onto its
  old spot with `transform`, then remove the offset and let CSS carry it
  home. The user never sees the jump because the offset is applied before
  the browser paints.
- **`useLayoutEffect`, not `useEffect`.** Layout effects run after the DOM
  is updated and *before* paint. That gap is the only place the Invert step
  can hide; in `useEffect` the user sees one frame of the teleport first.
- **`computeInversions(prevRects, nextRects)` is pure and extracted** —
  previous minus current, ids missing on either side skipped, sub-pixel
  moves dropped. Eleven Node tests for an animation, with no browser.
- **`transform`, not `top`/`left`.** Transforms are composited: they don't
  re-run layout, so a shuffle of eight tiles is as cheap as one.
- **The forced reflow is commented, not cargo-culted.** `void
  document.body.offsetHeight` between Invert and Play is what makes the
  browser accept the inverted position as the starting frame; without it
  both writes batch into one and nothing animates.
- **Refs used correctly** (project 26): a `Map` of id → element and inline
  `style.transform` writes. This is the legitimate exception to project 15
  — a transient visual effect that is not truth about the app, that React
  is not rendering from, and that no feature will ever want to read.

## Key takeaway

Animation is not a state problem; it's a *difference between two layouts*
problem. Let React do what it does — put the elements in the right order —
then measure, subtract, and hand the difference to the compositor. Every
layout-animation library (Framer Motion's `layout`, `react-flip-toolkit`,
the browser's own View Transitions) is this same four-step dance around
one subtraction. Extract the subtraction and your animation gets a test
suite.
