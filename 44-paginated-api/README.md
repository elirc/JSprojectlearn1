# 44 — Paginated API client

**Lesson: async generators — write the cursor loop once, stream items lazily, and
stop fetching the moment you've found what you need.**

## Run it

```
node 44-paginated-api/original.js
node --test 44-paginated-api/
```

## What's wrong with the original?

1. **`fetchAllUsers` is the only tool, so every question costs everything.**
   "Find user42" — who lives on page 2 — fetches all 10 pages, holds all 250 users
   in memory, then scans. Against a real API that's 8 wasted requests; against a
   100k-item collection it's *all* of them, every time, for any question.
2. **Fetch-everything can't stop early *by construction*** — the loop finishes
   before the caller sees a single item. The waste isn't a missing optimization;
   it's baked into the shape "return an array".
3. **Every caller re-implements the while/cursor loop.** Grep any codebase for
   `nextCursor` and count the hand-rolled copies, each with its own off-by-one on
   the last page.

## What changed in the refactor

- **`paginate(getPage)` is an `async function*`** — the two superpowers combined:
  `await` (it fetches) and `yield` (it hands out items one at a time). The cursor
  loop exists in exactly one place. Consumers write `for await (const item of
  paginate(getPage))` and never see a cursor again.
- **Laziness is the payoff** (project 22's lesson, now with I/O): pages are fetched
  only as the consumer keeps asking. `break` out of the loop → the generator just
  stops → **no further requests happen**. The test proves it with a request-counting
  fake API: finding user42 costs exactly 2 requests where the original spent 10.
  Nobody optimized anything — early exit *fell out of the shape*.
- **`findFirst` and `collectAll` are one-liners on the stream.** Fetching everything
  still exists — but now it's an explicit choice with a name, not the only door.
- **The fake API instruments requests** — like project 42 counting concurrency,
  the test measures the *behavioral promise* (how many fetches), not just the
  returned values. When an abstraction's selling point is efficiency, test the
  efficiency.

## Key takeaway

When data arrives in chunks but is consumed as items — pages, file lines, query
batches — an async generator is the right interface: loop logic written once,
consumers get a plain stream, and early termination is automatic. "Return an array"
commits you to fetching everything; "yield items" lets the consumer decide when
enough is enough.
