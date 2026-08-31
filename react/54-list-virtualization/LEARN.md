# 📘 Learning Guide: List Virtualization

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A directory of 5,000 people: a search box, a small monospace readout, a
line saying how many rows are rendered, and a 400-pixel-tall scrolling
box of rows — each with a round avatar, a name, an email and a team
badge. Both versions look identical and scroll to the same places.

The difference appears the moment you type in the filter box: on
`original.html` the readout climbs into the hundreds of milliseconds
and your letters arrive late, in clumps; on `refactored/index.html` it
stays in single or low double digits. The refactor is not rendering
*faster* — it is rendering *less*: about seventeen rows instead of five
thousand, however long the list is and wherever you have scrolled.

## 2. Concepts you need first

### What a DOM node actually costs

A **DOM node** is one live element in the browser's document — one
`<div>`, one `<span>`. Each costs **memory** (a real object with dozens
of fields), **style recalculation** (matching every CSS rule against
it), **layout** — also called **reflow** — (computing where it goes and
how big it is, in coordination with its neighbours), and **paint**
(turning that into pixels). One row here is five nodes, so 5,000 rows
is roughly **25,000 nodes** — and the browser styles and lays out all
of them, including the ones scrolled far out of sight. It cannot know
they're irrelevant; you asked for them.

### React work vs browser work (and why `useMemo` only helps one)

Two machines are busy when you type. **React work — reconciliation:**
React re-runs your component, builds a tree of elements, and compares
it with last time to work out what changed. **Browser work — style,
layout, paint:** React hands the DOM changes over and the browser pays
the four costs above. Project 27 taught `useMemo`: cache an expensive
calculation so it doesn't re-run every keystroke. That is a tool for a
*third* category — your own JavaScript, like a filter — and it touches
neither machine above. Here the filter takes about a millisecond and
the rendering takes hundreds, so you can memoise it perfectly and
change nothing you can feel. That is why "measure first" isn't a
slogan.

### Windowing (also called virtualization)

**Windowing** is the idea that a scrolling list only needs to *contain*
the rows currently inside the viewport; the other 4,983 stay in your
JavaScript array, where they are cheap. As you scroll, the window of
rendered rows slides along the array. "Virtualization" is the same idea
under a fancier name: the list *appears* 5,000 rows long, and only a
handful of it is real.

### Scroll geometry vocabulary

```
                    ┌─────────────────────────┐  ─┐
   scrollTop  ──►   │   (scrolled past)       │   │
   how far you      │                         │   │  scrollHeight
   have scrolled    ├═════════════════════════┤  ─┤  the FULL height
                    ║  row 30                 ║   │  of the content
   clientHeight     ║  row 31   ← the         ║   │  (200,000px here)
   the visible      ║  row 32     viewport    ║   │
   box: 400px       ║  ...                    ║   │
                    ├═════════════════════════┤  ─┤
                    │   (not yet scrolled to) │   │
                    └─────────────────────────┘  ─┘
```

- **`scrollTop`** — pixels scrolled off the top; `0` at the top, and at
  the very bottom it equals `scrollHeight - clientHeight`.
- **`clientHeight`** — the visible box (our 400px). **`scrollHeight`** —
  everything inside it. **`offsetTop`** — how far an element sits from
  the top of its positioned ancestor; we *compute* ours rather than
  measure it.

### The spacer, and overscan

Put only seventeen rows in the box and its content is ~680px tall, so
the scrollbar shrinks to match — scrollbars measure real content. That
is a lie; the user believes there are 5,000 rows. A **spacer** fixes
it: one empty div as tall as the whole list (5,000 × 40 = 200,000px),
with the real rows inside it pushed down by `offsetY` so they land
where those rows *would* have been. The scrollbar measures the spacer
and tells the truth; the DOM stays tiny.

**Overscan** is rendering a few extra rows just outside the viewport on
purpose. Without it a fast scroll can outrun React and show white for a
frame. Three each way costs six rows and removes the flicker.

## 3. Walking through the original code

The data is generated once, deterministically, so both pages show the
same people: `const ROWS = makeRows(5000);`. The component is
textbook-correct. It filters inside a `useMemo` keyed on `[query]`, so
the filtering re-runs only when you actually type — project 27's advice,
followed exactly. Then it renders the result with a stable key:

```jsx
<div className="scroller" ref={scrollerRef}>
  {visible.map((row) => <Row key={row.id} row={row} />)}
</div>
```

