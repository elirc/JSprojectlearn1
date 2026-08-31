# 🏋️ Practice: Paginated API

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The empty page in the middle (warm-up)

Real APIs return empty pages — rows deleted between requests, a filter that matches nothing on this slice — and an empty page is *not* the last page. Write a test with a hand-built fake whose three pages are `[{id:1}]` → `[]` → `[{id:3}]`, the middle one still carrying a non-null cursor. Assert `collectAll` returns both items and made 3 requests. Then check the other end: a fake whose only page is `{ items: [], nextCursor: null }` gives `[]` after 1 request, with no crash.

What it practices: separating "this page is empty" from "there are no more pages" — two conditions people routinely conflate.

Hint: `yield* []` yields nothing and returns immediately, so the `do...while` simply moves to the next cursor. That's why the code needs no special case; the test just proves it.

### ⭐⭐ 2. A safety valve for a broken API (core)

`paginate` trusts the server completely: if a buggy endpoint keeps returning the same cursor, the loop runs forever, quietly making infinite requests. Write `paginateSafely(getPage, { maxPages = 100 })` that throws when the page budget is exhausted *and* throws immediately if a cursor is ever repeated. Check offline: 60 items at 25/page still streams all 60; an API always returning `nextCursor: 'same'` throws `Pagination loop` after exactly 2 requests; an API inventing a fresh cursor forever throws `maxPages (5)` when capped at 5.

What it practices: bounding a loop whose stop condition comes from an untrusted source — and detecting the cycle before the budget even runs out.

Hint: a `Set` of cursors you've already followed. Check `seen.has(cursor)` *after* confirming the cursor isn't `null`, or a legitimate final page will look like a loop.

### ⭐⭐ 3. Operators that compose (core)

Async generators chain the same way array methods do. Write three tiny helpers — `mapAsync(source, fn)`, `filterAsync(source, predicate)` (both async generators), and `takeAsync(source, count)` (returning an array) — that work on *any* async iterable, not just this API. Then build a pipeline: even-id users, mapped to names, first 4. Check offline against a 250-item/25-per-page fake: the result is `['user2','user4','user6','user8']` after exactly **1** request. Also check `takeAsync(paginate(getPage), 30)` costs 2 requests, and `takeAsync(paginate(getPage), 0)` costs **0**.

What it practices: laziness surviving composition — a filter and a map in the middle don't force the stream to run to the end.

Hint: `for await (const item of source) yield fn(item);` is the entire body of `mapAsync`. In `takeAsync`, `break` after collecting enough — and return early when `count <= 0` so the source is never even started.

### ⭐⭐ 4. Yield pages, then build items on top (core)

Sometimes you want whole pages — to write each batch to a file, or to show "page 3 of 10". Write `paginatePages(getPage)` yielding each page's `items` *array*, then rewrite `paginate` as a three-line consumer of it, so the cursor loop exists in exactly one place. Check offline with 60 items at 25/page: `paginatePages` yields arrays of lengths `[25, 25, 10]` in 3 requests; the rewritten `paginate` still streams 60 items ending with `user60`; and `break`ing out of `paginatePages` after the first page still costs only 1 request.

What it practices: layering — a lower-level stream plus a one-line adapter, instead of two copies of the same loop.

Hint: `async function* paginate(getPage) { for await (const items of paginatePages(getPage)) yield* items; }` — `yield*` over an array yields its elements one at a time.

### ⭐⭐⭐ 5. Prefetch the next page (challenge)

Right now the consumer is idle during every fetch and the server is idle during every bit of processing. Write `paginatePrefetching(getPage)` that starts the request for page N+1 *before* yielding page N's items, so processing and fetching overlap. Check offline deterministically: create the generator over a 250-item fake, call `.next()` once, and `requests()` must already be **2** — page 2 is in flight while you hold item 1. Also confirm no over-fetching: streaming all of a 60-item fake still makes exactly 3 requests, and an empty API makes 1.

