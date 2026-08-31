# 📘 Learning Guide: Infinite-Scroll Image Gallery

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A web page showing an endless list of photos. As you scroll toward the bottom, the page quietly fetches the next batch of 40 and adds them — like the feed in Twitter or Instagram. You never hit "the end"; content just keeps coming.

Open `original.html` in a browser (double-click it — no server or internet needed; the "photos" are little colored squares the page generates itself). A black counter box sits in the corner. Scroll hard for a minute and watch it: the original's DOM node count climbs forever (40, 400, 1000...) and the page gets slower and slower. The refactored version's count stays around 13, no matter how much you've loaded. Same look to the user; wildly different cost. That difference is the whole lesson.

## 2. Concepts you need first

**The DOM (Document Object Model).** The browser's live, in-memory tree of everything on the page. Each tag (`<div>`, `<img>`) is a **node**. JavaScript can add and remove nodes:

```js
const div = document.createElement('div');
div.textContent = 'hello';
document.body.appendChild(div); // "hello" appears on the page
```

Every node costs memory, and every node makes the next layout calculation a bit slower. A page with 10,000 nodes scrolls worse than one with 100.

**Layout and paint.** When something changes, the browser recalculates where every box goes (**layout**, also called reflow) and then redraws pixels (**paint**). Browsers aim to repaint up to 60 times per second — one **frame** every ~16 milliseconds. If your JavaScript takes longer than that, the page visibly stutters. That stutter has a name: **jank**.

**Events and listeners.** The browser announces things ("user scrolled", "user clicked") as **events**; your code subscribes with a listener:

```js
window.addEventListener('scroll', () => console.log('scrolled!'));
// scroll the page → "scrolled!" logs dozens of times per SECOND
```

That firehose rate matters: scroll events arrive far faster than you can usefully react.

**Layout-forcing reads.** Reading measurements like `window.scrollY` (how far down you've scrolled) or `element.offsetHeight` (an element's pixel height) can force the browser to stop and recompute layout right now to give you a fresh number. Cheap once; expensive dozens of times per second inside a scroll handler.

**Promises, async/await, and setTimeout.** A **Promise** is an object representing a value that will arrive later. `await` pauses an `async` function until it arrives:

```js
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function demo() {
  await wait(300);        // ~300ms pass
  console.log('done!');   // then this prints
}
```

Both files use this trick — `setTimeout` inside a Promise — to fake a slow network API (~300ms per page of photos), so the demo behaves like the real world without any internet.

**Pagination.** APIs hand out long lists in **pages** — here, 40 items per request. You ask for page 0, then page 1, and so on. "Infinite scroll" is just fetching the next page automatically when the user nears the bottom.

**Race conditions and the in-flight guard.** If a fetch takes 300ms and something asks for "more" five times during those 300ms, you get five requests for the *same* page — duplicated data, possibly arriving out of order. The fix is a single boolean: set `inFlight = true` when a request starts, refuse new requests while it's true, set it back to false when done. One bit of state, whole class of bugs gone.

**IntersectionObserver.** A browser feature that *tells you* when an element enters or leaves the visible area (the **viewport**) — no polling, no scroll math:

```js
const obs = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) console.log('it came into view!');
});
obs.observe(document.getElementById('sentinel'));
```

A **sentinel** is a tiny (even 1px) marker element you place at a strategic spot — here, below the list — purely so the observer can watch it. The `rootMargin: '600px'` option inflates the detection zone, so "in view" fires 600 pixels *early*, and the fetch finishes before the user actually reaches the bottom.

**requestAnimationFrame (rAF).** `requestAnimationFrame(fn)` asks the browser to run `fn` once, right before the next repaint. Calling it when an event fires — and ignoring further events until it runs — collapses a storm of scroll events into at most **one** update per frame, perfectly timed:

```js
let scheduled = false;
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; render(); });
});
```

**Passive listeners.** `addEventListener('scroll', fn, { passive: true })` promises the browser "this handler will never cancel the scroll," so the browser can keep scrolling smoothly without waiting for your code to finish.

**Virtualization (windowing).** The big one. Instead of keeping every loaded item in the DOM, keep only the handful the user can currently see, plus two empty **spacer** divs — one above, one below — whose heights stand in for all the missing items. If each row is 96px and rows 0–496 are scrolled past, the top spacer is simply 496 × 96 px tall. The scrollbar's size and position are determined by total height, so it can't tell real rows from spacer — the illusion is perfect. Scroll, and the code swaps *which* slice is real. **Overscan** means rendering a few extra rows beyond each edge so fast scrolling shows content instead of blank gaps.

**Lazy image loading.** `<img loading="lazy">` tells the browser itself not to download an image until it's near the viewport. In this demo the images are free (generated locally), but on a real network this saves megabytes.

**Pure functions.** A function whose output depends only on its inputs — no reading the page, no side effects. `visibleRange()` is pure, which is exactly why it can be tested in Node (a JavaScript runtime with no browser and no DOM at all).

## 3. Walking through the original code

The fake API first:

