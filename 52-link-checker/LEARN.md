# 📘 Learning Guide: Link Checker

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that finds broken links on a website. You give it a starting page, like `https://oursite.example.test/`. It downloads that page, finds every link on it, follows the links that point to other pages on the *same* site, and keeps going until it has seen the whole site. At the end it prints a report like:

```
{
  pagesCrawled: 3,
  dead: [
    { url: 'https://site.test/missing', status: 404, foundOn: 'https://site.test/' },
    { url: 'https://gone.test/', status: 0, error: 'DNS lookup failed', foundOn: '...' }
  ]
}
```

"Dead" means the link goes nowhere: the page is missing, or the whole server can't be reached. A program that walks a site like this is called a **crawler** (it "crawls" from page to page like a spider on a web).

## 2. Concepts you need first

**HTML and links.** Web pages are written in HTML, a text format made of tags. A link looks like `<a href="/about">About</a>`. The `href` part holds the address the link points to. Our program hunts for `href="..."` in the page text.

**URLs.** A URL is a web address, like `https://site.test/blog/post.html`. It has parts: `https://site.test` is the **origin** (which server), and `/blog/post.html` is the path (which page on that server). A **relative** link like `href="/about"` has no origin — the browser fills it in from the current page. JavaScript can do the same:

```js
const full = new URL("/about", "https://site.test/blog/");
console.log(full.href);    // "https://site.test/about"
console.log(full.origin);  // "https://site.test"
```

**HTTP, fetch, and status codes.** HTTP is the language browsers and servers speak. `fetch(url)` asks a server for a page. The server answers with a **status code**: 200 means "here you go", 404 means "not found", anything 400+ means trouble. A **GET** request asks for the full page. A **HEAD** request asks "does this exist?" and gets only the status, no page body — cheaper when you don't need the content.

**Promises.** A Promise is a placeholder for a value that isn't ready yet (like a receipt you trade in later). `fetch` returns one, because the network takes time.

```js
const p = new Promise((resolve) => setTimeout(() => resolve("done"), 100));
p.then((v) => console.log(v)); // prints "done" after 100ms
```

**async / await.** `await` pauses an `async` function until a Promise finishes, so async code reads like normal code:

```js
async function demo() {
  const res = await fetch("https://example.test/");
  console.log(res.status); // e.g. 200
}
```

**Recursion.** A function that calls itself. Handy for "do this, then do the same for everything you found" — but if nothing stops it, it never ends. That's the original file's core bug.

**Set.** A collection that stores each value only once. Perfect for "have I seen this before?":

```js
const seen = new Set();
seen.add("a"); seen.add("a");
console.log(seen.size);       // 1
console.log(seen.has("a"));   // true
```

**Map.** Like an object, but any value can be a key. We use it to remember which page each link was found on:

```js
const m = new Map();
m.set("https://x.test/", "found-on-home");
console.log(m.get("https://x.test/")); // "found-on-home"
```

**Regular expressions (regex).** A mini-language for finding patterns in text. `/href="([^"]+)"/g` means: find `href="`, then capture everything up to the next quote. `matchAll` gives every match plus its captured groups:

```js
for (const [, href] of '<a href="/a"> <a href="/b">'.matchAll(/href="([^"]+)"/g)) {
  console.log(href); // "/a" then "/b"
}
```

**Concurrency and queues.** Concurrency = doing several things at once. Firing 200 downloads at once can overwhelm a server, so we use a **queue** (a waiting line): tasks wait, and only, say, 5 run at a time. That "at most 5" number is the **concurrency limit**.

**Promise.all vs allSettled thinking.** `Promise.all([...])` waits for many Promises, but if *one* fails, the whole thing fails. `Promise.allSettled` waits for all and reports each success or failure separately. The refactor uses the *idea* of allSettled: every check catches its own error, so one dead link can't kill the report.

**Modules (import/export).** Splitting code into files. `export` marks what a file shares; `import` pulls it into another file. The refactor imports a helper from project 42.

## 3. Walking through the original code

The original is one recursive function plus a global array.

