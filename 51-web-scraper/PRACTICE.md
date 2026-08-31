# 🏋️ Practice: Web Scraper

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The near-miss classes (warm-up)

`parseCatalogPage` uses `\bbook\b` (word boundaries) in its block pattern — but nothing tests what that actually protects against. Write a test asserting three inputs all return `[]`: a page with no list items at all (`<p>Coming soon!</p>`), a `<li class="notebook">` (contains "book" but isn't one), and a `<li class="book">` whose span has class `priceless` (contains "price" but isn't one).

What it practices: testing what a parser correctly *rejects* — the half of parsing beginners skip.
Hint: `\bbook\b` matches "book" only as a whole word; "notebook" has no boundary before "book".

### ⭐⭐ 2. Thousand-separator prices (core)

Feed `parseCatalogPage` a book priced `$1,299.00` and you get `priceCents: 100` — the pattern `[0-9.]+` stops at the comma and silently captures just `1`. A wrong price is worse than no price. Fix the price pattern to accept commas and strip them before converting: `$1,299.00` → `129900`, while `$5.50` still → `550`. Add a test for both.

What it practices: hardening one small anchored pattern against real-world data — without growing a mega-regex.
Hint: two changes on adjacent lines — add `,` to the character class, and `replaceAll(',', '')` before `Number(...)`.

### ⭐⭐ 3. Prove the cap (core)

`scrapeCatalog` promises to stop at `maxPages`, but every existing test ends with an empty page instead. Write a test with a fake site whose pages *never* run out (every page returns one book), call `scrapeCatalog({ maxPages: 5, ... })`, and assert exactly 5 books came back and exactly 5 URLs were requested.

What it practices: testing a safety limit by building an adversarial fake — the site that never says stop.
Hint: your `fetchFn` can read the page number with `new URL(url).searchParams.get('page')` and always answer with a book.

### ⭐⭐ 4. The sticky book (core)

Catalog sites often pin a featured item onto *every* page, so a naive crawl collects it once per page. Add a `dedupe: false` option to `scrapeCatalog`: when `true`, a book whose title was already collected is skipped. Test with a 2-page fake site where "Sticky Book" appears on both pages: expect `['Sticky Book', 'Book 1', 'Book 2']`, with existing tests untouched (default off).

What it practices: extending the crawl loop with a feature, guarded by an option that preserves old behavior.
Hint: a `Set` of seen titles; be careful to keep the empty-page early stop *before* the dedupe filtering.

### ⭐⭐⭐ 5. One dead page shouldn't kill the crawl (challenge)

If page 2 of 40 returns a permanent 404, `fetchPage` throws and the whole crawl dies — pages 3-40 are lost. Add a `skipErrors: false` option: when `true`, a page whose fetch fails is recorded as `{ page, message }` and the crawl continues to the next page, and the function returns `{ books, errors }` instead of a bare array. Test: pages 1 and 3 have books, page 2 is a permanent 404, page 4 is empty → `books` holds Book 1 and Book 3, `errors` equals `[{ page: 2, message: 'HTTP 404' }]`. Default behavior (throwing) must survive for the existing tests.

What it practices: allSettled-thinking — turning failures into results — layered onto a loop as an opt-in.
Hint: `try/catch` around the `fetchPage` call only; `continue` on failure; pick the return shape at the very end.

## Solutions

### 1. The near-miss classes

```js
test('parseCatalogPage rejects near-misses: no items, "notebook", "priceless"', () => {
  assert.deepEqual(parseCatalogPage('<html><body><p>Coming soon!</p></body></html>'), []);
  assert.deepEqual(
    parseCatalogPage('<li class="notebook"><h3>Not a book</h3><span class="price">$9.00</span></li>'),
    [],
  );
  assert.deepEqual(
    parseCatalogPage('<li class="book"><h3>X</h3><span class="priceless">$9.00</span></li>'),
    [],
  );
});
```

WHY: the README's parsing rule is "skipped, never mis-paired" — matching too *much* is the mega-regex disease in reverse. The `\b` word boundaries are doing silent, untested work; the "notebook" case pins them down, and the "priceless" case proves a block missing a real price is dropped rather than half-parsed. (The third case returns `[]` because `title` parses but `price` is `undefined`, hitting the `continue`.)

### 2. Thousand-separator prices

```js
const price = block.match(/<span[^>]*\bclass="[^"]*\bprice\b[^"]*"[^>]*>\$?([0-9.,]+)</)?.[1];
if (title === undefined || price === undefined) continue;
books.push({
  title: decodeEntities(title.trim()),
  priceCents: Math.round(Number(price.replaceAll(',', '')) * 100),
});
```

