# 🏋️ Practice: Searchable Table

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The pipeline is pure JavaScript, so exercises 1, 2 and 5 can be checked in Node with no browser at all; the pages need the CDN, so save those for when you're online.)

Unless an exercise says otherwise, you are editing `refactored/index.html`.

## Exercises

### ⭐ 1. "showing 4–6 of 6" (warm-up)

Add a line under the table reporting which rows the user is looking at: the position of the first visible row, the last one, and how many rows survived the search. Add no state — every number is already sitting in the pipeline. Handle the two awkward cases: the last page is usually partial, and a search that matches nothing should say "no matching people" instead of "showing 1–0 of 0".

**Practices:** derived reporting — turning pipeline intermediates into UI without storing a thing.

**Hint:** the first row's position is `currentPage * PAGE_SIZE + 1`; the last is that plus `PAGE_SIZE - 1`, except when the data runs out first. `Math.min` again.

**Expected:** on load, "showing 1–3 of 7"; on page 3, "showing 7–7 of 7" (one row, Katherine); search "zz" and the table is empty with "no matching people" and the pager reading "page 1 of 1".

### ⭐⭐ 2. Predict the whole click sequence (core)

Starting from a fresh load of `refactored/index.html`, write down the three names visible after each of these steps, in order: (a) load; (b) click the **name** header once; (c) type `a` into the search box; (d) click the **score** header; (e) click **next**; (f) clear the search box. Then answer the question the pipeline is really asking: at which of those steps did the `Math.min(page, totalPages - 1)` clamp actually change anything?

**Practices:** running the derivation in your head, including which handlers reset the page and which don't.

**Hint:** the search box's `onChange` calls `setPage(0)` — and *clearing* the box is a change event too. Header clicks don't touch the page. Six names contain an "a".

**Expected:** six rows of three names each, matching the solution exactly, plus the right answer to the clamp question — which is more interesting than it looks.

### ⭐⭐ 3. The memo that froze the table (core)

A teammate read project 27, decided the pipeline was expensive, and wrapped the sort:

```jsx
const sorted = React.useMemo(
  () => sortBy(filtered, (p) => p[sort.key], { descending: sort.descending }),
  [sort.key, sort.descending],
);
```

Now typing in the search box does nothing visible at all — same rows, same "page 1 of 3" — until you click a header, at which point everything snaps into place at once. Explain the symptom, then memoize the pipeline *correctly* — and notice why adding `filtered` to that dependency array is necessary but, on its own, useless.

**Practices:** `useMemo` dependencies and referential equality — a freshly built array is a new value every render.

**Hint:** `PEOPLE.filter(...)` returns a brand-new array each render, so a dependency on `filtered` is never equal to last render's. To make it stable, it has to be memoized too.

**Expected:** after your fix the table updates on every keystroke again; you can also state what would happen with `[filtered, sort.key, sort.descending]` alone (the memo re-runs every render — correct, and completely pointless).

### ⭐⭐ 4. Extract the pager (core)

Pull the prev/page-counter/next paragraph into its own `Pagination` component. It should take exactly what it needs and nothing more, and the prop you pass for the current page is a real design decision — pass the wrong one and the buttons start disagreeing with the table. Keep `App`'s pipeline untouched.

**Practices:** prop design for an extracted component; passing the *clamped* value rather than the raw state.

**Hint:** `<Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />`. Ask yourself what "prev" means if the component were handed the unclamped `page` of 5 while the list only has 1 page.

**Expected:** the pager looks and behaves exactly as before — disabled at both ends, "page 2 of 3" in the middle — and `Pagination` contains no reference to `query`, `sort`, `PEOPLE`, or `PAGE_SIZE`.

### ⭐⭐⭐ 5. Lift the pipeline out of React entirely (challenge)

Move the five derivation lines into a pure function `derivePage(source, { query, sort, page, pageSize })` that returns `{ filtered, sorted, totalPages, currentPage, visible }`, defined outside the component. `App` then calls it once and destructures. Because it takes no hooks and touches no state, you can write assertions for it in Node — do that too, covering the clamp and the empty-result case.

**Practices:** separating "what the feature computes" from "where the state lives" — the same trick that let js#26's `sortBy` cross tracks.