```js
var deadLinks = [];

async function crawl(url) {
  var res = await fetch(url);
  var html = await res.text();
  var links = html.match(/href="([^"]+)"/g) || [];
```

Download the page, get its text, and pull out every `href="..."`. The `|| []` means "if no matches, use an empty list" (because `match` returns `null` when it finds nothing).

```js
  await Promise.all(
    links.map(async function (attr) {
      var link = attr.slice(6, -1);
```

For every link found, start an async task — all at once, no limit. `attr.slice(6, -1)` chops off `href="` (6 characters) from the front and the closing quote from the back, leaving just the URL.

```js
      var r = await fetch(link);
      if (r.status >= 400) deadLinks.push({ page: url, link: link, status: r.status });
      await crawl(link);
```

Fetch the link; if the status is 400 or higher, record it as dead. Then — and this is the trap — recursively crawl *that* page too, whatever site it belongs to.

```js
crawl("https://oursite.example.test/").then(function () {
  console.log(deadLinks);
});
```

Start at the home page and print the report when everything (in theory) finishes.

## 4. What's wrong with it (in beginner terms)

**1. No memory of where it's been.** Page A links to B. B's nav bar links back to A. The crawler goes A → B → A → B → ... forever. Every real website has this shape, so this program *cannot finish on any real site*. You run it, it hangs, your terminal fills with network activity, and the report never prints.

**2. Unlimited simultaneous requests.** A page with 200 links fires 200 downloads at once, and each of those pages fires its own 200. Within seconds you have thousands of requests hammering your own server. Real story: your site slows to a crawl for actual visitors, and your hosting provider emails asking why you attacked yourself.

**3. It crawls other people's sites.** The code doesn't check whether a link stays on our site. One link to wikipedia.org and the crawler starts downloading Wikipedia and checking *their* millions of links. Not our job, never finishes.

**4. One failure kills the whole report.** `Promise.all` fails if any one Promise fails. Networks hiccup constantly, so on a big site something *will* time out — and instead of one row in the report, the entire program dies with an error. The absurd part: the program's whole job is *finding* failures, yet it treats a failure as fatal. Hours of crawling, zero output.

## 5. Try it yourself first!

Try fixing `original.js` before reading the solution. Hints, vague to specific:

1. There are two different jobs hiding in one function: exploring our own pages, and checking links. Can you separate them?
2. How would *you* avoid revisiting a page? What data structure answers "have I seen this?" instantly?
3. Cycles: add every URL to a `Set` before fetching it, and skip any URL already in the set.
4. Staying on our site: compare `new URL(link).origin` with the starting page's origin. Same origin → crawl it. Different → only check its status.
5. Failures: wrap each individual fetch in its own `try/catch`. A failure becomes a row in the results, and the program keeps going.
6. The concurrency limit is the hardest part, because crawling *adds* work while running. Keep a counter of running tasks and a queue array. When a task finishes, it adds its discoveries to the queue and starts more tasks — but only up to the limit. You're done when the queue is empty **and** the counter is zero.

## 6. Understanding the refactored solution

The refactor (`refactored/checker.js`) splits the job into three exported pieces.

**`extractLinks(html, baseUrl)`** finds every `href` and turns it into a full URL with `new URL(href, baseUrl)` — so `/about` becomes `https://site.test/about`. It skips `mailto:` links (email addresses) and `#` links (jumps within the same page), and a malformed URL is skipped rather than crashing.

**`crawlQueue(seeds, processOne, { limit })`** is the engine, using the **pump pattern**. One function, `pump`, tops up the pool: while fewer than `limit` tasks run and the queue has items, take an item, bump `active`, and call `processOne(item)`. When a task finishes, its discoveries are pushed onto the queue and `pump()` runs again. The finish line is the subtle bit:

```js
if (queue.length === 0 && active === 0) return resolve();
```

An empty queue alone is *not* proof of being done — a still-running task might push more work. Done means empty queue **and** nothing running.

