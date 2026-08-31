# CS 11 — generics-lru

**Lesson: `object` + casts is JavaScript with extra steps — generics (`LruCache<TKey, TValue>`)
make the compiler enforce what's in your containers.**

Mirror of js#41 (lru-cache) and ts#41 (generic-lru) — same cache, third language.
Skim those READMEs first if you've done them; the recency rules are identical.

## Run it

```
dotnet run csharp/11-generics-lru/original.cs
dotnet run --project csharp/11-generics-lru/refactored
dotnet run --project csharp/11-generics-lru/refactored -- test
```

## What's wrong with the original?

1. **Everything is `object`, so every read is a cast — and every cast is an
   unchecked promise.** `(string)cache.Get("visits")` compiles without a
   whisper even though `visits` holds an `int`; you find out at runtime, via
   `InvalidCastException`. Run it: the demo's final section is exactly that
   crash. In a statically-typed language we *volunteered* to give up static
   typing.
2. **Parallel lists with a hand-maintained sync rule.** `keys[i]` must always
   match `values[i]`, and every method must update both, in the same order,
   forever — js#41's two-structure disease, re-imported into C#. Nothing
   enforces the rule except vigilance.
3. **Boxing tax.** Storing an `int` as `object` wraps it in a heap allocation
   (boxing) and unwraps it on every read. Invisible in a demo; real money in a
   cache that exists *for* performance.
4. **Everything is O(n).** `List.IndexOf` scans; a cache lookup shouldn't.

## What changed in the refactor

- **`class LruCache<TKey, TValue> where TKey : notnull`** — one class, typed
  per use: `LruCache<string, int>`, `LruCache<int, string>`, anything. The
  wrong-cast bug is now *unrepresentable*: `visits.Set("home", "lots")` is a
  compile error, and `Get` returns a real `TValue` — no casts anywhere.
- **A `Dictionary<TKey, TValue>` owns the data; a `LinkedList<TKey>` owns the
  recency order** (front = stalest). Lookups are O(1) dictionary hits instead
  of list scans.
- **The LRU contract from js#41, pinned by tests**: reading refreshes recency,
  *updating* refreshes recency, `Has()` deliberately peeks without refreshing,
  and eviction always takes the front of the recency list.
- **`TryGet` uses the standard `bool` + `out` shape** (like
  `Dictionary.TryGetValue` from project 03), with `[MaybeNullWhen(false)]` so
  the nullable checker (project 05) understands it too.

## Key takeaway

When you catch yourself storing `object` (or casting on every read), you're
opting out of the compiler — the one tool TypeScript taught you to lean on.
Generics are how a container stays *reusable* without becoming *untyped*:
write the logic once with placeholder types, let each caller fill them in,
and whole categories of runtime crashes become compile errors.
