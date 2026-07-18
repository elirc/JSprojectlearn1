# 38 — Event emitter

**Lesson: the pub/sub pattern — decoupling "something happened" from "who cares" —
and the three classic emitter bugs.**

## Run it

```
node 38-event-emitter/original.js
node --test 38-event-emitter/
```

## What's wrong with the original?

Callback *fields* (`onComplete = fn`) look like events but break three ways:

1. **Assignment overwrites.** The second module's `onComplete =` silently deleted
   the first module's listener — no error, notifications just stop. The `onComplete2`
   slot is the tell-tale scar: someone hit this bug and "fixed" it by adding a slot.
   `onComplete3` is only a matter of time.
2. **No unsubscribe.** Once wired, wired forever — a memory leak and a
   stale-listener factory in any app with screens that come and go.
3. **One throwing listener kills the rest.** Run the original: "stats" never fires
   because "logger" threw first. Listener isolation isn't a nicety; modules that
   *shouldn't know about each other* (the whole point of events!) otherwise get to
   crash each other.

## What changed in the refactor

- **A `Map` of event → `Set` of listeners.** Any number of listeners; subscription
  can't overwrite. This tiny structure *is* the pattern under DOM
  `addEventListener`, Node's `EventEmitter`, and every framework event bus.
- **`on()` returns the unsubscribe function** — a closure capturing exactly the
  right listener, so callers keep no bookkeeping: `const off = emitter.on(...)`,
  later `off()`. (Same API shape modern libraries converged on.)
- **Isolated but not swallowed.** Each listener runs in its own try/catch, so
  everyone gets their delivery — then all failures are rethrown together as an
  **`AggregateError`**. Silently eating listener errors is the classic emitter sin
  (errors vanish for years); crashing mid-delivery is the original's sin. Collect
  then throw does neither.
- **Two subtle correctness details worth studying**: `emit` iterates a *copy* of the
  Set, so a listener unsubscribing mid-delivery can't skip its neighbors (tested);
  and `once` unsubscribes *before* invoking, so a throwing once-listener still
  detaches.

## Key takeaway

When module A must react to module B without B knowing A exists, that's pub/sub —
and it takes ~40 lines to own the pattern. Insist on the three-part contract in
anything event-shaped you build or adopt: many listeners, unsubscribe handles, and
per-listener error isolation *with* loud reporting.