**Hint:** the function body is the existing pipeline with `PEOPLE` and `PAGE_SIZE` turned into parameters. Test it by passing a deliberately out-of-range `page`.

**Expected:** the page behaves identically, `App` loses five lines, and `derivePage(PEOPLE, { query: 'ada', sort: { key: 'name', descending: false }, page: 5, pageSize: 3 })` returns `currentPage: 0`, `totalPages: 1`, and a single Ada row — with `PEOPLE` still in its original order afterwards.

### ⭐⭐⭐ 6. Selection that survives the pipeline (challenge)

Add a checkbox column so rows can be selected, plus a "N selected" line. The rules: selecting a row, then searching, sorting, and paging around must never lose or move a selection, and the state you add must be genuine state — not something the pipeline could have derived. Then add a "select all on this page" checkbox that only affects the currently visible rows.

**Practices:** identity-based state next to a derived pipeline, and updating a `Set` in React without mutating it.

**Hint:** store names, not row indexes — index 0 means a different person after every sort. `setSelected(prev => { const next = new Set(prev); ...; return next; })`.

**Expected:** tick Ada, search "kath", sort by score, come back — Ada is still ticked and the count still says 1. The page checkbox ticks exactly the three rows on screen and clears exactly those, leaving off-page selections alone.

## Solutions

### 1. "showing 4–6 of 6"

```jsx
const total = sorted.length;
const firstRow = currentPage * PAGE_SIZE + 1;
const lastRow = Math.min(firstRow + PAGE_SIZE - 1, total);

// under the table:
<p style={{ color: '#666' }}>
  {total === 0 ? 'no matching people' : `showing ${firstRow}–${lastRow} of ${total}`}
</p>
```

**Why:** `sorted` is the whole matching set and `currentPage` is already clamped, so both ends of the range fall out of values the pipeline computed anyway — storing a count would just be a second copy waiting to disagree. `Math.min` handles the partial last page: page 3 of seven rows wants 7–9 and gets 7–7. The empty case needs its own branch because the arithmetic is technically fine but reads as nonsense; note the pager still says "page 1 of 1", since `totalPages` has a `Math.max(1, ...)` floor.

### 2. Predict the whole click sequence

(a) load → **Ada, Alan, Barbara**. (b) click name → **Katherine, Grace, Edsger**. (c) type "a" → **Katherine, Grace, Donald**. (d) click score → **Alan, Donald, Grace**. (e) next → **Barbara, Ada, Katherine**. (f) clear the box → **Edsger, Alan, Donald**. The clamp changed nothing at any step.

**Why:** the default sort is name-ascending, so the first page is the alphabetical first three; clicking the active header flips `descending` and the list reverses. Typing "a" matches six of seven names (Edsger is the odd one out) and resets the page to 0, so you see the descending top three of that six. A header click never touches the page, and score-ascending puts Alan (91) first. "next" moves to page 1, and clearing the box fires the same `onChange` as typing — `setPage(0)` runs, so you land on page 1 of the full list, still sorted by score. That's the clamp answer: every list-shrinking action in this app goes through the search box, which already resets the page, so `Math.min` never fires. It's insurance against the *next* feature — add a filter checkbox that forgets `setPage(0)` and it starts earning its keep silently.

### 3. The memo that froze the table

The symptom: `sorted` is recomputed only when the sort key or direction changes, so the table keeps rendering the rows from whichever search was active at the last header click. `totalPages`, `currentPage`, and `visible` all read from `sorted`, so the pager freezes with it — only the search box's own text updates, which is what makes it feel like the app stopped listening. The fix is to memoize both stages:

```jsx
const filtered = React.useMemo(
  () => PEOPLE.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
  [query],
);
const sorted = React.useMemo(
  () => sortBy(filtered, (p) => p[sort.key], { descending: sort.descending }),
  [filtered, sort.key, sort.descending],
);
```

