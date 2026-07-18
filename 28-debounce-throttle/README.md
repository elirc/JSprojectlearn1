# 28 — Debounce & throttle

**Lesson: closures + timers, and how to test time itself with mock timers.**

## Run it

```
node 28-debounce-throttle/original.js
node --test 28-debounce-throttle/
```

## What's wrong with the original?

The inline debounce *pattern* is right — the packaging is fatal:

1. **The timer lives in a module-level variable**, so the moment a second field wants
   debouncing, either they share the timer (the original's bug: typing a username
   silently cancels the pending search) or you multiply `timer2`, `timer3`... one
   loose global per usage, each a chance to grab the wrong one.
2. **The bug is invisible.** Nothing errors; a search just never happens, and only
   when a user touches both fields within 300ms. The original file demonstrates it —
   run it and watch the search vanish.
3. **Untestable except by waiting.** Real-time tests of timing code are slow *and*
   flaky — the two worst properties a test can have.

## What changed in the refactor

- **`debounce(fn, waitMs)` returns a new function with its own private `timeoutId`
  in a closure** — project 27's exact structure with a timer instead of a cache.
  Independence between debounced fields isn't something you remember to arrange;
  it's a *consequence of the shape*. The third test proves it.
- **Throttle rides along because the concepts are twins that beginners mix up:**
  debounce waits for *quiet* (fire after the burst ends — search boxes, autosave);
  throttle keeps a *drumbeat* (fire at most every N ms during the burst — scroll
  handlers). The doc comments give the use cases; pick by asking "do I want the end
  of the activity, or updates during it?"
- **`fn.apply(this, args)`** forwards both arguments *and* `this`, so the wrapper is
  transparent — it works on methods, not just standalone functions. Note the outer
  function is a `function`, not an arrow, precisely so it *has* a `this` to forward
  (arrows inherit; project 29 digs into `this`).
- **The tests use Node's mock timers** (`t.mock.timers`): `tick(299)` then `tick(1)`
  asserts the boundary *exactly*, tests run instantly, and nothing flakes. Whenever
  code contains `setTimeout` or `Date.now`, reach for fake time — never `sleep` in
  tests.

## Key takeaway

"A function plus a hidden variable" is the packaging for any rate-limiting behavior —
returning it from a factory gives every call site its own state without globals. And
time is a dependency like any other: mock it in tests, or your test suite becomes
slow roulette.