```js
test('prices with thousand separators parse to correct cents', () => {
  const html = `<li class="book"><h3>Atlas</h3><span class="price">$1,299.00</span></li>`;
  assert.deepEqual(parseCatalogPage(html), [{ title: 'Atlas', priceCents: 129900 }]);
});
```

WHY: this is "clean data at the boundary" (the project's integer-cents rule) meeting real markup: the old pattern didn't *fail* on `$1,299.00`, it succeeded wrongly — the most dangerous kind of bug a scraper can ship, because nothing crashes. Widening one small anchored pattern plus one `replaceAll` keeps the fix local to the field it concerns.

### 3. Prove the cap

```js
test('scrapeCatalog stops at maxPages even if the site never ends', async () => {
  const log = [];
  const endless = async (url) => {
    log.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    return {
      ok: true, status: 200,
      text: async () => `<li class="book"><h3>Book ${page}</h3><span class="price">$1.00</span></li>`,
    };
  };
  const books = await scrapeCatalog({ fetchFn: endless, sleep: () => Promise.resolve(), maxPages: 5 });
  assert.equal(books.length, 5);
  assert.equal(log.length, 5);
});
```

WHY: politeness is the scraper's ethic, and `maxPages` is its hard backstop — the one guarantee that holds even against a misbehaving (or infinite) site. The existing tests only exercised the *early stop*; this fake removes that exit so the loop's other boundary finally gets checked, using the same injected-`fetchFn` machinery.

### 4. The sticky book

```js
export async function scrapeCatalog({
  baseUrl = 'https://books.example.test/catalog',
  maxPages = 50,
  delayMs = 1000,
  fetchFn = fetch,
  sleep = defaultSleep,
  dedupe = false,
} = {}) {
  const books = [];
  const seenTitles = new Set();
  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs);
    const html = await fetchPage(`${baseUrl}?page=${page}`, { fetchFn, sleep });
    const found = parseCatalogPage(html);
    if (found.length === 0) break; // check BEFORE filtering — a page of repeats isn't empty
    for (const book of found) {
      if (dedupe && seenTitles.has(book.title)) continue;
      seenTitles.add(book.title);
      books.push(book);
    }
  }
  return books;
}
```

WHY: a `Set` is the same "have I seen this?" tool the link checker uses for URLs, applied to titles. The subtle ordering matters: the early stop must test the *raw* parse result, because a page containing only already-seen books still proves the catalog hasn't ended — filter first and you'd end the crawl early. Defaulting to `false` keeps every existing test green.

### 5. One dead page shouldn't kill the crawl

Combine with the loop from solution 4 (both options coexist):

```js
export async function scrapeCatalog({
  /* ...same options... */
  skipErrors = false,
} = {}) {
  const books = [];
  const errors = [];
  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs);
    let html;
    try {
      html = await fetchPage(`${baseUrl}?page=${page}`, { fetchFn, sleep });
    } catch (err) {
      if (!skipErrors) throw err;
      errors.push({ page, message: err.message });
      continue; // one broken page shouldn't cost us the rest
    }
    const found = parseCatalogPage(html);
    if (found.length === 0) break;
    books.push(...found);
  }
  return skipErrors ? { books, errors } : books;
}
```

```js
test('skipErrors: a dead page is recorded, the crawl continues', async () => {
  const site = async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    if (page === 2) return { ok: false, status: 404, text: async () => '' };
    const body = page <= 3
      ? `<li class="book"><h3>Book ${page}</h3><span class="price">$${page}.00</span></li>` : '';
    return { ok: true, status: 200, text: async () => body };
  };
  const { books, errors } = await scrapeCatalog({ fetchFn: site, sleep: () => Promise.resolve(), skipErrors: true });
  assert.deepEqual(books.map((b) => b.title), ['Book 1', 'Book 3']);
  assert.deepEqual(errors, [{ page: 2, message: 'HTTP 404' }]);
});
```

WHY: this is the link checker's "dead links are results, not errors" lesson arriving one project early — a scraper that dies at page 2 of 40 throws away 38 pages of good data over one bad one. Retry (project 43) still handles *transient* trouble underneath; `skipErrors` handles *permanent* failure above it, and the two layers stay independent. The `continue` (not `break`) is the heart of it: a missing page is not the end of the catalog. (Verified with node: books 1 and 3 survive, the error row matches exactly, and the default still throws.)
