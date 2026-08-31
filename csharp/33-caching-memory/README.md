# CS 33 — caching-memory

**Lesson: a cache is a promise to forget. `IMemoryCache` with expiry, a size
limit, and explicit invalidation on writes — versus a static `Dictionary` that
remembers wrong answers forever.**

## Run it

```
dotnet run csharp/33-caching-memory/original.cs
dotnet run --project csharp/33-caching-memory/refactored
dotnet run --project csharp/33-caching-memory/refactored -- test
```

Original (http://localhost:5033) — two endpoints, two different failures:

```
curl "http://localhost:5033/report"        -> "ms": ~800. Every single time.
curl "http://localhost:5033/report/fast"   -> ~800 once, then ~0. Suspiciously fast.
curl -X POST "http://localhost:5033/orders?category=books&amount=999&month=2026-01"
curl "http://localhost:5033/report"        -> total went up
curl "http://localhost:5033/report/fast"   -> total did NOT. Stale, forever.
curl "http://localhost:5033/cache/stats"   -> and every typo'd ?month is still in there
```

The refactored server has one `/report` (JSON bodies for writes): the first
call says `"cached":false` and ~800ms, the second `"cached":true` and ~0ms, and
a `POST /orders` makes the very next read a miss again with the new total.

## What's wrong with the original?

1. **`/report` repeats work that nothing changed.** Ten dashboards refreshing =
   ten identical 800ms aggregations. Slow is bad; slow *and redundant* is the
   part a cache exists to fix.
2. **`/report/fast` never invalidates.** Nothing connects the write path to
   `Cache.Entries`, so one POST turns every cached report into a confident lie
   that survives until the process restarts.
3. **No expiry** — no ceiling on how old an answer may be. **No size limit** —
   one entry per distinct `?month`, typos included. A `Dictionary` that only
   grows is a memory leak wearing a cache's hat.
4. **The cache is welded into the endpoint**, so "is the number right?" and
   "was it a hit?" can only be asked together — which means neither gets tested.

## What changed in the refactor

- **`Reports.Build` is pure** — orders in, `Report` out, testable with no cache,
  no clock, and no server.
- **`ICacheStore`** (Get/Set/Remove) is the seam: `MemoryCacheStore` over the
  framework's `IMemoryCache`, `FakeCacheStore` for tests. One cache-aside
  contract suite runs against both (cs#21's idea, applied to caching).
- **`MemoryCacheStore` owns the policy in one place**: absolute expiry (5 min
  ceiling), sliding expiry (1 min idle timeout), and `Size = 1` against the
  cache's `SizeLimit` so the framework can evict. It is *allowed to forget*.
- **`ReportService` is cache-aside**, with keys from one `KeyFor` method so the
  reader and the writer cannot spell them differently. **Writes invalidate
  explicitly**; tests pin the stale-read bug *and* its fix. **Cache stampede**
  is documented there too, with per-key `SemaphoreSlim` single-flight as the
  cure — PRACTICE exercise 5 builds it.

## Key takeaway

Caching trades correctness for speed, so the design question is never "should I
cache?" but "how wrong am I willing to be, and for how long?" Answer it out
loud — expiry bounds the staleness you did not plan for, invalidation removes
the staleness you did, and a size limit bounds the memory. A cache with none of
the three is not an optimisation; it is a second, worse copy of your data.
