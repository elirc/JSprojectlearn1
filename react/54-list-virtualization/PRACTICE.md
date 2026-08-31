# 🏋️ Practice: List Virtualization

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Running the HTML pages needs the CDN, but the window math is plain JavaScript: `node --test window.test.js` from inside `refactored/` works with no internet at all.) `computeWindow` lives twice — in `refactored/window.js`, which the Node tests import, and as a copy inside `refactored/index.html`, which the browser runs — so when an exercise changes the math, change both.

## Exercises

### ⭐ 1. Say how much you're hiding (warm-up)

The page reports `rows rendered: 17 of 5000`. Add a footer under the scroller that states the windowing bargain in plain language: `showing rows 27–43 · 17 in the DOM · 4983 not rendered`. Derive every number from the window object you already have — add no new state and no new counters.

**Practices:** deriving UI from data you already hold (project 09's rule), and reading the shape `computeWindow` returns.

**Hint:** `win.startIndex`, `win.endIndex`, `win.visibleCount`, and `visible.length`. The "not rendered" number is a subtraction, not a thing to track.

**Expected:** at the top of the unfiltered list the footer reads `showing rows 0–13 · 14 in the DOM · 4986 not rendered`. Scroll to the very bottom and it reads `showing rows 4987–4999 · 13 in the DOM · 4987 not rendered` — both counts shrink at the ends, because the overscan clamps have nothing to reach for.

### ⭐⭐ 2. Predict the window (core)

No code for this one — paper only. A different list: `rowHeight` 32, viewport 300px, 250 rows, `overscan` 2. For each scroll position below, write down `startIndex`, `endIndex`, `visibleCount`, `offsetY`, and what the "rows rendered" counter shows:

- **a)** `scrollTop = 1000`
- **b)** `scrollTop = 0`
- **c)** `scrollTop = 7700` (scrolled all the way to the bottom)
- **d)** `scrollTop = 1000`, but with `overscan` 0
- **e)** `scrollTop = 1000` on a list of only **8** rows

Then check yourself by calling `computeWindow` in Node.

**Practices:** the arithmetic as arithmetic — including both clamps, the `+ 1` for the partial row, and what happens when `scrollTop` describes a position the list no longer has.

**Hint:** four lines each, in order: `floor(scrollTop / rowHeight)`, `ceil(viewportHeight / rowHeight) + 1`, then the `max(0, …)` and `min(total - 1, …)` clamps. For (e), notice that `firstVisible` is clamped to `total - 1` *before* the overscan is subtracted.

**Expected:** the five answers differ in five different ways — one plain case, one clamped at the top, one clamped at the bottom, one that shows what overscan actually costs, and one that would have crashed into an inverted range without the clamp LEARN.md describes.

### ⭐⭐ 3. The key that steals your checkbox (planted bug) (core)

Give `Row` a checkbox with its own state: `const [checked, setChecked] = useState(false)`. Now change the map to `slice.map((row, i) => <Row key={i} row={row} />)`. Tick the box on the first visible person, scroll down five rows, and watch.

Write down what you see, explain it in terms of what `key` means, then fix it and confirm the fix.

**Practices:** project 03's index-key bug in the habitat where it is genuinely hard to diagnose — the identity React uses versus the identity the user believes in.

**Hint:** after scrolling five rows, which array element is at slice position `0`? What did React conclude about the component whose key is `0`?

**Expected:** the tick does not travel with the person you ticked. It stays at that *position in the window* and lands on whoever scrolls into it — and if you scroll far enough and come back, your original person is unticked. With `key={row.id}` the tick belongs to the person and scrolls away with them.

### ⭐⭐ 4. Windowing that survives a resize (core)

`VIEWPORT_HEIGHT` is a hard-coded `400` that must match the CSS. Make the scroller `height: 50vh` instead, and measure the real height at runtime so the window math stays correct when the browser window is resized.

**Practices:** the boundary between "numbers you can compute" and "numbers only the browser knows", and effect cleanup for a `resize` listener (project 18).

