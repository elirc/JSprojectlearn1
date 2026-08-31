# 📘 Learning Guide: Web Scraper

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **web scraper**: a program that downloads web pages meant for humans and extracts structured data from them. Ours crawls a (fictional) online book catalog — page 1, page 2, page 3... — and pulls out every book's title and price:

```js
const books = await scrapeCatalog();
// [ { title: "Eloquent JS", priceCents: 3199 },
//   { title: "You Don't Know JS", priceCents: 2450 }, ... ]
```

The catalog site doesn't really exist, so you *run this project through its tests*: `node --test .` crawls a fake in-memory site — including one page that fails on the first try — and proves the whole machine works, offline.

## 2. Concepts you need first

### HTML — the text behind every web page

**HTML** is the markup language web pages are written in. Content lives inside **tags** like `<h3>...</h3>`; tags can carry **attributes** like `class="price"`. A scraper receives this as one big string:

```html
<li class="book"><h3>Eloquent JS</h3><span class="price">$31.99</span></li>
```

Scraping = finding your data inside strings like that.

### fetch, HTTP, and status codes

**`fetch(url)`** requests a URL over **HTTP** (the web's request/response protocol) and resolves to a response object. `res.text()` gives the body as a string. Every response has a **status code**: 200 = OK, 404 = doesn't exist, 503 = server temporarily overloaded. Crucially, `fetch` does *not* fail on 404 or 503 — you must check `res.status` or `res.ok` (true for 200-299) yourself.

### Promises, async/await, and sleep

A **Promise** is a placeholder for a value that arrives later; **`await`** pauses an `async` function until it arrives. There's no built-in "wait 1 second", so we build one from `setTimeout` (a **timer** — "run this function after N milliseconds"):

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
console.log("a");
await sleep(1000);
console.log("b");   // prints one second after "a"
```

### Regular expressions (regex)

A **regex** is a mini-language for describing text patterns, written between slashes. The pieces used in this project:

```js
const re = /<h3>(.*?)<\/h3>/;
console.log("x<h3>Hi</h3>y".match(re)[1]); // "Hi"
```

- `(...)` is a **capture group** — the part you want extracted; it comes back in the match result.
- `.*?` means "any characters, as few as possible" (**lazy**). Without the `?` it grabs as *much* as possible and can swallow half the page.
- `[^>]*` means "any characters except `>`" — a safe way to skip over attributes inside a tag.
- `[\s\S]*?` means "anything including newlines" (plain `.` doesn't match newlines).
- `\b` marks a **word boundary**, so `\bbook\b` matches the class `book` but not `bookmark`.
- The `g` flag means "find all matches"; `html.matchAll(re)` loops over every match.

### HTML entities

Some characters can't be written literally in HTML, so they appear **escaped**: `&amp;` means `&`, `&lt;` means `<`, `&#39;` means `'`. Scraped text keeps these unless *you* decode them:

```js
const s = "Tom &amp; Jerry";
console.log(s.replace("&amp;", "&")); // "Tom & Jerry"
```

### Money as integer cents

Never store prices as decimal numbers — binary floating point can't represent most decimals exactly:

```js
console.log(0.1 + 0.2);        // 0.30000000000000004  (!)
console.log(Math.round(31.99 * 100)); // 3199 — exact, safe integer cents
```

So `$31.99` becomes `priceCents: 3199`.

### Transient vs permanent failures, retry, and backoff

A **transient** failure is weather: the server was busy this second (503), try again and it works. A **permanent** failure is a fact: page doesn't exist (404), retrying is pointless. A **retry** helper re-runs a function a few times, sleeping between attempts; **backoff** means the sleeps grow longer each time, giving a struggling server room to breathe. This project imports a ready-made `retry(fn, options)` from project 43 rather than rebuilding it.

### Rate limiting and politeness

Firing requests in a tight loop at someone else's server looks exactly like an attack. Servers respond by **IP-banning** you (blocking your network address). Polite scrapers **rate-limit** themselves: one request at a time, a deliberate pause between requests. That's why this crawl is sequential *on purpose* — no `Promise.all` firing 50 at once.

### Dependency injection

Instead of calling the real `fetch` and real `sleep` directly, the scraper accepts both as parameters (with real ones as defaults). Tests then pass in fakes: a pretend site made of strings, and a sleep that returns instantly. Result: a full crawl, with a flaky page, tested in milliseconds with zero network.

```js
async function crawl({ fetchFn = fetch } = {}) { /* uses fetchFn */ }
// test:  crawl({ fetchFn: async (url) => ({ ok: true, text: async () => "<html>..." }) })
```

### Optional chaining (`?.`)

`a?.b` reads `a.b` but yields `undefined` instead of crashing when `a` is missing. Handy after `.match()`, which returns `null` when nothing matched:

```js
const m = "no heading here".match(/<h3>(.*?)<\/h3>/);
console.log(m?.[1]); // undefined  (no crash)
```

## 3. Walking through the original code

One function does everything. The loop:

```js
for (var page = 1; page <= 50; page++) {
  var res = await fetch("https://books.example.test/catalog?page=" + page);
```

Fifty pages, hardcoded, requested back-to-back with **zero pause** — as fast as the network allows.

```js
  var html = await res.text();
```

No status check at all. If page 37 returns a 503, `res.text()` happily returns the error page's text — or worse, the whole run dies mid-crawl with everything collected so far lost.

```js
  var re = /<li class="book"><h3>(.*?)<\/h3><span class="price">\$([0-9.]+)<\/span><\/li>/g;
  var m;
  while ((m = re.exec(html))) {
    results.push({ title: m[1], price: m[2] });
  }
```

One mega-regex that spells out the *entire* line of markup, character for character: exact class, exact tag order, no room for extra attributes. `re.exec` in a `while` loop walks through each match; `m[1]` and `m[2]` are the two capture groups. Titles go in raw (`&amp;` and all) and price stays a string (`"31.99"`).

There is no stop condition — comment 5 in the file points out that a 12-page catalog still gets asked for pages 13 through 50.

## 4. What's wrong with it (in beginner terms)

**Zero delay (the hammering problem).** Your loop fires requests as fast as they can go. To the catalog site's owner, that's indistinguishable from an attack. Day two of your project, your home IP is banned, and now even *opening the site in a browser* fails. Politeness isn't a nicety — it's what keeps your access alive.

**No retry, no status check.** Servers hiccup. In a 50-request run, one 503 is nearly guaranteed. The original dies at page 37, ten minutes in, and takes the 36 good pages down with it. You re-run the whole thing and pray. A three-attempt retry with backoff makes that hiccup invisible.

**The mega-regex.** It demands the markup *exactly*. The site adds `class="book featured"` to bestsellers → those books silently vanish from your data. The site reorders two attributes in a template update → the regex matches **nothing**, and you "successfully" scrape 50 pages of emptiness. No error, just quietly wrong data — the worst kind of bug, because you find it weeks later in a spreadsheet.

**Raw values out.** Your teammate builds a price chart and gets `"31.99" + "24.50" = "31.9924.50"` — string concatenation, not addition. Another teammate displays titles and users see `Tom &amp; Jerry`. Every consumer cleans the data differently, and none of them completely.

**No early stop.** Pages 13-50 of a 12-page catalog are 38 pointless requests — 38 extra chances to get banned, for nothing.

## 5. Try it yourself first!

1. List the three separate jobs mixed together in `scrapeAll`. (Hint: one touches the network, one reads strings, one decides the loop.) Split them into three functions.
2. Make the parsing function pure: `parseCatalogPage(html)` takes a string, returns an array of records. Test it by pasting a small HTML string — no network needed.
3. Instead of one regex matching the whole `<li>...</li>` line, use two steps: one pattern to find each book *block*, then tiny patterns to pull title and price *out of the block*. What should happen when a block has a title but no price?
4. Convert at the boundary: decode `&amp;`-style entities, and turn `"31.99"` into `3199` cents, inside the parser — so no caller ever has to.
5. In the fetch function: treat status >= 500 as retryable and 404 as not. If you have a `retry(fn, { attempts, shouldRetry, sleep })` helper (project 43 built one), use it.
6. In the crawl loop: `await sleep(delayMs)` before every request except the first, and `break` when a page parses to zero books.
7. Accept `fetchFn` and `sleep` as parameters. Write a fake `fetchFn` that serves 3 pages of hand-written HTML and then an empty page — now test the whole crawl offline.

## 6. Understanding the refactored solution

**`parseCatalogPage` — pure parsing.** Two-stage matching instead of one mega-regex:

```js
const blockRe = /<li\b[^>]*\bclass="[^"]*\bbook\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
for (const [, block] of html.matchAll(blockRe)) {
  const title = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1];
  const price = block.match(/<span[^>]*\bclass="[^"]*\bprice\b[^"]*"[^>]*>\$?([0-9.]+)</)?.[1];
  if (title === undefined || price === undefined) continue;
```

The block pattern only requires that an `<li>`'s class list *contains* the word `book` — extra classes and attributes are skipped by the `[^>]*` and `[^"]*` gaps. Fields are then pulled from *within the block*, so a title can never get paired with the price of a different book. Malformed block (missing price)? `continue` — skipped, not mis-paired. Then the boundary cleanup: `decodeEntities(title.trim())` and `Math.round(Number(price) * 100)` cents.

The file's comment is honest about limits: regex can extract from a template whose shape you know; it cannot parse arbitrary nested HTML. That is the same lesson as project 34's CSV parser — nesting defeats flat pattern matching.

**`fetchPage` — status + retry.** It wraps one fetch in the imported `retry`:

```js
if (res.status >= 500) throw new Error(`HTTP ${res.status}`); // transient
if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { permanent: true });
```

A 5xx throws a plain error → `shouldRetry: (e) => !e.permanent` says try again (3 attempts, 500ms base backoff). A 404 throws an error *tagged* `permanent: true` → retry gives up immediately. "A 404 is a fact; a 503 is weather."

**`scrapeCatalog` — the polite loop.** Sequential by design. `if (page > 1) await sleep(delayMs)` puts a gap between every pair of requests. `if (found.length === 0) break` stops at the first empty page. Both `fetchFn` and `sleep` arrive as injectable options with real defaults.

**The tests.** `pageHtml(books)` builds fixture HTML (hand-written sample data) — note it deliberately includes *extra* classes (`class="item book"`, `class="price money"`) to prove tolerance. `fakeSite()` returns a fake `fetchFn` serving N pages then empty ones, with page 2 failing once with a 503 — plus a `log` of every URL requested. The three crawl tests then assert: it stops after the first empty page (4 requests, not 50); it survives the flaky 503 and still returns both books; and — by injecting a `sleep` that just *records* its argument — that there were exactly 3 politeness gaps of 250ms for 4 requests. Even the pacing is tested, instantly, because sleep is injected.

## 7. Words you learned (glossary)

- **Web scraper**: a program extracting data from pages meant for humans.
- **Crawl**: visiting a sequence of pages automatically.
- **HTML / tag / attribute**: web markup; `<h3>...</h3>`; `class="price"`.
- **HTTP / status code**: the web protocol; 200 OK, 404 not found, 503 overloaded.
- **fetch / res.text() / res.ok**: request a URL; read body as string; "status was 200-299".
- **Promise / async / await**: a future value, and the syntax for waiting on it.
- **setTimeout / sleep**: run code after N ms; a Promise-based pause built from it.
- **Regex / capture group / lazy / word boundary**: text pattern; the `(...)` you extract; `*?` = match as little as possible; `\b` = edge of a word.
- **matchAll**: loop over every regex match in a string.
- **HTML entity**: escaped character like `&amp;` for `&`.
- **Integer cents**: storing money as whole cents to dodge decimal float errors.
- **Transient vs permanent failure**: retry-able hiccup (503) vs hard fact (404).
- **Retry / backoff**: re-running a failed action; growing pauses between attempts.
- **Rate limiting / politeness delay**: deliberately pacing your requests.
- **IP ban**: a server blocking your network address.
- **Sequential vs parallel**: one at a time vs all at once.
- **Dependency injection**: passing `fetch`/`sleep` in as parameters so tests can fake them.
- **Fixture**: hand-written sample data used by tests.
- **Pure function**: inputs → output, no side effects; `parseCatalogPage` is one.
- **Boundary**: the one place raw outside data gets validated/cleaned.
- **Optional chaining (`?.`)**: read a property without crashing on `null`.

## 8. Experiments to try on the plane (no internet needed)

Real scraping needs internet (and this catalog site is fictional anyway) — but the tests fake the entire site, so **everything below is fully offline**. Run `node --test .` in the project folder after each change.

1. **Scrape a new field.** Add `<em class="author">Someone</em>` to the `pageHtml` fixture in the test file, then extend `parseCatalogPage` to extract `author` (pattern: like the title, but for `<em>` with class `author`). Update the first test's expected objects. Expected: green tests with authors included.
2. **Prove the mega-regex would have failed.** Paste the original's regex into a scratch file with the test's fixture HTML (which uses `class="item book"` and a newline before the price span) and run it with `.exec`. Expected: zero matches — the exact silent-emptiness failure the README describes.
3. **Break politeness, watch the test object.** In `scrapeCatalog`, delete the `if (page > 1) await sleep(delayMs);` line. Expected: the "paces itself" test fails (it expected `[250, 250, 250]`, got `[]`). Restore it.
4. **Make the flaky page flakier.** In `fakeSite`, change `let flakyFailures = 1;` to `3`. Expected: the retry test now *fails* — 3 attempts aren't enough for 3 consecutive 503s. Fix it by passing a bigger attempts value through (you'll need to let `scrapeCatalog` forward an `attempts` option into `fetchPage`). Both states teach you where the retry budget lives.
5. **Add one more entity.** Make `decodeEntities` also handle `&nbsp;` (non-breaking space → regular space), and extend its test. Expected: one-line change in the map, one-line change in the regex alternation, green tests.
