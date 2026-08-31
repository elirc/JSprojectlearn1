# React 54 — List virtualization

**Lesson: the DOM is the expensive part. Render the twenty rows the user can
see, not the five thousand that exist.**

## Run it

```
open original.html and refactored/index.html in a browser
type in the filter box on BOTH and compare the "last render" readouts
node --test react/54-list-virtualization/refactored/window.test.js   <- the window math, tested in Node
```

Both pages show the same 5,000 people, the same filter, the same 400px box.
Only one of them stays responsive while you type.

## What's wrong with the original?

Nothing is buggy, and — read this carefully — nothing is unoptimised either.
The keys are stable (project 03), the filter is wrapped in `useMemo` (project
27), the rows are a clean child component. The page still crawls, and that is
the whole lesson: **the cost isn't the filtering, it's the rendering.** Every
keystroke hands React 5,000 elements to reconcile and hands the browser
~25,000 DOM nodes to style, lay out and paint — for a container that can show
ten rows at a time. Memoising the filter makes a millisecond of array work
into zero milliseconds of array work, and leaves the hundreds of milliseconds
of DOM work exactly where they were. Project 27 taught "cache expensive work";
this project teaches the sharper version — **first find out which work is
expensive**, because the honest answer here is work `useMemo` cannot touch.

## What changed in the refactor

- **`computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan)`** —
  a pure function, in `window.js`, that answers "which rows are on screen?"
  with five numbers: `startIndex`, `endIndex`, `visibleCount`, `offsetY`,
  `totalHeight`. No React, no DOM, so `window.test.js` pins down every edge
  in Node: bounce-scrolling to a negative `scrollTop`, empty lists, lists
  shorter than the viewport, overscan clamped at both ends. Writing the tests
  found a real bug — `scrollTop` outruns the list the instant the filter
  shrinks it, and the unclamped version returned an inverted, empty range.
- **The component slices instead of mapping**: `visible.slice(startIndex,
  endIndex + 1)` — about seventeen rows in the DOM at any moment, at any
  scroll position, over any list length. The "rows rendered" counter on the
  page says so out loud.
- **A spacer keeps the scrollbar honest.** An inner div of `totalHeight`
  (200,000px here) reserves the space the missing rows would have taken, and
  the rendered slice is pushed down by `offsetY`. The scrollbar behaves as if
  all 5,000 rows were there, because as far as scroll geometry is concerned,
  they are.
- **`overscan` buys smoothness for free**: rendering three extra rows above
  and below the viewport means a fast scroll paints real rows instead of
  white gaps, at a cost of six rows.
- **`key={row.id}`, never the slice index.** The indexes `0..16` stay the same
  as you scroll while the *people* underneath them change — an index key here
  is project 03's bug in its most confusing costume, where a checked box
  slides onto a stranger mid-scroll.
- Honest costs (on the page): Ctrl+F can't find a row that was never
  rendered, and screen readers need an explicit count because the DOM no
  longer knows one. Real libraries (react-window, TanStack Virtual) and CSS
  `content-visibility` add variable heights, sticky headers and scroll
  anchoring on top of this arithmetic.

## Key takeaway

Before optimising, ask which machine is busy. React work (reconciliation) and
browser work (layout and paint) have different fixes, and `useMemo` only ever
addresses the first. When a list is long, the winning move isn't to render it
faster — it's to *not render most of it*, and to keep the scrollbar's promise
with a spacer. The decision of what to render is arithmetic, which means it
belongs in a pure function with tests, not in a scroll handler.
