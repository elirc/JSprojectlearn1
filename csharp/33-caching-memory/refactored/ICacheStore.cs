// The SEAM (cs#21's lesson again, applied to caching). Three methods is the
// entire surface our app needs from a cache:
//
//   MemoryCacheStore  — the real one, over the framework's IMemoryCache.
//   FakeCacheStore    — the test double: same contract, no framework, and it
//                       can be told to "expire everything" on demand so tests
//                       never have to sleep.
//   (a Redis store)   — doesn't exist here, but a distributed cache
//                       (StackExchange.Redis, a NuGet package) implements
//                       exactly this shape. Zero endpoint edits.
//
// Why not have ReportService depend on IMemoryCache directly? It could — but
// then every cache test would need the framework's entry-options machinery,
// and "did we cache it?" would be answered by poking at a real cache instead
// of by a fake that simply counts. Narrow interfaces make honest doubles.

public interface ICacheStore
{
    /// True when the key is present AND holds a T. Anything else is a miss.
    bool TryGet<T>(string key, out T? value);

    /// Store (or overwrite) a value under the key, with whatever expiry policy
    /// the implementation applies. Callers deliberately cannot choose it —
    /// expiry is a *deployment* decision, not a per-call one.
    void Set<T>(string key, T value);

    /// Explicit invalidation. This is the method the write side calls.
    void Remove(string key);
}
