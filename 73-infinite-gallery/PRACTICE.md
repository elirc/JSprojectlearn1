# 🏋️ Practice: Infinite-Scroll Gallery

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Test the empty gallery (warm-up)
Before the very first page arrives from the API, the page calls `render()` with `items.length === 0` — a state none of the current tests cover. Add a test to `window.test.js` asserting what `visibleRange` returns for `totalItems: 0` (any `scrollTop: 0`, `viewportHeight: 600`, `itemHeight: 100`). Predict the whole object before running it.
What it practices: covering the "nothing loaded yet" edge case that real pages spend their first 300ms in.
Hint: walk the four lines of `visibleRange` by hand with `totalItems = 0` — `Math.min` and `Math.max` do all the work. Expected: every field is 0, and the render loop draws nothing.

### ⭐⭐ 2. A sticky header enters the math (core)
Real pages have a banner above the list. Add a `headerHeight` option (default `0`) to `visibleRange`: the list only starts moving after the user has scrolled past the header. With `headerHeight: 300`, `scrollTop: 50_300` must give exactly the same result as `scrollTop: 50_000` gives today (`start: 497, end: 510`), and `scrollTop: 120` must behave like the top of the list (`start: 0, end: 10, topPadding: 0`). All six existing tests must still pass unchanged.
What it practices: extending a pure function with a defaulted option without breaking its contract.
Hint: convert page scroll to list scroll first — `Math.max(0, scrollTop - headerHeight)` — then leave the rest of the function alone.

### ⭐⭐ 3. Skip renders when nothing changed (core)
Scrolling 40px inside the same row produces the exact same window, yet `render()` rebuilds the DOM anyway. Write a pure helper `sameRange(a, b)` that returns `true` when two `visibleRange` results are identical, then use it in the page: keep the last range in a variable and return early from `render()` when nothing changed (move `renders++` after the early return). Checkable in node: ranges for `scrollTop: 0` and `scrollTop: 40` are the same, `scrollTop: 140` is not. Checkable in the page: nudging the wheel a few pixels no longer bumps the "renders" counter.
What it practices: derived state — do work only when the derived answer actually changed.
Hint: comparing `start`/`end` is not enough. When a new page arrives, `bottomPadding` grows while the slice stays put — compare all four fields, or the scrollbar stops growing.

### ⭐⭐ 4. Overscan grows a direction (core)
People scroll down far more than up, so padding rows above and below equally is wasteful. Generalize `overscan` to accept either a number (exactly today's behaviour) or `{ above, below }`. With `overscan: { above: 0, below: 6 }` at `scrollTop: 50_000` you must get `start: 500, end: 513`; with plain `3` the result must be byte-for-byte what it is today, and all six existing tests must stay green.
What it practices: generalizing a rule while keeping the old call shape working (backwards compatibility).
Hint: normalize first — two `typeof overscan === 'number'` checks at the top turn both shapes into `above`/`below`, and the rest of the function never knows.

### ⭐⭐⭐ 5. Survive the over-scroll (challenge)
Feed `visibleRange` a `scrollTop` far past the end of the list — `150_000` with the standard base (1000 items × 100px = a 100,000px list). Write a test showing the current code returns `start: 1497` but `end: 1000` — start has sailed *past* end, and `topPadding` is 149,700px: taller than the entire list should be, so the page physically **grows** the further past the end you scroll. Then fix `visibleRange` so `start` can never pass `end`. After the fix, `scrollTop: 150_000` must return exactly `{ start: 1000, end: 1000, topPadding: 100_000, bottomPadding: 0 }`, and all six existing tests must still pass.
What it practices: hunting an uncovered edge case in a "finished" pure function, then fixing it without disturbing a single covered case.
Hint: compute `end` first, then clamp: `Math.max(0, Math.min(first - overscan, end))`. Check by hand that the clamp is invisible in every existing test (it only bites when `first - overscan > end`).

### ⭐⭐⭐ 6. The end of infinity (challenge)
The fake API never runs out — real ones do. Write `makeFinitePager(totalItems, pageSize, delay = 300)` that returns a `fetchPage(page)` function serving items `0..totalItems-1` in pages: `makeFinitePager(100, 40)` must give page 0 → 40 items (`0..39`), page 2 → 20 items (`80..99`), page 3 → `[]`. Then wire it into the page: when a page comes back shorter than `pageSize`, set a `done` flag, call `observer.disconnect()`, and show `— end —` in `#loading`. Observable: the gallery stops at Photo #99, the item counter freezes at 100, and no further fetches ever start.
What it practices: building a fake with a real API's shape (project 50's lesson) plus teaching the observer loop to terminate.
Hint: the slice for page `p` runs from `p * pageSize` up to `Math.min(p * pageSize + pageSize, totalItems)` — the `Math.min` is what makes the last page short and every later page empty.

## Solutions

### 1. Test the empty gallery
```js
test('empty gallery: before the first page arrives', () => {
  const r = visibleRange({ scrollTop: 0, viewportHeight: 600, itemHeight: 100, totalItems: 0 });
  assert.deepEqual(r, { start: 0, end: 0, topPadding: 0, bottomPadding: 0 });
});
```
WHY: `first` is 0, `start` clamps to 0, and `end = Math.min(0, 10)` is 0 — so the loop `for (i = start; i < end)` runs zero times and both paddings are 0px. The clamps that keep the window inside the list also make the empty list a non-event: no special case needed. That is the payoff of pure math — the weirdest page state is a one-line test.

