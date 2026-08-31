# 76 — Rate limiter

**Lesson: if a function reads the clock itself, its behaviour over time is
untestable — inject time and "what happens after 1.5 seconds?" becomes an
assignment instead of a wait.**

## Run it

```
node 76-rate-limiter/original.js
node 76-rate-limiter/refactored/cli.js
node --test 76-rate-limiter/refactored/limiters.test.js
```

## What's wrong with the original?

"No more than 5 requests per second." It counts requests and resets the counter
when `Date.now()` ticks into a new second. It looks right, and it is wrong in
three separate ways:

1. **A fixed window leaks a double burst at the seam.** The counter resets on a
   boundary the calendar chose, not one the user agreed to. Run it: five requests
   at t=0.97s, five more at t=1.01s — **10 requests allowed in 55 milliseconds**
   with a limit of 5 per second. "5 per second" quietly means "up to 10 per
   second", which is exactly the burst a rate limiter exists to prevent.
2. **A second endpoint means a second copy, and the copy is broken.**
   `allowLogin` is `allow` pasted and edited, and the edit lost the counter reset.
   Anyone who hits the login limit once is blocked *until the process restarts*.
   Run it and watch `ada` get permanently locked out.
3. **Time and printing are both hardcoded inside the logic.** `Date.now()` is
   called in the middle of the decision, so testing "what happens after 1.5
   seconds?" means genuinely waiting 1.5 seconds — and the demo has to *busy-wait
   for a clock boundary* just to show the bug reproducibly. The verdict escapes as
   `console.log`, so there is no return value to assert on either.

## What changed in the refactor

- **The clock is a parameter.** `now = Date.now` by default; tests pass
  `() => clock` and set `clock = 1010`. The entire test suite covers an hour of
  elapsed time and finishes in milliseconds, with the same result every run. Same
  move as project 46's stopwatch: derive from a clock you were *given*.
- **`SlidingWindowLimiter` keeps timestamps, not a counter.** "How many in the
  last second?" is asked relative to *now*, so the window follows the user instead
  of snapping to a boundary. The boundary burst isn't patched — it can't be
  expressed. There's a test named after it.
- **`TokenBucket` is the cheap approximation**, and both ship because they make
  different trades: the log is exact but costs O(requests) memory; the bucket is
  O(1) per key, permits a deliberate burst up to `capacity`, and holds the
  long-run average to the refill rate. Tokens are computed lazily from elapsed
  time — no timers, nothing to drift.
- **Different limits are different *instances*, not different copies.**
  `new SlidingWindowLimiter({ limit: 2, ... })` for logins; the `allowLogin`
  divergence has nowhere to live.
- **`allow()` returns a boolean and `retryAfterMs()` returns a number**, so the
  caller decides between a log line, an HTTP 429, or a `Retry-After` header.

## Key takeaway

Anything a function reaches out and grabs — the clock, a random number, the
network, the filesystem — is a thing your tests can't control and your bugs can
hide behind. Pass it in as an argument with a sensible default, and the hard
questions ("at the boundary?", "after an hour idle?") turn into three lines of
setup.
