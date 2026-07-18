# 57 — Promise implementation from scratch

**Lesson: a promise is a settle-once state machine plus a microtask queue —
build one and async JavaScript stops being magic.**

## Run it

```
node 57-my-promise/original.js
node --test 57-my-promise/
```

## What's wrong with the original?

The "it's just a callback holder" version — it demos fine, which is exactly
why people ship it:

1. **No state.** Resolve twice and callbacks run twice. Real promises
   settle exactly once, forever.
2. **Callbacks run synchronously inside `resolve()`.** Real handlers always
   run on the microtask queue, so code after `.then()` runs before the
   handler and timing doesn't depend on when the promise settled.
3. **Rejection isn't implemented at all** — no `.catch`, no propagation.
4. **Subscribe after it settled → the callback never fires.** The bug you
   hit the moment a promise resolves fast (a cache hit, say).
5. **`then` returns nothing** — no chaining, no value pipeline.

## What changed in the refactor

- **A state machine** (project 40): `pending → fulfilled | rejected`, one
  way, one time. The `settled` guard in the constructor plus the
  reactions-array handoff make double-settle structurally impossible.
- **`then` never runs anything now.** It registers a *reaction* and returns
  a **new promise the reaction will settle later** — chaining is just
  promises settling promises. A throwing handler rejects the next link; a
  missing handler passes the result through, which is exactly how errors
  skip past `.then(fn)` blocks and land in the `.catch` at the end.
- **Everything is scheduled with `queueMicrotask`** — subscribe before or
  after settling, behavior is identical (the test proves the ordering).
- **Thenable adoption**: resolving with anything that has a callable
  `.then` adopts its eventual state instead of fulfilling with the object.
  This single rule is why `return anotherPromise` flattens instead of
  nesting — and the adoption guard handles thenables that misbehave and
  call back twice.
- The tests exercise MyPromise through real `await` — it's a thenable, so
  the platform's own machinery adopts it. Meta-proof that adoption works.

## Key takeaway

Every confusing promise behavior is one of these rules doing its job:
"why did my handler run later?" (microtask queue), "why did `.catch` catch
a throw from three `.then`s ago?" (pass-through holes), "why did returning
a promise not give me a promise-of-a-promise?" (thenable adoption).
Async/await compiles down to exactly this machine — you've now built the
thing you use every day.