Read that `map` again — it is the entire bug. `visible.length` is 5,000
until you type. Every one becomes a `<Row>`, and every `<Row>` becomes
five DOM nodes.

The readout above it (`useRenderClock`) has two deliberate quirks, both
commented in the file: it reads `scrollHeight` to force the browser to
finish laying out what React just committed, so the number covers
browser work and not only React's; and it writes to a DOM node rather
than calling `setState`, because a measurement that triggered another
render would be part of the experiment it observes.

## 4. What's wrong with it (in beginner terms)

Type one letter. Before it appears on screen: React re-runs `App` and
filters 5,000 people (about a millisecond), builds ~5,000 `<Row>`
elements and diffs them against the previous ~5,000, patches the DOM,
and then the browser recalculates styles, lays out and paints tens of
thousands of nodes. Everything after that first millisecond is what
the readout shows you,
and all of it happens *before the browser is free to draw your
keystroke*. That freeze has a name: **jank**. A browser gets about **16
milliseconds** per frame to hold 60 frames a second; we're blowing that
tenfold. And the box is 400px tall — it shows ten rows. Nearly all that
work was done for rows nobody will look at before the next letter.

**What's NOT wrong:** the keys are right, the filter is memoised, the
row is a tidy component. The structure is wrong a level above tidiness
— the app is *asking for* more than it needs, and no amount of
doing-it-faster fixes asking for too much.

## 5. Try it yourself first!

1. **Vague:** the box shows ten rows. You render 5,000. What if you
   just… didn't?
2. **Warmer:** to render only the visible rows you must know which ones
   those are. What does the browser tell you about scroll position, and
   what do you already know about row height?
3. **Warmer still:** `scrollTop` divided by row height is the first
   visible row's index; viewport height divided by row height is how
   many fit. That's a `slice`.
4. **The problem you'll hit immediately:** with ten rows in the box the
   scrollbar shrinks to nothing and scrolling stops working. The
   container must stay 200,000 pixels tall while holding ten rows. What
   element could take that space, and how do you push the rows down to
   where they belong?
5. **The trap:** you now have `visible.slice(start, end)`. Do NOT write
   `key={i}` on it — what does index `0` refer to before and after a
   scroll?
6. **Check your work:** put the row count on screen; it should read
   about seventeen everywhere in the list.

## 6. Understanding the refactored solution

### The window math, step by step with real numbers

Take our page — `rowHeight` 40, viewport 400, 5,000 rows, overscan 3 —
with the user scrolled to `scrollTop = 1234`:

```
firstVisible = floor(1234 / 40)           = 30     ← row 30 is under the top edge
visibleRows  = ceil(400 / 40) + 1         = 11     ← 10 whole rows + a partial one
startIndex   = max(0, 30 - 3)             = 27     ← 3 overscan rows above
endIndex     = min(4999, 30 + 11 - 1 + 3) = 43     ← 3 overscan rows below
visibleCount = 43 - 27 + 1                = 17
offsetY      = 27 * 40                    = 1080   ← push the slice down this far
totalHeight  = 5000 * 40                  = 200000 ← what the spacer reserves
```

Seventeen rows. That is the whole list, in the DOM, at that moment.

Why `+ 1` in `visibleRows`? A 400px viewport over 40px rows shows ten
*whole* rows only when `scrollTop` is a clean multiple of 40. At 1234
you see a sliver of row 30 at the top and a sliver of row 40 at the
bottom — eleven rows touched, and rounding down leaves a white stripe.
Why `max` and `min`? The arithmetic will happily walk off both ends:
near the top `30 - 3` is `-2`, near the bottom the end index sails past
4999. Bounce-scrolling even reports a *negative* `scrollTop`, absorbed
by `Math.max(0, scrollTop)` before it becomes a negative index.

There is a subtler clamp inside `firstVisible`:

```js
const firstVisible = Math.min(Math.floor(safeScrollTop / rowHeight), total - 1);
```

That one was found by a test, not by thinking. Scroll to row 4000, then
filter down to twelve people: for one render `scrollTop` is still
160,000 while `total` is 12, because the browser hasn't reset the
scroll position yet. Without the clamp that render asks for rows
3997–4012 of a twelve-row array and gets an inverted, empty range — a
list that flashes blank then fixes itself, the kind of bug you'd spend
an afternoon failing to reproduce.

### Pure decision, imperative doing

`computeWindow` contains no React and no DOM — five numbers in, five
out — which is why `window.test.js` pins down bounce scrolling, empty
lists and both clamps in Node, in milliseconds, with no browser. The JS
track's "separate deciding from doing" turns up somewhere unexpected:
*scrolling* is a pure function with a rendering side effect attached.

