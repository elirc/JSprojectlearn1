# 📘 Learning Guide: Virtual List

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A scrolling list of 10,000 rows that feels exactly like a list of 10,000 rows — same scrollbar, same row heights, same everything — while only about eighteen rows exist in the page at any moment.

The trick is a **window**: a small opening that slides over a large amount of data.

```
   data (10,000 rows)          what the DOM contains
   ┌───────────┐
   │ row 0     │               ┌──────────────────┐
   │ row 1     │               │  empty div       │  <- as tall as rows 0..97
   │ ...       │               ├──────────────────┤
   │ row 98    │  ◀── window ─▶│  row 98          │
   │ ...       │               │  ... 18 rows ... │
   │ row 115   │  ◀───────────▶│  row 115         │
   │ ...       │               ├──────────────────┤
   │ row 9,999 │               │  empty div       │  <- as tall as rows 116..9,999
   └───────────┘               └──────────────────┘
```

Two empty divs hold the space open so the scrollbar stays honest, and as you scroll, the window slides: rows leave the top, rows arrive at the bottom, and the count in the middle never grows. This is called **virtualization** or **windowing**, and it's how every large list in every real app works.

You've seen a version of this before: project 73's gallery used it as one ingredient of a bigger capstone (alongside `IntersectionObserver` and in-flight guards). Here it's the whole subject — the math drawn out line by line, the DOM cost measured on screen, and the over-scroll edge case that project 73 left as an exercise built into the function from the start.

## 2. Concepts you need first

### Why DOM nodes cost so much

A JavaScript object is nearly free — `{id: 5, label: 'x'}` is a few dozen bytes and nothing watches it. A DOM element is a different animal: the browser must keep it in the document tree, give it a box in the **layout** (where is it? how big?), consider it when **painting**, hand it to the accessibility tree, and check it against every CSS rule. Ten thousand of those is real work, repeated on every layout pass, forever — including for the 9,988 nobody is looking at.

So the rule of thumb: **data is cheap, elements are expensive.** You can hold a million rows in an array without blinking. Putting a million rows in the DOM will kill the tab.

### The viewport, scrollTop, and the invisible page

A scrolling box has three numbers:

- `viewportHeight` — how tall the *visible* box is (400px in this project).
- `scrollTop` — how far you've scrolled *inside* it, in pixels from the top.
- the **content height** — how tall the stuff inside is. If content is taller than the viewport, you get a scrollbar; the length of the scrollbar's thumb is the ratio between them.

Crucially, the browser decides the scrollbar from the content's *height*, not from how many elements produced it. One 320,000px-tall empty div gives exactly the same scrollbar as 10,000 rows of 32px. That's the loophole this whole project walks through.

### The window math, drawn out

Every row is `rowHeight` tall (32px here), so the row at the very top of the viewport is:

```
firstVisible = Math.floor(scrollTop / rowHeight)
```

At `scrollTop = 3200`: `3200 / 32 = 100`, so row 100 is at the top. How many rows fit?

```
rowsOnScreen = Math.ceil(viewportHeight / rowHeight) + 1
             = Math.ceil(400 / 32) + 1 = 13 + 1 = 14
```

Why the `+ 1`? Because you're rarely scrolled to an exact row boundary: at `scrollTop = 3210` you see the bottom sliver of row 100 *and* the top sliver of row 114. One extra row covers that.

Then a safety margin called **overscan**: a couple of rows above and below, rendered but off-screen, so a fast flick shows content instead of white:

```
start = firstVisible - overscan            (never below 0)
end   = firstVisible + rowsOnScreen + overscan   (never past the total)
```

And the two spacers, which is where it all clicks:

```
topSpacer    = start * rowHeight                 // the rows we skipped above
bottomSpacer = (total - end) * rowHeight         // the rows we skipped below
```

Add it up and you always get the full height:

```
topSpacer + (end - start) * rowHeight + bottomSpacer === total * rowHeight
```

That identity is the promise to the scrollbar. If you ever break it, the page grows or shrinks as you scroll and the thumb jitters — the classic sign of a home-made virtual list with a bug in it.