What it practices: holding a promise instead of awaiting it — the core move behind every pipelined or double-buffered system.

Hint: keep a `pending` promise. The loop is: `const page = await pending;` then set `pending` to the *next* request (or `null` on the last page), and only then `yield* page.items`.

### ⭐⭐⭐ 6. Retry each page (challenge)

One flaky page shouldn't lose a 10-page crawl. Compose with project 43: write `withRetry(getPage, options)` returning a new `getPage` that retries the underlying call — a wrapper the pagination code knows nothing about. Check offline with a fake that fails once on the page at cursor 25: `collectAll(withRetry(counting, { attempts: 3, sleep: () => Promise.resolve() }))` returns all 75 items, and the underlying function was called exactly 4 times (page 1, page 2 failing, page 2 again, page 3).

What it practices: composing two independent tools by wrapping the *function* they share, rather than teaching either one about the other.

Hint: `(cursor) => retry(() => getPage(cursor), options)`. The inner arrow matters — `retry` needs something it can call *again*, not a promise that already failed.

## Solutions

### 1. The empty page in the middle

```js
test('an empty page is not the last page', async () => {
  const pages = {
    null: { items: [{ id: 1 }], nextCursor: 'b' },
    b: { items: [], nextCursor: 'c' }, // everything on this slice was deleted
    c: { items: [{ id: 3 }], nextCursor: null },
  };
  let requests = 0;
  const getPage = async (cursor) => { requests++; return pages[cursor]; };

  assert.deepEqual(await collectAll(getPage), [{ id: 1 }, { id: 3 }]);
  assert.equal(requests, 3);
});

test('an API with nothing in it ends after one request', async () => {
  assert.deepEqual(await collectAll(async () => ({ items: [], nextCursor: null })), []);
});
```

WHY: this is the same family of bug as LEARN.md's falsy-cursor experiment — code that stops when `items.length === 0` looks reasonable and silently truncates the results. Because `paginate` decides purely on `cursor !== null`, the empty page costs one wasted request and nothing else. Writing the test converts that from an accident of the implementation into a documented promise. Verified by running: both items collected in 3 requests.

### 2. paginateSafely

```js
export async function* paginateSafely(getPage, { maxPages = 100 } = {}) {
  let cursor = null;
  const seen = new Set();

  for (let page = 0; ; page++) {
    if (page >= maxPages) {
      throw new Error(
        `Pagination exceeded maxPages (${maxPages}) — the API may never return a null cursor`,
      );
    }
    const result = await getPage(cursor);
    yield* result.items;

    cursor = result.nextCursor;
    if (cursor === null) return;               // the ONLY normal exit
    if (seen.has(cursor)) {
      throw new Error(`Pagination loop: cursor ${JSON.stringify(cursor)} was already visited`);
    }
    seen.add(cursor);
  }
}
```

WHY: the loop's stop condition arrives from a server you don't control, and "trust but verify" costs six lines. The two guards catch different failures: the cursor Set catches an API that repeats itself (the common bug, caught after exactly one wasted request), while `maxPages` catches an API that invents a fresh cursor forever, which no cycle detector can spot. Order matters — checking `seen` *after* the `null` return means a legitimate last page never trips it. Verified by running: 60 items still stream, the `'same'`-cursor API throws after 2 requests, and the endless one throws at the `maxPages` budget.

### 3. Composable operators

```js
export async function* mapAsync(source, fn) {
  for await (const item of source) yield fn(item);
}

export async function* filterAsync(source, predicate) {
  for await (const item of source) if (predicate(item)) yield item;
}

export async function takeAsync(source, count) {
  const items = [];
  if (count <= 0) return items;   // never even start the source
  for await (const item of source) {
    items.push(item);
    if (items.length === count) break; // stops the whole chain
  }
  return items;
}
```