**`checkSite(rootUrl, options)`** runs two phases. Phase 1 crawls our own pages: a `visited` Set makes cycles finite (each URL fetched exactly once), and a `linkedFrom` Map remembers the first page that linked to each URL — that's how the report can say "found on page X". Fetch failures and bad statuses become entries in `dead`, never crashes. Only same-origin links join the crawl queue. Phase 2 checks external links: now the work list is *fixed*, so it reuses project 42's simpler `runWithLimit` pool, sends cheap `HEAD` requests, and each check catches its own error and returns a result object either way.

One more trick: `checkSite` accepts `fetchFn` as an option, defaulting to the real `fetch`. This is called **dependency injection** — the tests hand in a fake fetch instead, so no real network is needed.

**The tests** (`checker.test.js`) use Node's built-in test runner (`node --test`). Each `test(name, fn)` runs a check, and `assert.equal` / `assert.deepEqual` fail loudly if a value isn't what's expected. The tests build a tiny fake website as a plain object — two pages that link to each other (a deliberate cycle), one missing page, one dead external link, one URL that throws like a DNS failure (DNS = the internet's address book; a DNS failure means the server name couldn't even be looked up). `fakeFetch` also logs every request, letting one test prove external links get exactly one `HEAD` request and no crawl. Another test proves the concurrency limit by counting in-flight tasks and checking the peak never passes 3.

## 7. Words you learned (glossary)

- **Crawler** — a program that follows links from page to page.
- **HTML** — the text format web pages are written in.
- **href** — the part of a link tag holding the destination address.
- **URL / origin** — a web address / its server part (`https://site.test`).
- **Relative link** — a link missing its origin, resolved against the current page.
- **HTTP** — the request/response language of the web.
- **Status code** — the server's numeric answer (200 = OK, 404 = not found).
- **GET / HEAD** — "give me the page" / "just tell me its status".
- **fetch** — the built-in function for making HTTP requests.
- **Promise** — a placeholder for a value that arrives later.
- **async / await** — syntax that pauses a function until a Promise settles.
- **Recursion** — a function calling itself.
- **Set** — a collection where each value appears once; instant "seen it?" checks.
- **Map** — a key → value store.
- **Regex** — a pattern language for searching text.
- **Concurrency limit** — the max number of tasks allowed to run at once.
- **Queue** — a waiting line of work items.
- **Pump pattern** — a function that refills the running pool each time a task finishes.
- **Promise.all / allSettled** — wait for many Promises; `all` dies on one failure, `allSettled` reports each outcome.
- **Dependency injection** — passing a function's tools in as parameters so tests can swap in fakes.
- **DNS** — the system that turns server names into network addresses.
- **Sentinel/cycle** — (cycle) a loop in links, like A → B → A.

## 8. Experiments to try on the plane (no internet needed)

The tests use a fake in-memory site, so **everything below works offline**. Only pointing `checkSite` at a real website needs internet. Run tests with `node --test 52-link-checker/` (needs project 42's folder present, since checker.js imports from it).

1. **Break the visited set.** In `checker.js`, comment out `visited.add(url);`. Run the tests. Expected: the cycle test hangs or fails — you've recreated the original's infinite loop, safely.
2. **Grow the fake site.** In `checker.test.js`, add a page `'https://site.test/contact'` linking back to `/`, and link to it from the home page HTML. Expected: the `pagesCrawled` assertion now fails with 4 vs 3 — update it to 4 and the tests pass again.
3. **Change the queue's limit.** In the "never exceeds the concurrency limit" test, change `{ limit: 3 }` to `{ limit: 1 }`. Expected: the test fails because `peak` is 1, not 3 — proving the limit really controls parallelism. Fix the assertion to match.
4. **Add a second dead internal page.** Add `<a href="/missing2">` to the `/about` page in `SITE`. Expected: `dead.length` becomes 4, and its `foundOn` is `https://site.test/about`.
5. **Watch the pump think.** Add `console.log('active:', active, 'queued:', queue.length)` at the top of `pump()` in `checker.js`, run the tests, and watch the pool fill and drain. Remove it after.
