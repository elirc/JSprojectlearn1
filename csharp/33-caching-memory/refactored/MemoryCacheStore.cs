using Microsoft.Extensions.Caching.Memory;

// The real cache: a thin adapter over IMemoryCache, which ships in the
// ASP.NET Core shared framework (no NuGet needed) and is registered with
// `builder.Services.AddMemoryCache(...)`.
//
// Everything the original got wrong is a policy decision that lives HERE, in
// one class, instead of being absent everywhere:
//
//   AbsoluteExpirationRelativeToNow — a hard ceiling. However popular an entry
//     is, it dies at five minutes and gets recomputed. This is the honesty
//     valve: it bounds how stale any answer can be, even if someone forgets an
//     invalidation call.
//
//   SlidingExpiration — an idle timeout. An entry nobody has asked for in a
//     minute is evicted early, so unpopular keys (the crawler's typo'd month)
//     do not squat in memory until their absolute deadline.
//
//   Size = 1 + SizeLimit on the cache — a hard cap on how many entries can
//     exist at once. When the cache is full, IMemoryCache evicts to make room.
//     THIS is what makes it a cache rather than a leak: it is allowed to
//     forget, which the original's Dictionary never was.
//
// Absolute and sliding together read as: "at most 5 minutes old, and dropped
// after 1 minute of neglect, whichever comes first."

public class MemoryCacheStore : ICacheStore
{
    public static readonly TimeSpan DefaultAbsolute = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan DefaultSliding = TimeSpan.FromMinutes(1);

    private readonly IMemoryCache _cache;
    private readonly TimeSpan _absolute;
    private readonly TimeSpan _sliding;

    public MemoryCacheStore(IMemoryCache cache)
        : this(cache, DefaultAbsolute, DefaultSliding) { }

    // Tests use this overload to make expiry observable without waiting five
    // minutes. Same trick as injecting a clock (cs#23's practice set). It is
    // `internal` on purpose: the DI container only ever sees PUBLIC
    // constructors, so this one cannot confuse it about which to call.
    internal MemoryCacheStore(IMemoryCache cache, TimeSpan absolute, TimeSpan sliding)
    {
        _cache = cache;
        _absolute = absolute;
        _sliding = sliding;
    }

    public bool TryGet<T>(string key, out T? value)
    {
        // Note the `is T typed` check: IMemoryCache stores `object`, so a key
        // collision with a different type is a MISS, not a cast crash.
        if (_cache.TryGetValue(key, out object? raw) && raw is T typed)
        {
            value = typed;
            return true;
        }
        value = default;
        return false;
    }

    public void Set<T>(string key, T value)
    {
        _cache.Set(key, value, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _absolute,
            SlidingExpiration = _sliding,
            Size = 1,
        });
    }

    public void Remove(string key) => _cache.Remove(key);
}
