# 📘 Learning Guide: Searchable Table

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A table of seven famous computer scientists — name, role, score — with
three features stacked on top:

- a **search box** that filters rows by name as you type;
- **clickable column headers** that sort by that column (the refactor
  adds a second click to flip the direction, with ↑/↓ arrows);
- **pagination**: only 3 rows show at a time, with prev/next buttons
  and "page 1 of 3".

Both versions look nearly identical. But in the original, a specific
sequence of clicks — search "a", go to page 2, clear the search —
leaves the table showing the **wrong rows**. In the refactor, no
combination of inputs can ever do that.

## 2. Concepts you need first

### Derived state (the star of this project)

Project 09's rule, now at feature scale: if a value can be
**computed** from other state, don't store it — compute it during
render. Stored copies must be kept in sync; computed values *can't*
be out of sync, because they're recalculated fresh every time.

```js
const [items, setItems] = useState(['ant', 'bee', 'cat']);
const [query, setQuery] = useState('b');
// DON'T make a useState for this — just compute it:
const matching = items.filter((x) => x.includes(query)); // ['bee']
```

The displayed rows of this table are exactly such a value: they are
fully determined by (data, query, sort, page). Storing them is the
original's sin.

### The array tools: filter, sort, slice

```js
[3, 1, 2].filter((n) => n > 1)  // [3, 2]  — keep matching items (new array)
[3, 1, 2].slice(0, 2)           // [3, 1]  — copy a range (new array)
[3, 1, 2].sort((a, b) => a - b) // [1, 2, 3] — sorts IN PLACE (mutates!)
```

The trap: `filter` and `slice` return new arrays and leave the
original alone, but **`sort` rearranges the array you call it on**.
Sort your source data directly and every feature that reads it
afterward sees scrambled data. The fix is copy-then-sort:
`[...items].sort(...)` — spread into a fresh array first.

A **comparator** is the function you give `sort`: it takes two items
and returns a negative number ("a first"), positive ("b first"), or 0
(equal).

### A pipeline (stages that feed each other)

A **pipeline** is a series of transformations where each stage's
output is the next stage's input:

```js
const filtered = data.filter(...);   // stage 1
const sorted   = sortBy(filtered);   // stage 2 reads stage 1
const visible  = sorted.slice(...);  // stage 3 reads stage 2
```

Read top to bottom, it *is* the feature description: "filter, then
sort, then take one page." Each intermediate result (`filtered`,
`sorted`) has a name and is available to anything else that needs it —
like a page counter that needs the filtered length.

### Pagination math

With `PAGE_SIZE = 3`, page numbers (starting at 0) map to slices:
page 0 → items 0–2, page 1 → items 3–5. In general:

```js
const start = page * PAGE_SIZE;
const visible = sorted.slice(start, start + PAGE_SIZE);
const totalPages = Math.ceil(sorted.length / PAGE_SIZE); // 7 rows -> 3 pages
```

`Math.ceil` rounds up — 7/3 = 2.33 → 3 pages (the last one partial).

### Clamping (forcing a number into range)

**Clamping** squeezes a value into legal bounds.
`Math.min(page, totalPages - 1)` means "the page can't exceed the last
page." If state says page 2 but only 1 page exists now, the clamp
quietly renders page 0 instead of nonsense. It's a structural
guarantee: even a stale number can't produce wrong output.

### Effects for syncing state — the anti-pattern here

`useEffect(fn, [a, b])` runs `fn` after render whenever `a` or `b`
changed. The original uses an effect to *recompute state from other
state* — a known anti-pattern (project 21): it adds an extra render
(render wrong → effect fixes state → render again), it hides the
data flow, and it invites exactly the sync bugs this project
demonstrates. Effects are for talking to the outside world, not for
math on your own state.

### Higher-order sort keys

`sortBy(items, keyOf, { descending })` takes a **keyOf function** —
"given an item, what value do we sort by?" — e.g. `(p) => p.score`.
The `{ descending = false } = {}` in its signature is a **default
parameter with destructuring**: options are optional, and omitted
flags default sensibly.

## 3. Walking through the original code

Four pieces of state — one too many:

```js
const [query, setQuery] = useState('');
const [sortKey, setSortKey] = useState('name');
const [page, setPage] = useState(0);
const [rows, setRows] = useState(PEOPLE);   // <- the copy
```