**Hint:** `useState` for the measured height, a `useLayoutEffect` that reads `scrollerRef.current.clientHeight` and subscribes to `window.addEventListener('resize', …)` — returning the removal function. `computeWindow` doesn't change at all; it just receives a different number.

**Expected:** drag the browser window taller and "rows rendered" grows; drag it shorter and it shrinks. No blank stripes at either size. `window.test.js` still passes untouched, because you changed where a number comes from, not what the math does with it.

### ⭐⭐⭐ 5. Rows that aren't all the same height (challenge)

Every line of `computeWindow` assumes one fixed `rowHeight`. Real lists have comments that wrap, avatars that are sometimes two lines, ads every twenty rows. Support a `heights` array instead, in a new pure module with its own Node tests:

- `buildOffsets(heights)` → a prefix-sum array where `offsets[i]` is the pixel top of row `i`, with `offsets[total]` as the total height.
- `findStartIndex(offsets, scrollTop)` → the row containing that pixel, by **binary search** (a linear scan through 5,000 offsets on every scroll event would hand back the cost you just eliminated).
- `computeVariableWindow(scrollTop, offsets, viewportHeight, overscan)` → the same five-field result as before.

Write the tests too, including one that checks your binary search against a naive linear scan over a few hundred ragged rows.

**Practices:** the actual technique inside react-window and TanStack Virtual, and using a slow, obviously-correct implementation as the oracle for a fast, clever one.

**Hint:** binary search for "the largest `i` where `offsets[i] <= scrollTop`" — keep a `best` variable as you narrow, rather than trying to land exactly on it. For the end of the window, walk forward while `offsets[last + 1] < scrollTop + viewportHeight`; the rows are big enough that the walk is short.

**Expected:** with uniform 40px heights your `computeVariableWindow` returns the same `startIndex` as `computeWindow` at every scroll position, and an `endIndex` within one row of it — the fixed version's `ceil(…) + 1` is deliberately one row generous, while the variable version measures exactly. On ragged heights, the window always covers the viewport with no gap at either edge.

## Solutions

### 1. Say how much you're hiding

```jsx
<div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
  showing rows {win.startIndex}–{win.endIndex}
  {' · '}{win.visibleCount} in the DOM
  {' · '}{visible.length - win.visibleCount} not rendered
</div>
```

**Why:** every number was already sitting in `win` or in `visible.length`; not one of them needed to be stored, synchronised or updated. That is project 09's rule doing its job in a performance project — the window *is* the state, and everything the footer says is a fact about it. The counts shrinking at both ends is the `Math.max(0, …)` and `Math.min(total - 1, …)` clamps becoming visible: in the middle of the list the window carries 3 overscan rows above and 3 below (11 + 6 = 17), but at the top there is nothing above to render and at the bottom nothing below, so you see 14 and 13.

### 2. Predict the window

| | startIndex | endIndex | visibleCount | offsetY | counter |
|---|---|---|---|---|---|
| a) scrollTop 1000 | 29 | 43 | 15 | 928 | `15 of 250` |
| b) scrollTop 0 | 0 | 12 | 13 | 0 | `13 of 250` |
| c) scrollTop 7700 | 238 | 249 | 12 | 7616 | `12 of 250` |
| d) overscan 0 | 31 | 41 | 11 | 992 | `11 of 250` |
| e) 8 rows total | 5 | 7 | 3 | 160 | `3 of 8` |

Working, case by case:

- **(a)** `floor(1000/32) = 31`; `ceil(300/32) + 1 = 11`; `start = max(0, 31-2) = 29`; `end = min(249, 31+11-1+2) = 43`; `offsetY = 29*32 = 928`.
- **(b)** `firstVisible = 0`, so `0 - 2 = -2` clamps to `0`. The window loses its two overscan rows above and keeps the two below: 13, not 15.
- **(c)** `floor(7700/32) = 240`; the end would be `252`, clamped to `249`. `7700` is the true maximum scroll here: `totalHeight - viewportHeight = 8000 - 300`.
- **(d)** overscan 0 gives exactly the rows the viewport touches — `31` to `41`, the ten whole rows plus the partial one the `+ 1` accounts for. Against (a): the buffer costs four rows and buys you no white flashes.
- **(e)** the interesting one. `floor(1000/32) = 31`, but the list has 8 rows, so `firstVisible` clamps to `7` *before* the overscan subtraction: `start = max(0, 7-2) = 5`, `end = min(7, 7+11-1+2) = 7`. Without that clamp you get `start = 29`, `end = 7` — an inverted range and an empty screen, exactly the bug that appears in the real page when the filter shrinks a list you had scrolled down inside.