### `Math.floor`, `Math.ceil`, and clamping

`Math.floor` rounds down ("which row *contains* this pixel"), `Math.ceil` rounds up ("how many rows to *cover* this height"). **Clamping** means squeezing a number into a legal range: `Math.min(Math.max(value, low), high)`. You need it because real `scrollTop` values go outside the range you expect — trackpads over-scroll (rubber-banding), and code that restores a saved position can overshoot a list that got shorter.

### Event delegation

Instead of 10,000 click listeners, put **one** on the container. Clicks bubble upwards through ancestors, so the container hears every row's click and asks `event.target.closest('.row')` which row it was. One listener, no per-row bookkeeping — and it keeps working for rows that don't exist yet, which is the whole point here.

## 3. Walking through the original code

The data is fine — 10,000 plain objects, made instantly:

```js
for (var i = 0; i < TOTAL; i++) {
  rows.push({ id: i, label: "Transaction #" + i, amount: (i * 7919) % 1000 });
}
```

Then it renders by making an element for every single one:

```js
for (var i = 0; i < rows.length; i++) {
  var row = document.createElement("div");
  ...
  row.addEventListener("click", function () { ... });   // x 10,000
  list.appendChild(row);                                 // x 10,000
}
```

Nothing here is *wrong* in the sense of a mistake. It's the direct translation of "show a list of items", it's what everyone writes first, and it's completely correct — it just costs 10,000 of the most expensive thing on the page to show thirteen.

The sort button reveals the shape of the problem:

```js
rows.sort(function (a, b) { return b.amount - a.amount; });
buildEverything();  // <- the freeze lives here, not in sort()
```

## 4. What's wrong with it (in beginner terms)

**Flaw 1: it does work proportional to the data, not to the screen.** The user has one screen. It fits thirteen rows. The page built ten thousand. That ratio (770 : 1 of wasted work) doesn't improve as computers get faster, because the data grows too.

**Flaw 2: it gets worse in a way you can't debug.** There's no slow function to find in a profiler and fix — the cost is spread evenly across ten thousand innocent little elements. At 100,000 rows the tab stops responding, and every line of code still looks reasonable.

**Flaw 3: 10,000 listeners for one behaviour.** Each closure keeps its row object alive; the browser keeps 10,000 registrations. One delegated listener does the same job.

**Flaw 4: every change is a full rebuild.** Sorting, filtering, adding one row — all cost the same as the initial load, because the page has no notion of "just the visible part".

**Flaw 5 (the sneaky one): it hides the cost behind an instant demo.** With 50 rows this code is perfect and ships happily. The bug arrives eighteen months later as "the app got slow", when nobody remembers writing a loop.

## 5. Try it yourself first!

1. **Vague hint:** how many rows can the user actually see at once? How many did we build?
2. **Warmer:** if you only put the visible rows in the page, the page gets short and the scrollbar disappears. What could stand in for the rows you left out — without being them?
3. **Warmer still:** an empty `<div>` with `height: 3136px` costs one element and takes up the space of 98 rows. Where do you put two of those?
4. **Almost the answer:** given `scrollTop`, which row is at the top? (Divide and floor.) How many fit? (Divide and ceil, plus one for the partial row.) That's your slice; the spacers are the rows before and after it, times the row height.
5. **The property to protect:** whatever slice you choose, `topSpacer + rendered + bottomSpacer` must equal `total * rowHeight`. Write that as a test *before* you write the function.
6. **Design question:** should `computeWindow` handle a `scrollTop` of `-250` or `999_999`, or should the caller? Decide, then write the test that pins your decision down.

## 6. Understanding the refactored solution

**The whole engine is nine lines of arithmetic:**

```js
const maxScrollTop = Math.max(0, total * rowHeight - viewportHeight);
const clamped = Math.min(Math.max(scrollTop, 0), maxScrollTop);
const firstVisible = Math.floor(clamped / rowHeight);
const rowsOnScreen = Math.ceil(viewportHeight / rowHeight) + 1;
const start = Math.max(0, firstVisible - overscan);
const end = Math.min(total, firstVisible + rowsOnScreen + overscan);
```

