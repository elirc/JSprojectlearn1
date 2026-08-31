# 🏋️ Practice: Link Checker

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. More junk hrefs (warm-up)

`extractLinks` already skips `mailto:` and `#...` hrefs, but real pages also contain `href="javascript:void(0)"` (fake buttons) and `href="tel:+15551234"` (phone links). Right now those sail through — `new URL('javascript:void(0)')` is *valid* — and end up HEAD-requested as "external links". Extend the skip list and add a test: a page with a `javascript:`, a `tel:`, a `mailto:`, and a real `/about` link yields exactly `['https://site.test/about']`.

What it practices: filtering junk at the extraction boundary, before it can waste requests downstream.
Hint: two more `startsWith` checks in the existing `if` — and note *why* the URL constructor won't catch these for you.

### ⭐⭐ 2. When a crawl task explodes (core)

`crawlQueue` has tests for growth and for the concurrency limit, but none for *failure*. Write a test: seeds `[1, 2]`, limit 1, and a `processOne` that records each item then throws `Error('boom on 2')` for item 2. Assert with `assert.rejects` that the whole queue rejects with `/boom on 2/`, and that items `[1, 2]` were both processed before the failure.

What it practices: testing the rejection path of a hand-built async coordinator.
Hint: `limit: 1` makes the order deterministic — item 1 fully finishes before item 2 starts.

### ⭐⭐ 3. Count the externals (core)

A report that says "0 dead links" is more trustworthy when it also says how many links it *checked*. Add a `checkedExternal` field to `checkSite`'s result: the number of external URLs that went through phase 2. For the test-file's fake site the value is `3` (`ext.test/ok`, `ext.test/dead`, and `gone.test/`). Extend the main `checkSite` test to assert it.

What it practices: threading one new fact out of a two-phase pipeline without disturbing either phase.
Hint: the number already exists in a variable — you only have to return it.

### ⭐⭐ 4. Fragments are not different pages (core)

On a real site, `/about` and `/about#hours` are the same page — but to the `visited` set they're different strings, so the page gets crawled twice. Fix `extractLinks` to strip the fragment when resolving: a page linking to both `/about` and `/about#hours` should yield `['https://site.test/about', 'https://site.test/about']` (two entries, identical — the visited set then collapses them). Pure `#top`-style hrefs must still be skipped entirely.

What it practices: URL normalization — making the visited set's string keys match the site's real page identity.
Hint: the `URL` object is mutable — set its `hash` to `''` before reading `.href`.

### ⭐⭐⭐ 5. Servers that refuse HEAD (challenge)

Some servers answer `HEAD` with `405 Method Not Allowed` even though the page is fine — so the checker reports a live link as dead. Fix phase 2: when the `HEAD` response has status `405`, retry the same URL once with a plain `GET` and report *that* result. Test with a fake where `ext.test/ok` returns 405 to HEAD but 200 to GET: the link must NOT appear in `dead`, and the request log for that URL must be exactly `['HEAD', 'GET']`.

What it practices: a per-request fallback inside pool tasks, verified through a method-recording fake.
Hint: change `const res` to `let res`; the fake needs to branch on `opts.method`.

## Solutions

### 1. More junk hrefs

```js
if (
  href.startsWith('mailto:') ||
  href.startsWith('tel:') ||
  href.startsWith('javascript:') ||
  href.startsWith('#')
) continue;
```

```js
test('extractLinks skips javascript: and tel: pseudo-links', () => {
  const html = `<a href="javascript:void(0)">Menu</a> <a href="tel:+15551234">Call</a>
    <a href="mailto:x@y.z">Mail</a> <a href="/about">About</a>`;
  assert.deepEqual(extractLinks(html, 'https://site.test/'), ['https://site.test/about']);
});
```

WHY: the `try/catch` around `new URL` only rejects *malformed* hrefs — `javascript:` and `tel:` are perfectly valid URLs with useless origins, so they'd flow into phase 2 and get HEAD requests fired at nonsense targets. Filtering at the extraction boundary is the same "clean data enters the pipeline once" rule the scraper used; everything downstream stays ignorant of the mess.

### 2. When a crawl task explodes