**Why:** doing this on paper is the point. Once the five numbers are something you can produce yourself, the component stops being magic and the tests stop being ceremony — you can see which assertion covers which branch. Every value above comes from calling the real `computeWindow`.

### 3. The key that steals your checkbox

```jsx
function Row({ row }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="row">
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <div className="avatar">{row.initials}</div>
      <div className="name">{row.name}</div>
      <div className="email">{row.email}</div>
      <div className="badge">{row.team}</div>
    </div>
  );
}

// the bug:  {slice.map((row, i) => <Row key={i} row={row} />)}
// the fix:  {slice.map((row) => <Row key={row.id} row={row} />)}
```

**Why:** `key` is React's answer to "is this the same component as last time?". With `key={i}` the keys of the rendered window are `0..16` on *every* render, forever, wherever you have scrolled — so React concludes the component at key `0` is the one it saw before, keeps its DOM node, keeps its state, and merely changes the `row` prop. The checkbox is state; the name is a prop. Props update, state persists, and the tick therefore belongs to the screen slot rather than the person. With `key={row.id}` the keys change as the window slides, React unmounts the rows that scrolled away and mounts the arriving ones, and each person's tick travels with them. Same bug as project 03, but virtualization makes it far nastier to spot: the keys stay identical while the data moves *continuously*, so the symptom reads as "the checkboxes are haunted" rather than "the keys are wrong".

### 4. Windowing that survives a resize

```jsx
function App() {
  const scrollerRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(400); // sensible first guess

  useLayoutEffect(() => {
    const measure = () => {
      if (scrollerRef.current) setViewportHeight(scrollerRef.current.clientHeight);
    };
    measure();                                  // once, before the first paint
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure); // project 18
  }, []);

  const win = computeWindow(scrollTop, ROW_HEIGHT, viewportHeight, visible.length, OVERSCAN);
  // ...unchanged from here down
}
```

**Why:** with `.scroller { height: 50vh; }` in the CSS, `clientHeight` is a number only the browser can produce — it depends on fonts, zoom, scrollbar width and the window size — so it has to be *measured*, and measurement belongs in an effect, not in render. `useLayoutEffect` rather than `useEffect` because it runs before the browser paints: measuring in `useEffect` would show one frame rendered with the stale 400 and then correct itself, which is a visible flicker. The `resize` listener gets a cleanup for the usual project 18 reason — an unmounted component that is still being told about resizes is a leak that also crashes when it calls `setState`. And notice what did *not* change: `computeWindow` and all thirteen of its tests. Feeding a pure function a different number is not a change to the function; that separation is what makes this a five-line edit instead of a refactor.

### 5. Rows that aren't all the same height

```js
// variable-window.js — still no React and no DOM.

/** offsets[i] = pixel top of row i; offsets[total] = the full height. */
export function buildOffsets(heights) {
  const offsets = new Array(heights.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < heights.length; i++) offsets[i + 1] = offsets[i] + heights[i];
  return offsets;
}

/** The largest i with offsets[i] <= scrollTop, in O(log n). */
export function findStartIndex(offsets, scrollTop) {
  const total = offsets.length - 1;
  if (total <= 0) return 0;
  const target = Math.max(0, scrollTop);
  let lo = 0, hi = total - 1, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= target) { best = mid; lo = mid + 1; }  // good enough, try higher
    else hi = mid - 1;
  }
  return best;
}

export function computeVariableWindow(scrollTop, offsets, viewportHeight, overscan = 3) {
  const total = offsets.length - 1;
  if (total <= 0) {
    return { startIndex: 0, endIndex: -1, visibleCount: 0, offsetY: 0, totalHeight: 0 };
  }
  const first = findStartIndex(offsets, scrollTop);
  const bottom = Math.max(0, scrollTop) + viewportHeight;
  let last = first;
  while (last < total - 1 && offsets[last + 1] < bottom) last++;
  const startIndex = Math.max(0, first - overscan);
  const endIndex = Math.min(total - 1, last + overscan);
  return {
    startIndex,
    endIndex,
    visibleCount: endIndex - startIndex + 1,
    offsetY: offsets[startIndex],
    totalHeight: offsets[total],
  };
}
```

