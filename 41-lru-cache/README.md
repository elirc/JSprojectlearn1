# 41 — LRU cache

**Lesson: know your standard library's superpowers — Map's insertion order makes LRU
nearly free — and prefer one structure over two structures + a sync rule.**

## Run it

```
node 41-lru-cache/original.js
node --test 41-lru-cache/
```

## What's wrong with the original?

An LRU (least-recently-used) cache keeps the N hottest items — it's how browser
caches, database buffer pools, and `memoize`-with-a-cap (project 27's growth path)
all work. The original has one conceptual bug and one structural disease:

1. **`get` doesn't refresh recency.** The *whole point* of LRU is that items you
   keep *using* survive; this version only tracks recently *added*. Run it: the hot
   item `"a"` — read moments earlier — is the first thing evicted. LRU in name only.
2. **Two structures, one implicit sync rule, zero enforcement.** The `cache` object
   holds values; the `order` array tracks age; every code path must update both,
   consistently, forever. Update an existing key and it enters `order` **twice**;
   the next eviction `shift()`s the stale duplicate and deletes a key that's still
   listed as alive. The two structures now disagree, and every later operation
   compounds the lie. (Also: fixing it with `indexOf`/`splice` would be O(n) per
   operation.)

## What changed in the refactor

- **One structure: a `Map`, exploiting a guarantee beginners rarely know — Maps
  iterate in insertion order.** Delete + re-insert moves a key to the end. So the
  least-recently-used key is simply `keys().next().value`, "touching" an entry is
  two O(1) calls, and there is no second structure to fall out of sync — the
  original's disagreement bug is *unrepresentable* (project 40's principle, applied
  to a data structure).
- **`get` refreshes; `has` deliberately doesn't** — peeking shouldn't change an
  entry's fate. That's an API design decision, documented and tested. Small
  interfaces are where "easy to change" lives: every behavioral choice you nail
  down in a test is a bug someone can't reintroduce.
- **`set` on an existing key deletes first** — one line that fixes the duplicate
  bug and gives update-refreshes-recency semantics simultaneously.
- Encapsulation (project 29) makes the invariants enforceable: nobody can touch
  `#entries` except through doors that maintain order and capacity.

## Key takeaway

Before building compound structures with sync rules ("an object for X plus an array
for Y"), check whether one built-in already provides the property you're tracking —
Map ordering, Set uniqueness, array index order. The best sync rule is the one that
doesn't exist.