```js
const names = await takeAsync(
  mapAsync(filterAsync(paginate(getPage), (u) => u.id % 2 === 0), (u) => u.name),
  4,
);
// ['user2','user4','user6','user8'] — 1 request
```

WHY: laziness composes because each operator only pulls from its source when *it* is pulled from. The `break` in `takeAsync` propagates all the way down the chain — `for await` calls the generator's `return()` on exit, which unwinds `mapAsync`, then `filterAsync`, then `paginate`, and the next page is never requested. That's why four names out of a 250-item API cost one request even with two operators in between. The `count <= 0` early return matters for the same reason: touching the source at all would fire a request nobody wanted. Verified by running: 1 request for the pipeline, 2 for 30 items, 0 for `count: 0`.

### 4. Pages, then items

```js
/** The cursor loop, in one place, yielding whole pages. */
export async function* paginatePages(getPage) {
  let cursor = null;
  do {
    const page = await getPage(cursor);
    yield page.items;
    cursor = page.nextCursor;
  } while (cursor !== null);
}

/** Items are just pages, flattened. */
export async function* paginate(getPage) {
  for await (const items of paginatePages(getPage)) yield* items;
}
```

WHY: the README's rule is "write the loop once", and this pushes it one level further — now even the item-level stream doesn't own a cursor loop, so the falsy-cursor bug has exactly one place it could ever live. `yield*` over an array is what makes the adapter a single line: it delegates, yielding each element and then returning control. Laziness survives the extra layer intact, which the 1-request `break` check proves. Verified by running: page sizes `[25, 25, 10]` in 3 requests, 60 items ending at `user60`, and 1 request when breaking after the first page.

### 5. Prefetching

```js
export async function* paginatePrefetching(getPage) {
  let pending = getPage(null); // request page 1 — note: NOT awaited

  while (pending !== null) {
    const page = await pending;
    // Fire the NEXT request before handing out this page's items.
    pending = page.nextCursor === null ? null : getPage(page.nextCursor);
    yield* page.items;
  }
}
```

```js
test('the next page is already in flight while you hold this one', async () => {
  const { getPage, requests } = makeFakeApi(250, 25);
  const iterator = paginatePrefetching(getPage);
  await iterator.next();
  assert.equal(requests(), 2); // page 2 requested before item 1 was delivered
  await iterator.return();     // stop the generator; don't leak it
});
```

WHY: the trick is that `getPage(cursor)` *starts* the work and returns a promise — awaiting is a separate decision you can postpone. Moving the `yield*` after the next request means the consumer's processing time and the server's response time overlap instead of alternating, which roughly halves the wall clock for a slow-consumer crawl. The cost is honest and worth stating: you always fetch one page further than you strictly need, so a consumer that breaks early has paid for one wasted request — the price of the pipeline. Setting `pending = null` on the last page is what keeps it from fetching past the end. Verified by running: 2 requests after one `.next()`, 3 requests total for a 3-page API, 1 for an empty one.

### 6. Retry each page

```js
import { retry } from '../../43-retry-timeout/refactored/retry.js';

/** Wrap a getPage so each individual page request retries on failure. */
export function withRetry(getPage, options) {
  return (cursor) => retry(() => getPage(cursor), options);
}

// usage: await collectAll(withRetry(getPage, { attempts: 3 }));
```

WHY: neither `paginate` nor `retry` needed a single line of change, because they meet at a shared shape — a function you can call that returns a promise. The wrapper produces something with the identical `(cursor) => Promise<{items, nextCursor}>` signature, so pagination cannot tell the difference, and retries stay per-page: a failure on page 7 re-fetches page 7 only, and the six pages already streamed are never re-requested. The inner `() => getPage(cursor)` is essential — passing `getPage(cursor)` would hand `retry` a promise that has already failed and can never be re-run, and it would silently "retry" the same dead result. Verified by running: all 75 items collected despite one failure, with exactly 4 underlying calls.
