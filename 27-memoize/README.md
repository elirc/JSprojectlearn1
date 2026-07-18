# 27 — Memoize

**Lesson: closures — functions that carry private state — and higher-order functions
that add a behavior to *any* function.**

## Run it

```
node 27-memoize/original.js      (watch fib(32) take ~a second)
node --test 27-memoize/
```

## What's wrong with the original?

1. **One global cache, shared by every function.** `slowSquare(4)` caches `16` under
   the key `4`; `slowDouble(4)` finds `16` under the key `4` and happily returns the
   *wrong function's answer*. Globals don't just risk collisions — they guarantee them
   as soon as a second user shows up.
2. **The cache plumbing is pasted into each function's body**, welding *what it
   computes* to *how it's cached*. Every new expensive function needs the same three
   lines again (rule of three — this is the signal to extract).
3. A subtle trap the original narrowly dodges but the refactor tests for:
   `if (cache[n] != undefined)` treats a *cached `undefined` or missing* the same —
   and with `==`, a cached `null` too. Cache a legitimately falsy result and this
   pattern recomputes forever. `Map.has()` asks the right question: "is there an
   entry?", not "is the value truthy?".

## What changed in the refactor

- **`memoize(fn)` is a higher-order function**: it takes a function and returns a
  new function with caching added. The expensive function stays pure and oblivious.
  Ten expensive functions → ten one-word wraps, zero pasted plumbing.
- **The closure is the whole trick.** `cache` is a local variable of `memoize`, yet
  the returned function still reaches it long after `memoize` returned. That
  captured variable is *truly private* (nothing outside can touch it) and *per-wrap*
  (each call to `memoize` makes a new one) — which makes the original's shared-cache
  bug structurally impossible, not just avoided. This "function + hidden state"
  pattern is the same machinery behind project 28's debounce and project 29's
  account factory.
- **`keyOf` is injectable** (same move as project 06's `rng`): the default JSON key
  works for primitives; passing `user => user.id` handles objects sensibly. The
  default's limits are a documented decision, not a surprise.
- **`fib` memoized against itself** shows the payoff: the definition remains the
  textbook two-liner, but each subtree computes once — `fib(80)` is instant where
  naive recursion would take longer than the universe.

## Key takeaway

When behavior (caching, logging, retrying, timing) keeps getting pasted into
function bodies, lift it into a wrapper: a function that takes a function and
returns a better one. Closures give each wrapper private state for free — no
globals, no classes, no collisions.
