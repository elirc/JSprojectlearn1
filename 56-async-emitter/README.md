# 56 — Async event emitter

**Lesson: project 38's emitter meets an async app — subscription lifecycles
via AbortSignal, events as awaitable promises, and rejections that can't
evaporate.**

## Run it

```
node 56-async-emitter/original.js
node --test 56-async-emitter/
```

## What's wrong with the original?

The original *uses* project 38's perfectly good emitter — and still fails
three ways, because the emitter's sync worldview doesn't cover async apps:

1. **Waiting for an event by polling.** "Send after we're connected"
   becomes a `while (!connected) sleep(100)` spin loop: wasteful, up to
   100ms late, and if the event never comes it polls *forever*.
2. **The forgotten unsubscribe = a leak.** Every reconnect wires up new
   handlers without tearing down the old ones. 38 returns unsubscribe
   handles, but a handle you must remember to keep, keep somewhere, and
   call at the right moment is a handle that gets forgotten. Old sessions
   keep processing messages (duplicates!) and stay alive in memory via
   their closures.
3. **Async listeners are fire-and-forget.** `emit()` returns before the
   async work runs (ordering bugs), and a rejection becomes an
   unhandled-rejection crash report at 2am pointing nowhere near the cause.

## What changed in the refactor

- **`on(event, fn, { signal })`** — an `AbortController` owns *all* of a
  session's subscriptions; `abort()` on disconnect detaches every one.
  You can't forget a handle you never had to keep. (This is the DOM's own
  `addEventListener` cleanup pattern — learn it once, use it everywhere.)
  The reconnect test runs 50 sessions and ends with exactly 1 listener.
- **`waitFor(event, { timeoutMs })`** — the next event as a promise:
  `await bus.waitFor('connected')`. No spin, no lag, cleans up its own
  listener, and with a timeout the event never coming is an *error*, not a
  hang (project 43's deadline lesson).
- **`emitAsync` awaits every listener** with `allSettled` semantics: every
  listener gets its delivery, then all failures surface together as one
  `AggregateError` — isolation without swallowing, same policy as 38, now
  covering rejections too.
- **The leak smoke-alarm**: passing `maxListeners` warns *once* per event,
  naming it. A climbing count is almost always a re-run setup path missing
  its teardown. The `warn` fn is injectable, so even the warning is tested.

## Key takeaway

Subscriptions are resources, like file handles — every `on` needs an owner
who guarantees the matching `off`. Tying groups of them to one
`AbortSignal` turns "remember N cleanups" into "abort one controller",
which is the difference between a leak and a lifecycle. And any emitter in
an async codebase must decide what a returned promise means — "await them
all, collect failures" is almost always the answer.