```js
function fetchPage(page) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      var items = [];
      for (var i = 0; i < 40; i++) items.push(page * 40 + i);
      resolve(items);
    }, 300);
  });
}
```

Ask for page 2, and 300ms later you get `[80, 81, ... 119]` — forty item numbers. (`imageUrl(i)` turns a number into a tiny colored SVG image encoded directly into the URL — that's why no internet is needed.)

```js
function loadMore() {
  fetchPage(nextPage).then(function (items) {
    nextPage++;
    var list = document.getElementById("list");
    for (var i = 0; i < items.length; i++) {
      var div = document.createElement("div");
      div.className = "photo";
      div.innerHTML = '<img src="' + imageUrl(items[i]) + '"> <b>Photo #' + items[i] + "</b>";
      list.appendChild(div);
    }
```

When a page arrives, create a `<div class="photo">` with an `<img>` for every item and append it. Every image starts downloading the instant it's appended — visible or not. And nothing is ever removed.

```js
window.onscroll = function () {
  scrollEvents++;
  updateStats();
  if (window.scrollY + window.innerHeight > document.body.offsetHeight - 600) {
    loadMore();
  }
};
```

On *every* scroll event: read three layout measurements, and if the bottom of the screen is within 600px of the bottom of the page, call `loadMore()`. Note what's missing — nothing remembers that a load is already running.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: eager image loading.** All 40 images per page start downloading on append — including hundreds far below anything visible. Here the images are free; against a real photo API, loading 25 pages means ~1,000 image downloads when the user looked at maybe 30. On a phone, that's someone's data plan and battery burned on pixels nobody saw. Users notice, and so does the app-store review section.

**Flaw 2: scroll polling.** Scroll events fire dozens of times per second, and each handler run does layout-forcing reads (`scrollY`, `offsetHeight`). It's asking "are we there yet?" sixty times a second, and paying a layout recalculation for every ask. As the DOM grows (Flaw 4), each ask gets more expensive — the two flaws feed each other until scrolling visibly stutters.

**Flaw 3: no in-flight guard.** The fetch takes 300ms. Scrolling fast through the bottom zone fires maybe 15 scroll events during those 300ms — each one calls `loadMore()` again. But `nextPage++` only happens when a response *arrives*, so all 15 requests asked for the *same page*. Result: the same 40 photos appended many times over. You've seen this bug in real life: the feed that shows the same post three times after fast scrolling. This is exactly how it's born.

**Flaw 4: the DOM grows forever.** Every photo ever loaded stays in the tree. 25 pages = 1,000 nodes for a screen that shows about eight. Layout, paint, and memory costs climb with every page, so the app is smooth in your two-minute test and dying at page 50 on a real user's machine an hour later. This is the bug that kills "infinite scroll" apps — the slowdown only appears with time and usage, long after the demo looked great.

## 5. Try it yourself first!

Try improving `original.html` before reading the refactor. In rough order of difficulty:

1. The duplicate-fetch bug needs exactly one new variable. What should `loadMore` check before starting, and when does it flip back?
2. Can you get out of the "are we there yet?" business entirely? There's a browser API that *notifies you* when an element becomes visible. You'll need to add a small marker element below the list for it to watch.
3. For the too-many-renders problem: instead of doing work on every scroll event, schedule the work for the next frame and ignore events until that frame happens (see the rAF pattern in section 2).
4. The big one — keeping the DOM small. Every row is the same height (96px). Given `scrollTop`, which row index is the first one on screen? (Divide and round down.) How many rows fit in the viewport? (Divide and round up, +1 for partial rows at both edges.) Render only those, plus ~3 extra each side. Fake everything above with one empty div of height `start × 96`, everything below with height `(total − end) × 96`.
5. Write the math from hint 4 as a pure function returning `{start, end, topPadding, bottomPadding}`, and check yourself with the invariant: topPadding + (rendered count × 96) + bottomPadding must equal total × 96, always.

## 6. Understanding the refactored solution

**`window.js` — the math, isolated.** The entire virtualization "trick" is one pure function:

```js
const first = Math.floor(scrollTop / itemHeight);
const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1;
const start = Math.max(0, first - overscan);
const end = Math.min(totalItems, first + visibleCount + overscan);
```

Scrolled 50,000px with 100px rows? You're at row 500. A 600px viewport fits 6 rows — +1 because a partial row can peek in at the top *and* bottom. Pad by `overscan` (3) each way, clamp so you never go below row 0 or past the last item, and return the two spacer heights. Because it touches no DOM, this runs — and is tested — in plain Node.

**`window.test.js`.** Uses Node's built-in test runner (`node --test`). The two tests worth studying: the *invariant test* asserts `topPadding + contentHeight + bottomPadding === totalItems × itemHeight` — the honest-scrollbar guarantee; and the last test calls `visibleRange` with `totalItems: 1_000_000` and asserts the rendered slice is still ≤ 14. A million items, fourteen DOM nodes: that's the promise, verified.

**`index.html` — wiring the math to the browser.** Loading first:

```js
const observer = new IntersectionObserver(async (entries) => {
  if (!entries[0].isIntersecting || inFlight) return; // one fetch at a time
  inFlight = true;
  ...
}, { rootMargin: '600px' });
observer.observe(sentinel);
```

A 1px `#sentinel` div sits below the list. The browser calls this function when the sentinel enters the (600px-inflated) viewport — no scroll math, no polling; we're *told*. The `inFlight` check is Flaw 3's entire fix. After a page arrives, the code un-observes and re-observes the sentinel — a nudge that makes the observer re-check immediately, covering the case where the first page is too short to push the sentinel out of view (otherwise nothing would ever trigger a second load).

Rendering:

```js
document.getElementById('top-pad').style.height = `${topPadding}px`;
document.getElementById('bottom-pad').style.height = `${bottomPadding}px`;
const list = document.getElementById('list');
list.innerHTML = '';
for (let i = start; i < end; i++) { ... }
```

`render()` asks `visibleRange` which slice should exist, sets the two spacer heights, wipes the list, and rebuilds just that slice (~13 nodes). Rebuilding 13 nodes per frame is cheap; keeping 4,000 alive is not. Each image also gets `loading = 'lazy'` — redundant here since off-screen images don't exist at all, but belt-and-suspenders on a real network.

Scroll still needs to move the window, but through the rAF gate shown in section 2 — at most one `render()` per frame, scheduled exactly when the browser is about to paint — and the listener is `{ passive: true }`, so scrolling never waits on our code. Compare with project 28's throttle: instead of guessing "every 100ms?", the frame itself is the interval.

Note the page's stats box shows nodes / items / renders live — the measurement *is* built into the page, so you can verify every claim by scrolling.

## 7. Words you learned (glossary)

- **DOM** — the browser's live tree of page elements; each element is a node.
- **Layout (reflow)** — the browser computing where every box goes; **paint** — drawing the pixels.
- **Frame** — one repaint cycle, ~16ms at 60fps; **jank** — visible stutter when code overruns a frame.
- **Event / listener** — a browser announcement ("scroll") and the function you register to react.
- **Layout-forcing read** — reading a measurement (`scrollY`, `offsetHeight`) that makes the browser recompute layout now.
- **Polling** — repeatedly asking "has it happened yet?" instead of being notified.
- **Promise / async / await** — a value that arrives later, and syntax for waiting on it cleanly.
- **Pagination** — an API serving a long list in numbered chunks (pages).
- **Race condition** — a bug from two overlapping operations whose timing wasn't controlled.
- **In-flight guard** — a boolean that blocks starting a request while one is running.
- **Viewport** — the visible area of the page.
- **IntersectionObserver** — browser API that notifies you when an element enters/leaves the viewport.
- **Sentinel** — a tiny marker element placed only to be observed.
- **rootMargin** — observer option that inflates the detection zone (fire early).
- **requestAnimationFrame (rAF)** — run a function right before the next repaint.
- **Passive listener** — a listener that promises not to cancel scrolling, so the browser needn't wait.
- **Virtualization / windowing** — rendering only the visible slice, with spacers standing in for the rest.
- **Spacer / padding div** — an empty element whose height impersonates unrendered rows.
- **Overscan** — extra rows rendered beyond each edge to hide fast-scroll blanks.
- **Invariant** — a condition that must always hold (here: spacers + rendered = total height).
- **Lazy loading** — deferring an image download until it's near the viewport.
- **Pure function** — output depends only on inputs; no DOM, no side effects — hence testable in Node.

## 8. Experiments to try on the plane (no internet needed)

Both HTML files open straight from disk, and `node --test 73-infinite-gallery/` runs the math tests — all fully offline.

1. **Race the counters.** Open both HTML files side by side and scroll hard in each for 30 seconds. Watch the original's node count climb into the hundreds while the refactor sits near 13. Then in the original, scroll *fast* into the bottom zone and look for duplicate photo numbers — Flaw 3, live.
2. **Break the invariant on purpose.** In `refactored/index.html`, change `topPadding: start * itemHeight` to `start * itemHeight + 500`. Scroll: items visibly jump ~5 rows out of place and the list "teleports." Now run `node --test 73-infinite-gallery/` — the same change in `window.js` fails the invariant test. That test guards exactly this bug. Undo both.
3. **Set `overscan` to 0.** In the refactored page (the inline `visibleRange` copy), pass overscan 0 and flick-scroll quickly: you'll catch blank flashes at the edges before the next render fills them. Set it to 10 and watch the node counter rise to ~27 — overscan is a smoothness-versus-nodes dial you now control.
4. **Remove the in-flight guard from the refactor.** Delete `|| inFlight` from the observer callback and set the fake API delay to 1000ms. Scroll to the bottom and jiggle: duplicate pages return. Restore the guard; they're gone. One boolean, one whole bug class.
5. **Feel the difference between rAF and raw rendering.** Replace the rAF-gated scroll handler with a plain `window.addEventListener('scroll', render)` and watch the "renders" counter in the stats box explode during one flick of the wheel. The rAF gate ceilings it at one render per frame — you can literally read the savings off the counter.