`rows` is what the table renders. It's a stored *copy* of what could
be computed. The syncing happens in an effect:

```js
useEffect(() => {
  let result = PEOPLE.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()));
  result.sort((a, b) => (a[sortKey] < b[sortKey] ? -1 : 1));
  setRows(result.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE));
}, [query, sortKey, page]);
```

Whenever the query, sort column, or page changes, this re-filters,
sorts (mutating `result` — safe *here* because `result` is fresh from
`filter`, but the comment records that an earlier version sorted
`PEOPLE` itself and scrambled the source), slices out one page, and
stores it.

Then comes the tell-tale duplication:

```js
const totalPages = Math.ceil(
  PEOPLE.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).length / PAGE_SIZE,
);
```

The page counter needs "how many rows survived the filter" — but the
effect swallowed that intermediate value and only stored the final
3-row slice. So the filter runs **again**, written out a second time.
Two copies of the same logic, free to drift apart.

The table renders `rows`; the headers call `setSortKey`; prev/next
call `setPage`.

## 4. What's wrong with it (in beginner terms)

**The live bug — walk it through.** Type "a" in the search box.
Five names contain an "a" — say that's 2 pages. Click to page 2.
Now clear the search box. Watch:

- `query` becomes `''` — the full 7-person list is back, which has
  3 pages with different boundaries;
- but `page` is still `1` (page 2) — nobody told it the world changed;
- the effect happily slices page 2 of the *new* list: rows that answer
  a question you're no longer asking. Depending on the sequence you
  can also land on an empty page while the buttons insist there's
  data.

The deeper cause: three features (filter, sort, pagination) all write
one shared `rows` blob from different directions, and **no code owns
the rules for how they interact**. "When the filter changes, what
should happen to the page?" is a real question, and nothing answers it.

**The duplication.** The filter exists twice — once in the effect,
once in `totalPages`. Change one (say, also search roles) and forget
the other: the table and the page counter now disagree. Duplicated
logic is a bug with a delay timer.

**The mutation scar.** `sort()` mutates. The comment trail records the
classic accident: sorting `PEOPLE` directly, permanently scrambling
the source array for every feature that reads it later. This version
dodged it by luck (sorting the fresh `filter` output), not by design.

**The extra render.** State change → render (with stale rows) → effect
→ setRows → render again. Invisible at 7 rows; a habit that hurts at
7,000.

## 5. Try it yourself first!

1. **Vague:** which of the four `useState`s could you delete because
   it's computable from the others?
2. **Warmer:** delete `rows` and the whole `useEffect`. In the
   component body, compute `filtered`, then `sorted`, then `visible`
   as plain consts, each from the previous. State should be only the
   user's three choices: query, sort, page.
3. **The bug fix, part 1 (UX):** when the user types a new search,
   what page should they land on? Put that decision in the search
   box's onChange.
4. **The bug fix, part 2 (safety):** even so, could `page` ever exceed
   the last page? Clamp it in the pipeline with `Math.min` so wrong
   rows are *impossible*, not just unlikely.
5. **Sort safely:** write `sortBy(items, keyOf, { descending })` that
   copies before sorting (`[...items].sort(...)`). Bonus: make
   clicking the same header twice flip the direction, and show ↑/↓.

## 6. Understanding the refactored solution

**State shrank to the user's three choices:**

```js
const [query, setQuery] = useState('');
const [sort, setSort] = useState({ key: 'name', descending: false });
const [page, setPage] = useState(0);
```

Nothing here is computable from anything else — that's the test for
what deserves state. Note `sort` grew a `descending` flag: direction
toggling became possible *because* sort is a small data object rather
than a side effect.

**The pipeline, fresh every render:**

```js
const filtered = PEOPLE.filter((p) =>
  p.name.toLowerCase().includes(query.toLowerCase()));
const sorted = sortBy(filtered, (p) => p[sort.key], { descending: sort.descending });
const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
const currentPage = Math.min(page, totalPages - 1); // stale page? CLAMPED.
const visible = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
```

Five lines, readable top to bottom as the spec. `totalPages` reads
`sorted.length` directly — the duplication is gone because the
intermediate has a name. (Is recomputing wasteful? Seven rows of
filter+sort per keystroke is nothing; project 27 covers when
memoizing becomes worth it. Correct first, fast when measured.)