### 2. A sticky header enters the math
```js
export function visibleRange({ scrollTop, viewportHeight, itemHeight, totalItems,
                               overscan = 3, headerHeight = 0 }) {
  const listScroll = Math.max(0, scrollTop - headerHeight);
  const first = Math.floor(listScroll / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1;
  const start = Math.max(0, first - overscan);
  const end = Math.min(totalItems, first + visibleCount + overscan);
  return { start, end, topPadding: start * itemHeight,
           bottomPadding: (totalItems - end) * itemHeight };
}

test('a 300px header consumes the first 300px of scroll', () => {
  assert.deepEqual(visibleRange({ ...base, scrollTop: 50_300, headerHeight: 300 }),
                   visibleRange({ ...base, scrollTop: 50_000 }));            // start 497, end 510
  const top = visibleRange({ ...base, scrollTop: 120, headerHeight: 300 });
  assert.deepEqual([top.start, top.end, top.topPadding], [0, 10, 0]);
});
```
WHY: one translation at the top (`page scroll → list scroll`) and the rest of the function is untouched, so `headerHeight: 0` is literally the old code — that's why all six existing tests stay green. While the header is partly on screen we render a row more than strictly visible, which errs on the safe side (content, never blank). Defaulted options are how a pure function grows features without breaking a single caller.

### 3. Skip renders when nothing changed
```js
export function sameRange(a, b) {
  return a.start === b.start && a.end === b.end &&
         a.topPadding === b.topPadding && a.bottomPadding === b.bottomPadding;
}

// in index.html:
let lastRange = null;
function render() {
  const range = visibleRange({ scrollTop: window.scrollY, viewportHeight: window.innerHeight,
                               itemHeight: ITEM_HEIGHT, totalItems: items.length });
  if (lastRange && sameRange(range, lastRange)) return;   // nothing to do
  lastRange = range;
  // ...existing DOM work, then renders++ and the stats line...
}
```
WHY: rAF already caps renders at one per frame; this caps them at one per *change* — the two guards compose. Comparing all four fields matters: when a fetch lands, `totalItems` grows, so `bottomPadding` changes while `start`/`end` don't — compare only the slice and the scrollbar would freeze. Node check: `scrollTop` 0 vs 40 → `true`; 0 vs 140 → `false`; 0 with 1000 items vs 0 with 1040 → `false`.

### 4. Overscan grows a direction
```js
export function visibleRange({ scrollTop, viewportHeight, itemHeight, totalItems, overscan = 3 }) {
  const above = typeof overscan === 'number' ? overscan : overscan.above;
  const below = typeof overscan === 'number' ? overscan : overscan.below;
  const first = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1;
  const start = Math.max(0, first - above);
  const end = Math.min(totalItems, first + visibleCount + below);
  return { start, end, topPadding: start * itemHeight,
           bottomPadding: (totalItems - end) * itemHeight };
}

test('asymmetric overscan', () => {
  const r = visibleRange({ ...base, scrollTop: 50_000, overscan: { above: 0, below: 6 } });
  assert.equal(r.start, 500);   // no rows wasted above
  assert.equal(r.end, 513);     // 500 + 7 visible + 6 below
});
```
WHY: normalize the flexible input at the boundary, keep the core oblivious — the same shape as project 50's config handling. A number still means "same in both directions", so every existing caller and test is untouched (verified: the whole old suite passes against this version). The exercise is the API-design lesson: generalize by *widening* what you accept, never by changing what old inputs mean.

### 5. Survive the over-scroll
```js
test('over-scrolled: the old code lies', () => {
  const r = visibleRange({ ...base, scrollTop: 150_000 });   // list is only 100_000px tall
  assert.equal(r.start, 1497);          // start passed end (1000)!
  assert.equal(r.topPadding, 149_700);  // taller than the whole list — the page GROWS
});

// the fix: compute end first, then forbid start from passing it
const end = Math.min(totalItems, first + visibleCount + overscan);
const start = Math.max(0, Math.min(first - overscan, end));

test('over-scrolled: start never passes end, paddings stay honest', () => {
  const r = visibleRange({ ...base, scrollTop: 150_000 });
  assert.deepEqual(r, { start: 1000, end: 1000, topPadding: 100_000, bottomPadding: 0 });
});
```
WHY: over-scroll is real — rubber-banding, items removed, or `itemHeight` shrinking can all leave `scrollTop` past the end, and the unclamped `topPadding` then makes the page taller, which permits even more scrolling: a feedback loop. The clamp only engages when `first - overscan > end`, which is impossible inside the list — that is why all six existing tests pass unmodified (verified). The invariant test from the README couldn't catch this because `topPadding + (end−start)·h + bottomPadding` cancels algebraically even when the range is nonsense — a reminder that invariants check consistency, not sanity, so edges still need their own tests.

### 6. The end of infinity
```js
export function makeFinitePager(totalItems, pageSize, delay = 300) {
  return function fetchPage(page) {
    const first = page * pageSize;
    const items = [];
    for (let i = first; i < Math.min(first + pageSize, totalItems); i++) items.push(i);
    return new Promise((resolve) => setTimeout(() => resolve(items), delay));
  };
}

// in the observer callback, after `items = items.concat(page);`:
if (page.length < PAGE_SIZE) {                 // short page = last page
  done = true;
  observer.disconnect();                       // never fires again
  document.getElementById('loading').textContent = '— end —';
} else {
  document.getElementById('loading').textContent = '';
  observer.unobserve(sentinel); observer.observe(sentinel);
}
```
WHY: the pager is a fake with the real API's *shape* — page-numbered, promise-returning, latency included — so the page logic that talks to it would work against a real server unchanged (`makeFinitePager(100, 40, 0)` in a node test: page 0 → `0..39`, page 2 → `80..99`, page 3 → `[]`, all verified). "Short page means done" is the standard end-of-data signal in paginated APIs. `observer.disconnect()` is the observer-world version of clearing a timer: the loop that drove infinite loading is told, once, to stop — no flag-checking on every event needed afterwards.