```js
test('crawlQueue rejects when a task fails, after finishing prior work', async () => {
  const seen = [];
  await assert.rejects(
    () => crawlQueue([1, 2], async (n) => {
      seen.push(n);
      if (n === 2) throw new Error('boom on 2');
      return [];
    }, { limit: 1 }),
    /boom on 2/,
  );
  assert.deepEqual(seen, [1, 2]);
});
```

WHY: the pump's rejection path (`failed = true; reject(err)`) is real code guarding a real promise, and untested coordination code is where async bugs hide. Note the design echo: `crawlQueue` is fail-fast — which is exactly why `checkSite` wraps each fetch in its own `try/catch`, converting failures to *results* before they can reach the pump. This test documents that division of labor.

### 3. Count the externals

```js
return { pagesCrawled, dead, checkedExternal: external.length };
```

```js
// in the main checkSite test:
const { pagesCrawled, dead, checkedExternal } = await checkSite('https://site.test/', {
  fetchFn: fakeFetch(),
  limit: 3,
});
assert.equal(checkedExternal, 3); // ext/ok, ext/dead, gone.test — all were checked
```

WHY: `external` is already computed to feed phase 2 — the report just never mentioned it. "Checked 312 links, 3 dead" and "0 dead" are different claims: the count turns silence into evidence, the same instinct as `linkedFrom` turning "dead link" into "dead link *found on page X*". One-line features like this are the payoff of a result object over a bare array.

### 4. Fragments are not different pages

```js
try {
  const url = new URL(href, baseUrl); // resolves relative links
  url.hash = ''; // /about and /about#hours are the SAME page
  links.push(url.href);
} catch {
  // malformed href — skip it; the page author's problem, not a crash
}
```

```js
test('fragments are stripped so #-variants collapse in the visited set', () => {
  const html = `<a href="/about">A</a> <a href="/about#hours">B</a> <a href="#top">C</a>`;
  assert.deepEqual(extractLinks(html, 'https://site.test/'),
    ['https://site.test/about', 'https://site.test/about']);
});
```

WHY: the `visited` set is what makes cycles finite, but a set can only dedupe *identical strings* — and the fragment is client-side only, so the server sees one page where the set saw two. Normalizing at extraction time fixes crawl (no double fetch), `linkedFrom` (one canonical key), and the dead report all at once. `#top` stays skipped by the earlier guard, so same-page anchors never even reach the queue.

### 5. Servers that refuse HEAD

```js
external.map((url) => async () => {
  try {
    let res = await fetchFn(url, { method: 'HEAD' }); // status only, no body
    if (res.status === 405) res = await fetchFn(url); // server refuses HEAD: retry as GET
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, status: 0, error: err.message };
  }
}),
```

```js
test('405 on HEAD falls back to GET instead of reporting a false dead link', async () => {
  const log = [];
  const fetchFn = async (url, opts = {}) => {
    const method = opts.method ?? 'GET';
    log.push({ url, method });
    if (url === 'https://ext.test/ok' && method === 'HEAD') {
      return { ok: false, status: 405, text: async () => '' };
    }
    // ...same fake site as the existing tests otherwise...
    if (url in SITE) return { ok: true, status: 200, text: async () => SITE[url] };
    if (url.startsWith('https://gone.test')) throw new Error('DNS lookup failed');
    if (url in EXTERNAL) { const s = EXTERNAL[url]; return { ok: s < 400, status: s, text: async () => '' }; }
    return { ok: false, status: 404, text: async () => '' };
  };
  const { dead } = await checkSite('https://site.test/', { fetchFn });
  assert.ok(!dead.some((d) => d.url === 'https://ext.test/ok'));
  const methods = log.filter((l) => l.url === 'https://ext.test/ok').map((l) => l.method);
  assert.deepEqual(methods, ['HEAD', 'GET']);
});
```

WHY: a checker's one job is telling the truth, and a false "dead" report erodes trust faster than a missed one — 405 doesn't mean the page is gone, it means the *question* was refused, so you ask it differently. The fallback lives entirely inside one pool task: the pump, the pool, and the visited set never know it happened, which is what "each phase testable without the other" buys you. The method-recording fake proves both halves — the fallback fired, and it fired exactly once. (Verified with node: the link leaves the dead list and the log shows `['HEAD', 'GET']`.)