No DOM, no state, no side effects — hand it five numbers, get four numbers back. That's what makes thirteen tests possible in Node, including the ones you could never click your way to reliably: over-scroll, an empty list, a list shorter than the viewport, and a million rows.

**The clamp comes first on purpose.** Everything downstream assumes `scrollTop` is inside the list, so normalizing at the top means `start` can never overtake `end` and `bottomSpacer` can never go negative. Fix inputs at the edge; keep the middle simple.

**Render is a function of (data, scroll position):**

```js
const view = computeWindow(viewport.scrollTop, ROW_HEIGHT, viewport.clientHeight, rows.length);
topSpacer.style.height = `${view.topSpacer}px`;
bottomSpacer.style.height = `${view.bottomSpacer}px`;
list.replaceChildren(...rows.slice(view.start, view.end).map(makeRow));
```

Four lines. `replaceChildren` swaps the whole slice at once, and because the slice is ~18 rows, "rebuild everything" is now cheap enough to be the *only* strategy — the same wipe-and-redraw simplicity project 14 chose, except here it's also the fast option.

**One render per frame.** `scroll` fires far more often than the screen refreshes, so a `frameQueued` flag drops the extra events and `requestAnimationFrame` schedules the render right before the browser paints. This is project 28's throttle without a guessed millisecond number: the frame *is* the interval.

**Sorting is instant now**, which is the honest measurement of what was slow before: the same `sort` call, followed by a render of eighteen rows instead of ten thousand.

**Press the million button.** The data array gets a hundred times bigger, the DOM doesn't move, and the render time doesn't either. That is what "cost proportional to the screen" means, and it's why the technique is worth the arithmetic.

## 7. Words you learned (glossary)

- **Virtualization / windowing** — rendering only the visible slice of a long list.
- **Viewport** — the visible part of a scrolling box.
- **`scrollTop`** — pixels scrolled from the top of the content.
- **Row height** — the fixed height each row occupies; the thing that makes the math possible.
- **Spacer** — an empty element whose only job is to take up space.
- **Overscan** — extra rows rendered just outside the viewport as a buffer.
- **Clamping** — forcing a number into a legal range.
- **Layout / reflow** — the browser computing where every box goes.
- **Paint** — the browser filling in pixels.
- **Event delegation** — one listener on a container instead of one per child.
- **`requestAnimationFrame`** — "call me right before the next paint".
- **Coalescing** — collapsing many events into one piece of work.
- **Invariant** — a rule that must always hold (here: the spacer identity).
- **O(n) vs O(1) rendering** — work that grows with the data vs work that doesn't.

## 8. Experiments to try on the plane (no internet needed)

1. **Count the difference.** Open both pages and read the green box. Expected: original ~30,000 DOM nodes and a build time in the hundreds of milliseconds; refactor ~30 nodes and under a millisecond.
2. **Make the original hurt.** Change `var TOTAL = 10000` to `100000` in `original.html` and reload. Expected: seconds of frozen tab, or a browser warning. Change the same number in the refactor's `makeRows(10_000)` — expected: nothing changes at all.
3. **Break the invariant on purpose.** In `refactored/index.html`, change `bottomSpacer` to `(total - end) * rowHeight - 500`. Expected: the page shrinks as you scroll and the scrollbar thumb fights you — the exact symptom of a virtual list whose math is off.
4. **Set overscan to 0.** Pass `0` as the last argument to `computeWindow` in the page and flick-scroll fast. Expected: white bands at the edges for a frame — that's what the buffer was buying you.
5. **Predict, then check.** Before running: what does `computeWindow(0, 32, 400, 3)` return for a 3-row list? Write your answer down, then run `node -e "import('./79-virtual-list/refactored/window.js').then(m => console.log(m.computeWindow(0, 32, 400, 3)))"` from the repo root.
6. **Take the delegation away.** In the refactor, move the click listener from the container onto each row inside `makeRow`. Expected: it still works — and then notice that scrolling away and back builds fresh listeners every render, which is exactly the leak delegation avoids.
