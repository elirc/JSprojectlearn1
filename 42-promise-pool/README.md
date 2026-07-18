# 42 — Promise pool (concurrency limit)

**Lesson: the third option between `await`-in-a-loop and `Promise.all` — and how
async concurrency actually works in a single-threaded language.**

## Run it

```
node 42-promise-pool/original.js     (watch the timings)
node --test 42-promise-pool/
```

## What's wrong with the original?

Both "obvious" approaches, wrong in opposite directions — run the file and read the
two timers:

1. **Sequential** (`await` inside a `for` loop): each request waits for the previous
   one. 20 × 100ms ≈ 2 seconds for work that has no ordering dependency at all.
   This is the classic accidental-serialization mistake — an `await` in a loop is a
   *queue*, whether you meant one or not.
2. **Unbounded** (`Promise.all(ids.map(...))`): all 20 fly at once. Fast — and at
   2,000 profiles it's a self-inflicted DoS: rate limits (429s), dropped
   connections, exhausted sockets. Real APIs *will* punish this.

What you actually want — "at most 5 in flight" — neither can express.

## What changed in the refactor

- **The worker-pool pattern, ~15 lines.** Start `limit` workers; each grabs the
  next unclaimed index, awaits that task, repeats. Concurrency is capped by
  construction — there are only `limit` workers to *do* anything.
- **Why `nextIndex++` is safe without locks** (the comment in the code): JavaScript
  is single-threaded — workers only interleave at `await` points, so the
  read-and-increment can never be split by another worker. Understanding *that* is
  understanding async JS: concurrency happens *between* awaits, never inside a
  synchronous run.
- **`results[index] = await ...`** writes each answer into the task's original
  slot, so results stay in *task* order even though completion order scrambles
  (there's a test with a slow task 0 proving it).
- **The tests instrument concurrency itself**: tasks that count how many of
  themselves are running and record the peak. Assert `peak <= limit` — testing the
  actual promise (pun intended) of the abstraction, not just the return values.

## Key takeaway

See `await` in a loop? Ask: *dependent or independent?* Dependent → the loop is
right. Independent → you're serializing by accident; but before reaching for
`Promise.all`, ask what the other end can take. Real systems need the knob, and the
knob is a worker pool.
