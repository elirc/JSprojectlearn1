# 51 — Web scraper

**Lesson: scraping is three separate problems — polite fetching, resilient
retries, and parsing — and the original welds them into one fragile loop.**

## Run it

```
node --test 51-web-scraper/
```

(The catalog site is fictional; the tests run the full crawl against an
in-memory fake site, including a page that 503s once.)

## What's wrong with the original?

1. **Zero delay between requests.** Fifty requests fired as fast as the
   network allows, at somebody else's server. That's how you get IP-banned.
2. **No retry, no status check.** One flaky 503 out of 50 requests kills a
   ten-minute run at page 37 — and takes 36 pages of good data down with it.
3. **One mega-regex, inline.** It silently skips books when the markup
   varies (extra class, different attribute order), and when the site tweaks
   its template it matches *nothing* — you scrape 50 pages of emptiness
   without noticing.
4. **Raw values out**: `&amp;` stays `&amp;`, prices stay strings. Every
   consumer re-cleans the data, differently.
5. **No early stop** — a 12-page catalog still gets 50 requests.

## What changed in the refactor

- **`parseCatalogPage` is pure** (HTML string → records) and honest about
  its limits: regex can extract from a template *you know the shape of*,
  but cannot parse arbitrary nested HTML — project 34's CSV lesson, same
  root cause. One small anchored pattern per field beats a mega-regex, and
  malformed blocks are *skipped*, never mis-paired.
- **Clean data at the boundary**: entities decoded, prices converted to
  integer cents (project 32). Parse once, so nobody downstream has to.
- **`fetchPage` imports project 43's `retry`** — 5xx is weather (retry with
  backoff), 404 is a fact (`shouldRetry` says stop). Flaky-network handling
  was already built; a scraper is just its biggest customer.
- **The crawl is sequential on purpose** with a politeness `sleep` between
  requests — when it's someone else's server, polite beats fast. It stops
  at the first empty page. Both `fetchFn` and `sleep` are injected, so the
  tests crawl a fake site instantly, including the flaky page.

## Key takeaway

A scraper's loop shape *is* its ethics: pacing and backoff are what
separate "client" from "attack". And keep parsing pure — the fetch layer
hands over strings, the parse layer hands over clean typed records, and
each is testable without the other.