### The component, three divs deep

```jsx
const win = computeWindow(scrollTop, ROW_HEIGHT, VIEWPORT_HEIGHT, visible.length, OVERSCAN);
const slice = visible.slice(win.startIndex, win.endIndex + 1);  // endIndex is inclusive

<div className="scroller" onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
  <div style={{ height: win.totalHeight, position: 'relative' }}>
    <div style={{ transform: 'translateY(' + win.offsetY + 'px)' }}>
      {slice.map((row) => <Row key={row.id} row={row} />)}
    </div>
  </div>
</div>
```

Three nested divs, one job each: the outer scrolls, the middle is the
200,000px spacer that keeps the scrollbar honest, the inner is pushed
down by `offsetY` so row 27 lands where row 27 belongs.

Storing `scrollTop` in state means **every scroll event re-renders
`App`** — which sounds alarming and isn't, because each of those
renders produces seventeen rows. Trading many cheap renders for one
enormous one is the whole deal, and `overscan` covers the frames where
a scroll outruns the render. As for the key: with `key={i}` the keys
`0..16` stay identical while the *people* underneath them change, so
React reuses row 0's DOM node — and its state — for whoever is at the
top now. Project 03 taught this with three items; virtualization is
where it gets hard to diagnose.

### Honest costs

Windowing is a trade: rows never rendered can't be found by Ctrl+F,
can't be copied by selecting the page, and are invisible to a screen
reader unless you supply the real count. Real libraries (react-window,
TanStack Virtual) add variable heights, sticky headers and scroll
anchoring, and CSS `content-visibility` gets some of it with no JS —
all built on the arithmetic above.

## 7. Words you learned (glossary)

- **DOM node:** one live element in the document — costly in memory,
  style, layout and paint.
- **Reflow / layout:** the browser computing where every element goes
  and how big it is. **Paint:** turning that into pixels.
- **Reconciliation:** React diffing the new element tree against the
  previous one to find the minimum DOM changes.
- **Windowing / virtualization:** rendering only the rows inside the
  viewport while the rest live in a plain array.
- **Viewport:** the visible part of a scrolling container.
  **`scrollTop`:** how many pixels have scrolled off its top.
  **`clientHeight` / `scrollHeight`:** its visible height / its full
  content height.
- **Spacer:** an empty element sized to the full list height so the
  scrollbar reflects the real number of rows. **`offsetY`:** how far
  down the rendered slice is pushed so its rows land in place.
- **Overscan:** extra rows rendered just outside the viewport to hide
  blank flashes during fast scrolling.
- **Row height:** the fixed pixel height of one row — the assumption
  that makes the arithmetic possible.
- **Slice:** the contiguous chunk of the array actually rendered.
- **Key:** the identity React uses to match elements across renders,
  which is why it must follow the *data*, not the position.
- **Jank:** visible stutter caused by work that overruns a frame.
- **Frame budget:** ~16 milliseconds per frame at 60 frames a second.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load. The Node tests need nothing at all.

1. **Find the cliff.** In `original.html` change `makeRows(5000)` to
   500, then 2,000, then 10,000, noting the readout each time.
   Expected: the number grows roughly in proportion to the row count —
   the definition of a cost you cannot memoise away, and the reason the
   refactor's number barely moves when you do the same to it.
2. **Delete the spacer.** Remove `height: win.totalHeight` from the
   middle div. Expected: the scrollbar collapses to almost nothing and
   you can scroll only a few hundred pixels — the list really is as
   short as the DOM says. That div is doing work, not decoration.
3. **Turn off overscan.** Set `OVERSCAN` to `0` and flick-scroll hard;
   expected, white stripes at the leading edge for a frame or two. Then
   set it to `20`: "rows rendered" jumps to about 51 for no visible
   gain — more overscan is the original problem in miniature.
4. **Predict, then check, the bottom.** Before scrolling there, work
   out on paper what `computeWindow(199600, 40, 400, 5000, 3)` returns.
   Expected: `startIndex` 4987, `endIndex` 4999, `visibleCount` 13 —
   fewer than the usual 17, because three overscan rows below row 4999
   don't exist and the `min` clamp quietly drops them.
5. **Watch the filter clamp fire.** Scroll near the bottom, then filter
   down to very few people: the short list appears at once. Now delete
   the `Math.min(…, total - 1)` from `firstVisible` and repeat.
   Expected: one blank frame — the bug the tests caught first.
