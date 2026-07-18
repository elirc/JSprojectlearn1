# React 26 — Refs for values

**Lesson: `useState` is for values the *screen* depends on; `useRef` is the
mutable box for everything else a component needs to remember.**

## Run it

Open `original.html` and wiggle your mouse over the box: the render counter
climbs by hundreds. The refactor's counter moves only when a displayed number
actually changes.

## What's wrong with the original?

Two values that **no pixel depends on** — `lastClickTime` (read only inside the
click handler) and `mouseX` (read nowhere at all) — live in `useState`. Every
write schedules a full re-render:

1. **The mousemove firehose**: each pixel of motion re-renders the entire app
   for a value the screen never shows. This exact pattern (cursor positions,
   scroll offsets, drag deltas in state) is the most common self-inflicted
   React performance wound.
2. **A correctness bug rides along**: handlers read state from the render
   snapshot (project 11), so a hyper-fast double click computes the gap from a
   *stale* `lastClickTime`. Values used only imperatively don't fit the
   snapshot model — they fight it.

## What changed in the refactor

- **The sorting rule** (printed on the page): *does the screen need to change
  when this value changes?* Yes → `useState`. No → `useRef`. `gap`/`bestGap`
  render, so they stay state; `lastClickTime`/`lastMouseX` became refs.
- **What a ref is**: a mutable `{ current }` box that survives renders.
  Writing it re-renders nothing (none needed); reading it always gives the
  latest value — no snapshot, so the double-click staleness bug vanishes too.
  Refs are js#27's "function with a private mutable variable," provided
  per-component by React — the same box that held DOM nodes in project 15 and
  the latest callback in project 25.
- **The discipline that keeps refs safe**: never *read* a ref during render.
  If JSX needs it, it was state all along. Refs are for the component's
  *bookkeeping* (timer ids, previous values, latest-callbacks, DOM nodes) —
  things React shouldn't repaint over.

## Key takeaway

Components remember two kinds of things: what they *show* (state — changing it
is asking for a repaint) and what they merely *know* (refs — changing it is
none of the renderer's business). Putting "know" values in state buys you
re-render storms and stale snapshots; the fix is one hook swap.