**Why:** a dependency array is compared with `Object.is`, and `PEOPLE.filter(...)` builds a fresh array on every render — so an unmemoized `filtered` is a *different value* every time, and the sort memo would re-run always. Memoizing `filtered` on `[query]` makes it referentially stable between keystrokes, which is the only thing that lets the second memo ever hold. That's the general rule: a memo is only as stable as its least stable dependency, which is why `useMemo`/`useCallback` tend to arrive in chains. And the honest footnote — seven rows do not need any of this; project 27's point is that you memoize when a measurement says to, and the cost here is two dependency arrays that can now be wrong.

### 4. Extract the pager

```jsx
function Pagination({ page, totalPages, onChange }) {
  return (
    <p>
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>prev</button>
      {' '}page {page + 1} of {totalPages}{' '}
      <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>next</button>
    </p>
  );
}

// in App, replacing the old paragraph:
<Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
```

**Why:** the pager needs three facts — where am I, how many pages, and who to tell when I move — and knows nothing about people, queries, or sorting, which is exactly what makes it extractable. Passing `currentPage` rather than `page` matters: the clamped value is the one the table actually rendered, so "prev" from a stale `page` of 5 on a one-page list would set 4 (still stale, still clamped, button apparently broken), whereas from `currentPage` of 0 it can't be pressed at all. Handing `setPage` straight down as `onChange` is fine here — the component only ever passes it a number.

### 5. Lift the pipeline out of React entirely

```js
function derivePage(source, { query, sort, page, pageSize }) {
  const filtered = source.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()));
  const sorted = sortBy(filtered, (p) => p[sort.key], { descending: sort.descending });
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return { filtered, sorted, totalPages, currentPage, visible };
}

// in App:
const { sorted, totalPages, currentPage, visible } =
  derivePage(PEOPLE, { query, sort, page, pageSize: PAGE_SIZE });
```

```js
// pipeline.test.js — plain Node, no React, no browser
const asc = { key: 'name', descending: false };
const stale = derivePage(PEOPLE, { query: 'ada', sort: asc, page: 5, pageSize: 3 });
console.assert(stale.currentPage === 0 && stale.totalPages === 1, 'clamps a stale page');
console.assert(stale.visible.length === 1 && stale.visible[0].name === 'Ada', 'shows the match');

const none = derivePage(PEOPLE, { query: 'zz', sort: asc, page: 4, pageSize: 3 });
console.assert(none.totalPages === 1 && none.visible.length === 0, 'empty result, one page');
console.assert(PEOPLE[0].name === 'Ada', 'source array never mutated');
console.log('pipeline ok');
```

**Why:** the pipeline never needed React — it's a function from (data, choices) to (rows, page info), and hooks were only ever supplying the choices. Pulling it out buys three things: the interaction rules become testable without rendering anything, `App` reads as "state, derive, render", and the same function could serve a different UI (or the URL-driven version project 42 hints at). The clamp assertion is the one worth keeping forever, because it encodes the invariant the whole refactor exists to guarantee: no combination of inputs can produce out-of-range rows.

### 6. Selection that survives the pipeline

```jsx
const [selected, setSelected] = useState(() => new Set());

function toggle(name) {
  setSelected((prev) => {
    const next = new Set(prev);        // copy: never mutate state in place
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
}

const allOnPageSelected = visible.length > 0 && visible.every((p) => selected.has(p.name));

function togglePage() {
  setSelected((prev) => {
    const next = new Set(prev);
    visible.forEach((p) => (allOnPageSelected ? next.delete(p.name) : next.add(p.name)));
    return next;
  });
}

// header cell:
<th><input type="checkbox" checked={allOnPageSelected} onChange={togglePage} /></th>
// body cell:
<td>
  <input type="checkbox" checked={selected.has(p.name)}
         onChange={() => toggle(p.name)} />
</td>
// under the table:
<p>{selected.size} selected</p>
```

**Why:** "which rows did the user tick" cannot be computed from query, sort, and page — it's a genuine fourth choice, so it earns its `useState` by the same test the other three passed. Keying it by name rather than by row index is what makes it survive the pipeline: indexes describe positions in a list that re-sorts under them, while a name describes the person. The `new Set(prev)` copy is non-negotiable — mutating and returning the same Set gives React a value that is `Object.is`-equal to the old one, and the re-render is skipped, so the checkbox appears not to respond. `allOnPageSelected` and the count are derived as usual, which is why the header checkbox self-corrects when you page or search.
