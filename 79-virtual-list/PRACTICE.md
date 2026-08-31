# 🏋️ Practice: Virtual List

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

The pure exercises run in node (`node --test 79-virtual-list/`); the wiring ones you check by opening `refactored/index.html`.

## Exercises

### ⭐ 1. The collapsed container (warm-up)
A list inside a hidden tab or an unopened accordion has `clientHeight === 0` — a state the page really does start in, and one no test covers. Predict `computeWindow(0, 32, 0, 10_000)` completely before running it, then write the test. Also assert that the invariant still holds when a collapsed container is somehow scrolled to `999_999`.
What it practices: reading a pure function's edge behaviour off the code instead of guessing, and noticing that "no space to draw in" is not an error.
Hint: `Math.ceil(0 / 32) + 1` is 1, so one row plus overscan gets rendered into a box nobody can see. Harmless — and much better than a crash or a divide-by-zero.

### ⭐⭐ 2. Scroll to a row properly (core)
The Jump button cheats: `viewport.scrollTop = 9000 * ROW_HEIGHT`. Ask for row 9,999 that way and you scroll past the end; ask for row -1 and you get a negative. Write the pure companion `scrollTopForRow(index, rowHeight, viewportHeight, total, align = 'top')` returning a legal `scrollTop`, then use it for the button. With `rowHeight 32, viewportHeight 400, total 10_000`: row 100 → `3200`; row 9999 → `319_600` (clamped, not `319_968`); row -5 → `0`; row 100 with `align: 'center'` → `3016`. Finish with the assertion that matters: after scrolling to row 9,999, `computeWindow` really does include 9,999.
What it practices: the inverse of `computeWindow` — from row to pixels — and clamping at both ends of the same range.
Hint: the maximum legal `scrollTop` is `total * rowHeight - viewportHeight` (never below 0), the same number `computeWindow` clamps to. Centering means backing off by half the leftover space: `top - (viewportHeight - rowHeight) / 2`, then clamp again.

