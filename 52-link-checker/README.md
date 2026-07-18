# 52 — Link checker

**Lesson: crawling is a queue problem. A visited set makes it finite, a
concurrency limit makes it civil, and allSettled-thinking makes it finish.**

## Run it

```
node --test 52-link-checker/
```

(The tests run the full crawl against an in-memory fake site — complete
with a nav-bar cycle, a dead page, a dead external link, and a DNS failure.)

## What's wrong with the original?

1. **No visited set.** Page A links to B, B links back to A — every nav bar
   does — and the recursion crawls A → B → A → B forever. It cannot finish
   on *any* real site.
2. **Unbounded `Promise.all` recursion.** A page with 200 links fires 200
   simultaneous requests, each recursing into its own 200. That's a
   self-inflicted denial-of-service on your own site.
3. **External links get crawled, not checked.** It recurses into
   wikipedia.org and starts checking *their* links.
4. **One timeout anywhere rejects the whole tree of `Promise.all`s** and
   the entire report dies. A checker whose job is *finding* failures
   treats a failure as fatal — that's the design contradiction at its core.

## What changed in the refactor

- **Two phases, two shapes.** Crawling is a work list that *grows*
  (discovered pages add work) → `crawlQueue`. Checking is a work list
  that's *fixed* → project 42's `runWithLimit`, unchanged.
- **`crawlQueue` is the pump pattern**: one function tops the pool up to
  `limit` running tasks and is called again whenever a task finishes; done
  = queue empty *and* `active === 0` (an empty queue alone proves nothing —
  a running task may still push work). Project 42's worker loop can't do
  this without busy-waiting, which is why it's a new tool and not an import.
- **`visited` set** = cycles become finite. Each URL is fetched exactly once,
  and `linkedFrom` remembers *where* each link was found — a dead-link report
  without "found on page X" is homework, not a report.
- **Dead links are results, not errors.** Each check catches its own
  failure (`allSettled` semantics): a 404, a DNS failure, and a 200 are all
  just rows in the report. External links get `HEAD` — we want the status,
  not the body.

## Key takeaway

When work creates more work, "am I done?" is the hard part: the queue
being empty means nothing while a worker is still running. Track both.
This queue-plus-visited-set shape reappears in every graph traversal you'll
ever write — module bundlers, dependency resolvers, garbage collectors.
