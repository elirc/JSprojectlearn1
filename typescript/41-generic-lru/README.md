# TS 41 — Generic LRU cache

**Lesson: generic *classes* — js#41's container, where each instance declares
its contents and `V | undefined` keeps the miss honest.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The runtime is js#41's, correct — the `Map<any, any>` types forgot
everything the JS version's *discipline* remembered. A string key slips
into the numeric-id cache (`'7'` vs `7` — two different entries, the
exact key-type confusion js#41 chose Maps to prevent), a string value
joins the User values, and `get(): any` hides both the wrong-type reads
(`'seven'.name.toUpperCase()` — crash) *and* the miss case
(`get(999).name` — crash). Containers are infrastructure: `any` inside
one leaks into every consumer (ts#19's blast-radius argument, now for a
class).

## What changed in the refactor

- **`LruCache<K, V>`** — ts#16's move applied to a class: type parameters
  declared once at the class, used by every method. Each *instance* binds
  its own K and V (`LruCache<number, User>` vs `LruCache<string,
  string>`), so wrong keys, wrong values, and cross-instance assignment
  are all type tests. The body is byte-for-byte js#41.
- **`get(): V | undefined`** — the miss is *in the type* (ts#05), so
  `get(999).name` doesn't compile; callers narrow. The honest signature
  is what separates a typed container from a typed-looking one.
- **Two contained assertions**, each annotated: the `!` after a `has()`
  check (guarded, adjacent, auditable) and the `as K` on the
  first-key-eviction (Map's iterator types can't know the map is
  non-empty there). ts#20's contained-unsafety pattern: sealed inside,
  checked at the boundary.
- The upgrade to js#27's memoize writes itself now: `memoize` with an
  `LruCache<string, R>` instead of an unbounded Map — typed, capped,
  composable.

## Key takeaway

Any container you write — caches, pools, registries, queues — should be
generic over what it holds: `Class<K, V>` with honest maybe-types on the
reads. One implementation, per-instance guarantees; that's the whole
promise of generics, and containers are where it pays daily.