### ⭐⭐ 3. A search box over a virtual list (core)
Add an `<input>` that filters the rows. Write `matchingRows(rows, query)` (case-insensitive, trimmed, empty query means everything), keep `query` in state, and render the window over the **filtered** array — `computeWindow(..., visible.length)` — not over `rows`. In node: 100 rows filtered by `'#7'` gives 11 matches (#7 and #70–#79), and `computeWindow(0, 32, 400, 11)` renders all 11 with no spacers. Then test the nasty case: a `scrollTop` of `288_000` left over from before the filter must not break anything.
What it practices: composing a derived list with the window — and seeing the clamp inside `computeWindow` quietly rescue you from a stale scroll position.
Hint: filter first, then window. Also set `viewport.scrollTop = 0` when the query changes; the clamp keeps you safe if you forget, but the user would rather start at the top.

### ⭐⭐ 4. Selection that survives scrolling (core)
Let clicking a row select it (grey background), with multiple rows selectable. The trap this exercise exists for: if you record selection by adding a CSS class in the click handler, scrolling away and back **loses it**, because that row's element was thrown away and rebuilt. Keep a `Set` of selected ids in state instead, write the pure `toggleSelection(selected, id)` returning a *new* Set, and have `makeRow` set the class from `selected.has(item.id)`. Check in the page: select row 3, scroll to row 9,000 and back — still selected. In node: toggling twice removes it, and the input Set is never mutated.
What it practices: project 14's and react#15's rule at the exact spot where virtualization makes it unavoidable — with recycled DOM, state in the DOM has a lifetime of about one scroll.
Hint: try the wrong version first (`row.classList.toggle('selected')` in the click handler) and scroll away. Watching the selection evaporate is the entire lesson, and it takes ten seconds.

### ⭐⭐⭐ 5. Rows of different heights (challenge)
Everything so far relies on one number: every row is 32px. Real lists have a two-line row here and an image there. Write `buildOffsets(heights)` (a running total: `offsets[i]` is the pixels above row `i`, and the last entry is the full height), `findRowAt(offsets, y)` by **binary search**, and `computeVariableWindow(scrollTop, offsets, viewportHeight, overscan)` returning the same four fields. Check with `heights = [50,20,20,100,20,20,20,300,20,20]`: `offsets` is `[0,50,70,90,190,210,230,250,550,570,590]`, `findRowAt(offsets, 189)` is 3, `findRowAt(offsets, 50)` is 1, and for scrollTops `0, 37, 200, 389, 400, 10_000, -20` the invariant `topSpacer + rendered + bottomSpacer === 590` holds every time.
What it practices: replacing a division with a lookup — the general version of the same idea, and the reason `react-window` has a separate `VariableSizeList`.
Hint: with equal heights, "which row is at pixel y" is `y / rowHeight`; with unequal ones it's "the last index whose offset is ≤ y", which is a binary search over a sorted array (`offsets` is sorted because heights are positive). Careful with the middle: use `Math.ceil((low + high) / 2)` when `low` chases upwards, or you'll loop forever on a two-element range.

### ⭐⭐⭐ 6. Fuzz the window (challenge)
Prove the function rather than sampling it. 2,000 random trials: `rowHeight` 1–80, `viewportHeight` 0–900, `total` 0–5,000, `overscan` 0–4, and a `scrollTop` deliberately ranging from `-500` to past the end. For each, assert four things: bounds (`0 <= start <= end <= total`), no negative spacers, the height invariant, and **no visible gap** — the window must include every row the viewport can show at that clamped scroll position.
What it practices: turning a function's contract into properties and letting a machine hunt counterexamples — the technique that finds the off-by-one you'd never write an example for.
Hint: the coverage check needs the same clamp the function does, or you'll "prove" a gap that only exists in your test. Compute `clamped` yourself, then `firstNeeded = Math.floor(clamped / rowHeight)` and `lastNeeded = Math.min(total - 1, Math.ceil((clamped + viewportHeight) / rowHeight) - 1)`.

## Solutions

### 1. The collapsed container
```js
test('a collapsed container (hidden tab) renders a token row, not a crash', () => {
  const w = computeWindow(0, 32, 0, 10_000);
  assert.deepEqual(w, { start: 0, end: 3, topSpacer: 0, bottomSpacer: (10_000 - 3) * 32 });

  const scrolled = computeWindow(999_999, 32, 0, 10_000);
  assert.equal(scrolled.end, 10_000);
  assert.equal(scrolled.topSpacer + (scrolled.end - scrolled.start) * 32 + scrolled.bottomSpacer,
    10_000 * 32);
});
```
WHY: `end` is 3 — one row for `Math.ceil(0/32) + 1` plus two overscan — so a hidden list quietly renders three invisible rows and stops. Nothing divides by zero, because `viewportHeight` is only ever *divided into*, never divided *by*. Note the second half: with `viewportHeight: 0`, `maxScrollTop` is the whole content height, so a wild `scrollTop` clamps to the very bottom and the invariant still holds. Edge cases that resolve into ordinary answers are the reward for clamping early. Verified by running.

### 2. Scroll to a row properly
```js
export function scrollTopForRow(index, rowHeight, viewportHeight, total, align = 'top') {
  if (total <= 0) return 0;
  const row = Math.min(Math.max(Math.trunc(index), 0), total - 1);   // clamp the ROW
  const top = row * rowHeight;
  const wanted = align === 'center' ? top - (viewportHeight - rowHeight) / 2 : top;
  const maxScrollTop = Math.max(0, total * rowHeight - viewportHeight);
  return Math.min(Math.max(Math.round(wanted), 0), maxScrollTop);     // clamp the PIXELS
}

// in the page:
document.getElementById('jump').onclick = () => {
  viewport.scrollTop = scrollTopForRow(9000, ROW_HEIGHT, viewport.clientHeight, rows.length);
};
```
WHY: two clamps, because there are two different illegal things — a row that doesn't exist, and a scroll position that doesn't exist. Clamping only the pixels would let `scrollTopForRow(50_000, ...)` quietly mean "the last row", which is right by luck; clamping only the row still lets centering push you negative near the top. The final assertion is the one that makes this a *companion* to `computeWindow` rather than a guess: scroll to the row it returns, and the window contains the row you asked for. Verified by running: 3200, 0, 319_600, 0, 319_600, 3016, 0, 0, and row 9,999 lands inside the window.

### 3. A search box over a virtual list
```js
export function matchingRows(rows, query) {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') return rows;
  return rows.filter((row) => row.label.toLowerCase().includes(wanted));
}

// render():
const visible = matchingRows(rows, query);
const view = computeWindow(viewport.scrollTop, ROW_HEIGHT, viewport.clientHeight, visible.length);
list.replaceChildren(...visible.slice(view.start, view.end).map(makeRow));
```
WHY: `visible.length` — not `rows.length` — is the whole exercise. The spacers, the scrollbar, and the slice must all describe the list the user is currently looking at; mix the two totals and you get a page that scrolls into a void. Filtering 10,000 rows on every keystroke is fine, by the way (it's an array scan, microseconds); it was never the array that was slow. And the stale-scrollTop test shows the clamp doing real work: after filtering 10,000 rows down to 11, a `scrollTop` of 288,000 is nonsense that resolves to "the top" instead of an empty window. Verified by running: 11 matches, all 11 rendered, stale scroll identical to the top.

### 4. Selection that survives scrolling
```js
export function toggleSelection(selected, id) {
  const next = new Set(selected);          // new Set, never mutate the old one
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

// state:  let selected = new Set();
// events: list.addEventListener('click', (event) => {
//           const row = event.target.closest('.row');
//           if (row) { selected = toggleSelection(selected, Number(row.dataset.id)); render(); }
//         });
// makeRow: row.dataset.id = item.id;
//          row.className = selected.has(item.id) ? 'row selected' : 'row';
```
WHY: with virtualization, a row's element exists only while it's near the viewport — scroll 300 rows down and back and every element is brand new. So anything recorded *on* the element (a class, a `data-` flag someone read back, an inline style) has the lifetime of a scroll gesture. That's react#15's argument arriving in vanilla JS, and virtualization is what makes it undeniable: the DOM here is explicitly a temporary drawing of the data, not the data. `dataset.id` is fine because it's written *by* render and only ever read as an identity, never as truth about selection. Verified by running: two toggles select 42 and 9000, a third deselects 42, row 9,000 stays selected while far outside the window, and the input Set is untouched.

### 5. Rows of different heights
```js
export function buildOffsets(heights) {
  const offsets = [0];
  for (const height of heights) offsets.push(offsets[offsets.length - 1] + height);
  return offsets; // offsets[i] = pixels above row i; offsets.at(-1) = total height
}

export function findRowAt(offsets, y) {          // last index whose offset is <= y
  let low = 0;
  let high = offsets.length - 2;                 // the last REAL row
  if (high < 0) return 0;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);  // ceil: `low` is the one that moves up
    if (offsets[middle] <= y) low = middle; else high = middle - 1;
  }
  return low;
}

export function computeVariableWindow(scrollTop, offsets, viewportHeight, overscan = 2) {
  const total = offsets.length - 1;
  if (total <= 0) return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 };
  const totalHeight = offsets[total];
  const clamped = Math.min(Math.max(scrollTop, 0), Math.max(0, totalHeight - viewportHeight));
  const first = findRowAt(offsets, clamped);
  let last = first;
  while (last < total && offsets[last] < clamped + viewportHeight) last++;
  const start = Math.max(0, first - overscan);
  const end = Math.min(total, last + overscan);
  return { start, end, topSpacer: offsets[start], bottomSpacer: totalHeight - offsets[end] };
}
```
WHY: the shape of the answer never changed — still `{start, end, topSpacer, bottomSpacer}`, still one invariant — only the *lookup* did. `scrollTop / rowHeight` was an O(1) division that assumed uniformity; the prefix-sum array plus binary search is O(log n) and assumes nothing, at the cost of one array you rebuild when heights change. Note `topSpacer` is now `offsets[start]` rather than `start * rowHeight`: the running total *is* the spacer height, which is why prefix sums are the natural data structure here. The `Math.ceil` in the binary search is the classic infinite-loop trap: with `low = 0, high = 1` and `Math.floor`, `middle` is 0, `low` stays 0, and you spin forever. Verified by running: the offsets table, four `findRowAt` answers, and the invariant across seven scroll positions including negative and far past the end.

### 6. Fuzz the window
```js
test('FUZZ: the window never lies and never gaps', () => {
  for (let trial = 0; trial < 2000; trial++) {
    const rowHeight = 1 + Math.floor(Math.random() * 80);
    const viewportHeight = Math.floor(Math.random() * 900);
    const total = Math.floor(Math.random() * 5000);
    const overscan = Math.floor(Math.random() * 5);
    const totalHeight = total * rowHeight;
    const scrollTop = Math.floor(Math.random() * (totalHeight + 2000)) - 500; // over-scroll on purpose

    const w = computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan);
    const label = `scrollTop=${scrollTop} row=${rowHeight} view=${viewportHeight} total=${total}`;

    assert.ok(w.start >= 0 && w.end <= total && w.start <= w.end, `bounds: ${label}`);
    assert.ok(w.topSpacer >= 0 && w.bottomSpacer >= 0, `negative spacer: ${label}`);
    assert.equal(w.topSpacer + (w.end - w.start) * rowHeight + w.bottomSpacer, totalHeight,
      `invariant: ${label}`);

    if (total > 0) {
      const clamped = Math.min(Math.max(scrollTop, 0), Math.max(0, totalHeight - viewportHeight));
      const firstNeeded = Math.floor(clamped / rowHeight);
      const lastNeeded = Math.min(total - 1, Math.ceil((clamped + viewportHeight) / rowHeight) - 1);
      assert.ok(w.start <= firstNeeded, `top gap: ${label}`);
      assert.ok(w.end - 1 >= lastNeeded, `bottom gap: ${label}`);
    }
  }
});
```
WHY: the four properties are the function's entire contract, and each one maps to a bug you'd otherwise ship. Broken bounds means `slice` returns nothing and the list goes blank; a negative spacer means the page height fights the scrollbar; a broken invariant means the scrollbar thumb jitters as you drag it; a gap means white rows where content should be. The failure messages carry the exact inputs, so a red test hands you a one-line reproduction instead of a mystery. And note what the fuzz *can't* check: that the rows look right. Property tests guard the arithmetic; your eyes still have to open the page. Verified by running: 2,000 trials, ~10,000 assertions, all green.