**The stale-page bug is fixed twice, deliberately:**

1. *UX rule, in the handler:*
   `onChange={(e) => { setQuery(e.target.value); setPage(0); }}` —
   "a new search starts you at page 1" is a product decision, and it
   lives where user actions are interpreted.
2. *Safety net, in the pipeline:* the `Math.min` clamp. Even if some
   future code path leaves a stale page number, the render **cannot**
   show out-of-range rows. Rules where they belong; invariants
   enforced structurally.

Note the buttons use `currentPage` (the clamped value), so prev/next
always reason about what's actually on screen.

**`sortBy` — the JS-track utility, earning rent:**

```js
function sortBy(items, keyOf, { descending = false } = {}) {
  const order = descending ? -1 : 1;
  return [...items].sort((a, b) => {
    const ka = keyOf(a), kb = keyOf(b);
    return ka < kb ? -order : ka > kb ? order : 0;
  });
}
```

`[...items]` copies first — the source array is never mutated, by
construction rather than by care. And direction toggling is three
lines in the handler:

```js
setSort((s) => ({ key, descending: s.key === key ? !s.descending : false }));
```

Same column clicked again → flip direction; new column → ascending.
The ↑/↓ arrow next to the active header is derived, of course.

**Real-world note:** the pipeline's inputs — query, sort, page — are
exactly the kind of state users expect to survive refresh and to
share. Project 42's URL lesson applies: same architecture, with the
three choices living in the address bar.

## 7. Words you learned (glossary)

- **Derived state:** a value computed from other state during render
  instead of stored.
- **Pipeline:** transformations chained so each stage reads the
  previous one's output.
- **Intermediate:** a named mid-pipeline result (like `filtered`)
  that other code can reuse.
- **filter / slice:** array methods returning new arrays (keep
  matches / copy a range).
- **sort:** array method that reorders **in place** (mutates).
- **Comparator:** the two-argument function `sort` uses to order
  items.
- **Copy-then-sort:** `[...items].sort(...)` — sort a copy so the
  source survives.
- **Mutation:** changing an existing array/object rather than making
  a new one.
- **keyOf function:** a function extracting the value to sort by,
  e.g. `(p) => p.score`.
- **Pagination:** splitting rows into fixed-size pages.
- **Math.ceil:** round up to a whole number.
- **Clamp:** force a number into a legal range (here with
  `Math.min`).
- **Invariant:** a condition that must always hold ("the rendered
  page is in range") — best enforced by structure, not by discipline.
- **Anti-pattern:** a common solution that reliably causes problems
  (here: syncing derived state with an effect).
- **Stale state:** a stored value describing a world that has since
  changed.
- **Default parameter:** a fallback value used when an argument is
  omitted.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load.

1. **Reproduce the bug, then watch it die.** In the original: search
   "a", page 2, clear search — note the wrong/odd rows. Same steps in
   the refactor — expected: you land on a valid page, always. Then
   comment out the `Math.min` clamp line (keep the `setPage(0)`),
   and find a sequence that still breaks (hint: sort by score on
   page 3 of an unfiltered list... can you shrink the list another
   way?). The two fixes cover different holes.
2. **Extend the filter to roles.** In the refactor, change the filter
   to also match `p.role`. Expected: searching "adm" finds Grace, and
   `totalPages` stays correct automatically — one edit, because the
   intermediate isn't duplicated. Try the same edit in the original:
   it takes two edits, in two places, or the counter lies.
3. **Feel the mutation scar.** In the refactor, change `sortBy` to
   `items.sort(...)` (no spread). Click headers a few times, then
   clear all filters. Expected: PEOPLE itself is now permanently
   reordered — the "original order" is gone forever. Undo the change
   and appreciate the spread.
4. **Change the page size.** Set `PAGE_SIZE = 2`. Expected: 4 pages
   of the full list; every button, counter, and clamp adapts with
   zero further edits — they're all derived from one constant.
5. **Add a fourth feature to the pipeline.** Insert a stage between
   filter and sort: `const capped = filtered.filter((p) => p.score >= 90);`
   behind a checkbox state. Expected: it composes with search, sort,
   AND pagination instantly — no interaction rules to write. That's
   the whole lesson: features multiply badly as state, compose
   trivially as derivation.