```js
// variable-window.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOffsets, findStartIndex, computeVariableWindow } from './variable-window.js';

test('findStartIndex finds the row containing a pixel', () => {
  const offsets = buildOffsets([40, 60, 40, 100]);   // [0, 40, 100, 140, 240]
  assert.equal(findStartIndex(offsets, 39), 0);
  assert.equal(findStartIndex(offsets, 40), 1);      // exactly on a boundary
  assert.equal(findStartIndex(offsets, 139), 2);
  assert.equal(findStartIndex(offsets, 99999), 3);   // clamped to the last row
  assert.equal(findStartIndex(offsets, -50), 0);     // bounce scrolling
});

test('findStartIndex agrees with a linear scan on a big ragged list', () => {
  const heights = Array.from({ length: 500 }, (_, i) => 20 + ((i * 13) % 60));
  const offsets = buildOffsets(heights);
  const linear = (top) => {
    let i = 0;
    while (i < heights.length - 1 && offsets[i + 1] <= top) i++;
    return i;
  };
  for (let top = 0; top < offsets[500]; top += 7) {
    assert.equal(findStartIndex(offsets, top), linear(top), `at ${top}`);
  }
});

test('the variable window always covers the viewport', () => {
  const heights = Array.from({ length: 300 }, (_, i) => 20 + ((i * 13) % 60));
  const offsets = buildOffsets(heights);
  for (let top = 0; top <= offsets[300] - 400; top += 11) {
    const w = computeVariableWindow(top, offsets, 400, 3);
    assert.ok(offsets[w.startIndex] <= top, `gap at the top, ${top}`);
    assert.ok(offsets[w.endIndex + 1] >= top + 400, `gap at the bottom, ${top}`);
    assert.equal(w.offsetY, offsets[w.startIndex]);
  }
});

// plus two obvious ones: buildOffsets([40,60,40]) === [0,40,100,140], and
// an empty list giving { startIndex: 0, endIndex: -1, visibleCount: 0 }.
```

In the component nothing about the rendering changes — `offsetY` is still the top spacer, `totalHeight` still the scrollbar's height:

The component barely changes: `const offsets = useMemo(() => buildOffsets(visible.map(rowHeightOf)), [visible])`, then `computeVariableWindow(scrollTop, offsets, VIEWPORT_HEIGHT, OVERSCAN)` in place of `computeWindow`. `offsetY` is still the top spacer and `totalHeight` still the scrollbar's height.

**Why:** the fixed-height version could divide because every row was interchangeable. Once heights vary, "which row is at pixel 1234?" stops being arithmetic and becomes a *search* — and the prefix-sum array is what makes that search possible, because `offsets` is sorted by construction. Binary search answers it in about 13 steps for 5,000 rows instead of up to 5,000; searching linearly on every scroll event would quietly reintroduce a per-scroll cost proportional to list length, the exact thing this project exists to remove. The `best` variable is what makes it a "largest `i` such that" search rather than an exact-match one — there is usually no offset exactly equal to `scrollTop`, so landing on one isn't something you can wait for.

The linear-scan test is the most valuable in the file: a naive implementation you trust, used as an oracle for a clever one you don't, checked at hundreds of positions — the same move as js#07's Hanoi verifier. Run the uniform-height comparison once for calibration too: with 40px rows your `startIndex` matches `computeWindow` everywhere and `endIndex` is at most one row different. That gap is a bug in neither — the fixed version's `ceil(viewportHeight / rowHeight) + 1` is a deliberately generous constant assuming a partial row at both edges, while the variable version measures the real boundary and sometimes finds there isn't one.
