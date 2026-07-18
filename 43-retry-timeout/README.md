# 43 — Retry with timeout & backoff

**Lesson: production-grade "call the flaky thing" — backoff, error classification,
deadlines — from two 15-line composable tools.**

## Run it

```
node 43-retry-timeout/original.js
node --test 43-retry-timeout/
```

## What's wrong with the original?

The nested try/catch retry commits all four classic retry sins (the file demos each):

1. **Zero delay between attempts.** A struggling server gets hit three times in
   150ms — retries that make the outage *worse*. Well-behaved clients back off
   exponentially: 100ms, 200ms, 400ms... giving the server room to recover.
2. **It retries everything** — including a 404, which means "this customer doesn't
   exist." Asking again won't create the customer. Errors split into *transient*
   (503, timeout — retry) and *permanent* (404, validation — fail fast), and a
   retry loop that can't tell them apart wastes time and spams logs.
3. **No timeout.** If the API *hangs* rather than failing, `await` waits forever
   and no retry logic ever runs. Hangs are more common than beginners expect —
   and worse than errors, because nothing fires.
4. **Attempt count is encoded in the code's *shape*** — three attempts = three
   nesting levels. Five attempts? Two more pyramids. A number should be a number.

## What changed in the refactor

- **`withTimeout(promise, ms)` = `Promise.race` between the work and a deadline.**
  Whichever settles first wins. Two details worth stealing: the timer is cleared in
  `finally` (don't leak timers), and the rejection is a typed `TimeoutError`
  (project 30) so `shouldRetry` can classify it. Honest comment in the code: the
  losing operation isn't *cancelled* — JS can't force that — but nobody waits on it.
- **`retry(fn, options)`**: attempts is a *number*, backoff is
  `baseDelayMs * 2 ** (attempt - 1)`, and **`shouldRetry` is an injectable policy** —
  the transient/permanent split belongs to the caller, who knows their API. The
  404 test asserts *exactly one* call.
- **`sleep` is injectable**, so tests verify delays by *recording* them
  (`[100, 200, 400]`) and run in milliseconds. Compare project 28's mock-timers
  approach — two solutions to the same "testing time" problem; know both.
- **Compose them**: `retry(() => withTimeout(call(), 2000))`. The last test walks
  the full story — hang → timeout → retry → success. Neither tool knows the other
  exists; that's what made them composable.

## Key takeaway

Every network call in production eventually grows this exact harness. Backoff so
you don't pile onto a struggling service; classify errors so you don't retry facts;
deadline everything so hangs become errors. And keep the tools separate — small
single-purpose async helpers compose into policies; monoliths don't.
