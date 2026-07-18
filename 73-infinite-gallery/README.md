# 73 — Infinite-scroll image gallery

**Lesson: the capstone of browser performance — IntersectionObserver
instead of scroll-polling, an in-flight guard, and a virtualized window so
the DOM stays constant while the list grows forever.**

## Run it

```
node --test 73-infinite-gallery/
```

Then open both HTML files and **watch the counters** in the corner while
you scroll hard for a minute. The original's DOM node count climbs
forever; the refactor's sits near 13, whether you've loaded 40 items or
4,000.

## What's wrong with the original?

1. **Eager image loading**: every appended image loads immediately —
   including the 900 nowhere near the viewport. Real API: megabytes of
   wasted transfer.
2. **Scroll polling**: dozens of events per second, each doing
   layout-forcing reads (`scrollY`, `offsetHeight`).
3. **No in-flight guard**: every scroll tick inside the bottom zone
   starts *another* fetch of the same page — scroll fast, get duplicates.
4. **The DOM grows forever.** 25 pages = 1,000 nodes for a screen that
   fits eight. Layout, paint, and memory climb until the tab crawls.
   This is the bug that makes "infinite scroll" apps die at page 50.

## What changed in the refactor

- **`IntersectionObserver` replaces scroll-polling for loading**: a 1px
  sentinel under the list, `rootMargin: '600px'` so fetching starts
  before the user reaches the edge. The browser tells *us* — no polling,
  no layout reads. An `inFlight` boolean makes duplicate fetches
  impossible (project 48's phase-guard, one bit big).
- **Virtualization — the star of the show.** `visibleRange()` (pure,
  in `window.js`, tested in Node) answers: given scrollTop, which slice
  of items should exist, and how much spacer padding stands in for the
  rest? The invariant test is the whole trick:
  `topPadding + renderedHeight + bottomPadding === totalItems × itemHeight`
  — the scrollbar can't tell the difference. One test renders "a million
  items" and asserts the DOM budget stays ≤ 14.
- **Scroll updates the window via `requestAnimationFrame`** — at most one
  render per frame, aligned with paint. This is the principled version of
  project 28's throttle: instead of guessing a milliseconds number, let
  the frame *be* the interval. (`passive: true` so scrolling never waits
  on our handler.)
- `loading="lazy"` on the images as belt-and-suspenders for real
  networks, and measurement built into the page — the stats box *is* the
  performance test.

## Key takeaway

Browser performance is mostly one discipline: **do work proportional to
what the user can see, not to what exists.** Observers over polling
(don't ask, be told), rAF over event storms (one render per paint), and
windows over accumulation (the DOM is a viewport, not a warehouse).
Every "smooth infinite list" you've ever used — Twitter, Instagram,
VS Code's file tree — is `visibleRange()` wearing a trench coat.
