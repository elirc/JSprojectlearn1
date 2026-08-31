# 📘 Learning Guide: Caching in Memory

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A sales-report endpoint. There is a table of orders, and `GET /report` aggregates it: total revenue, order count, average order, and a breakdown by category. Optionally scoped to one month (`?month=2026-01`).

The aggregation is *expensive*. In this project it is expensive because we made it so — `Thread.Sleep(800)` stands in for a database query against a table with millions of rows — but the shape is real: dashboards, "top sellers", monthly summaries. They are slow, they are read constantly, and the underlying data changes rarely. That combination is the exact profile a cache is for.

Both versions run on `http://localhost:5033`. Both are fast on the second request. Only one of them is still *correct* on the second request.

You have met this idea before: js#41 built an LRU cache by hand, and cs#11 rebuilt it as `LruCache<TKey,TValue>`. Those taught the data structure. This project teaches the *policy* — expiry, invalidation, and eviction — which is where caches actually go wrong.

## 2. Concepts you need first

### What a cache is, in one sentence

A cache is a place to keep the answer to a question you expect to be asked again, so you can answer it without doing the work again.

That's it. Everything hard about caching follows from one detail: the answer was true *when you computed it*, and you are about to hand it out *later*.

### Staleness is the price, not the bug

A cached answer is a photograph. It was accurate the instant it was taken. Every millisecond afterwards, reality drifts, and your photograph does not.

Beginners think of stale data as a bug to eliminate. It isn't — it is the *price you agreed to pay* for speed. The real questions are:

- How stale is acceptable here? (For "orders placed today": seconds. For "2019 annual revenue": forever.)
- How will the cached copy find out it is wrong?

If you cannot answer the second question, you have not built a cache; you have built a copy of your data that nobody maintains.

### Cache-aside (the pattern this project uses)

Also called *lazy loading*. Five steps:

```
1. look in the cache
2. hit?  return it
3. miss? do the expensive work
4. store the result
5. return it
```

"Aside" because the cache sits *beside* the data source — your code decides when to consult it. (The alternative, *read-through*, hides the data source behind the cache itself. Cache-aside is simpler and easier to reason about; start here.)

JS comparison: `const cached = map.get(key) ?? map.set(key, compute()).get(key)` is the same shape, and js#41's memoize helper was cache-aside with no expiry.

### The two ways a cached entry should die

**Expiry (time-based, automatic).** The entry has a deadline. Two flavours, and real code usually sets both:

- **Absolute expiration** — "this entry dies 5 minutes after it was created, no matter how popular it is." A ceiling on staleness. This is your safety net for every invalidation you forget to write.
- **Sliding expiration** — "this entry dies after 1 minute with no reads." An idle timeout. It evicts unpopular keys early so they stop occupying memory.

Set together, they read as: *at most 5 minutes old, and dropped after 1 minute of neglect, whichever comes first.*

**Invalidation (event-based, explicit).** When you *know* the underlying data changed — someone POSTed an order — you delete the affected keys immediately. This is precise and instant, and it is the one the original never wrote.

You want both. Invalidation handles the changes you predicted; expiry handles the ones you didn't.

### Eviction and size limits

Even with expiry, a cache with unlimited keys can balloon: a crawler requesting `?month=aaa`, `?month=aab`, … creates a new entry per request, each living for its full lifetime. **Eviction** is the cache throwing things out *because it is full*, not because they expired. `IMemoryCache` supports it if you give the cache a `SizeLimit` and each entry a `Size`:

```csharp
builder.Services.AddMemoryCache(options => options.SizeLimit = 128);
// ...and every entry declares Size = 1, so "128" means "128 entries"
```

The units are yours to define — `Size = 1` per entry means the limit counts entries; you could instead set `Size` to a byte estimate and the limit to a memory budget. What matters is that a limit *exists*. A cache that cannot be full cannot be emptied.

### `IMemoryCache`

.NET's in-process cache, in the ASP.NET Core shared framework — no NuGet package:

```csharp
builder.Services.AddMemoryCache(options => options.SizeLimit = 128);

// ...injected anywhere as IMemoryCache
cache.TryGetValue(key, out object? value);
cache.Set(key, value, new MemoryCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
    SlidingExpiration = TimeSpan.FromMinutes(1),
    Size = 1,
});
cache.Remove(key);
```

"In-process" is the important qualifier: this cache lives inside *one* running app. Two servers behind a load balancer have two independent caches that can disagree, and both are wiped on restart. When that stops being acceptable, you move to a **distributed cache** (Redis, via `StackExchange.Redis` — a NuGet package) which is a network service all your servers share. Same pattern, same three methods, different failure modes.

### Cache stampede

The failure that surprises people. An entry expires at noon. Fifty requests arrive at 12:00:00. All fifty miss. All fifty start the 800ms computation. Your database, which was comfortably serving one query every five minutes, gets fifty at once.

Nothing malfunctioned — the cache behaved exactly as configured. That is what makes stampedes nasty: caches make load *lumpier*, and the lumps land at the worst moment.

The standard cure is **single-flight**: one lock per key, so the first request computes and the other forty-nine wait for its answer.

```csharp
var gate = _gates.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
await gate.WaitAsync();
try
{
    if (_cache.TryGet<Report>(key, out var late)) return late;  // someone else finished
    // ...compute, Set...
}
finally { gate.Release(); }
```

**Per key** matters. One global lock would make a miss on the January report block February for 800ms — you'd have replaced a stampede with a queue. `SemaphoreSlim(1, 1)` is a lock you can `await` (unlike `lock`, which you cannot use across an `await`). PRACTICE exercise 5 builds this for real.

### Immutability makes shared cache entries safe

A cache hands the *same object* to every caller. If `Report` were a mutable class, one request could edit the shared copy and quietly corrupt every future response. Because `Report` is a `record` of `record`s (cs#07), handing out the same reference is free and safe. Caching and immutability are close friends.

## 3. Walking through the original code

Two endpoints, two lessons. First, the honest-but-slow one:

```csharp
app.MapGet("/report", (string? month) =>
{
    var sw = Stopwatch.StartNew();
    Thread.Sleep(800);                       // "the expensive aggregation"
    var report = BuildReport(orders, month);
    return Results.Ok(new { report, ms = sw.ElapsedMilliseconds, cached = false });
});
```

Correct, and 800ms every time — including the ninth identical request in a row.

Then the fix someone shipped:

```csharp
static class Cache
{
    public static readonly Dictionary<string, Report> Entries = new();
}

if (Cache.Entries.TryGetValue(key, out var hit))
    return Results.Ok(new { report = hit, ms = sw.ElapsedMilliseconds, cached = true });
// ...miss: compute, then
Cache.Entries[key] = report;
```

Read that dictionary carefully. There is no expiry field, no size limit, and — searching the whole file — no line anywhere that calls `Remove`. `POST /orders` appends to `orders` and returns. The write path and the cache have never been introduced to each other.

## 4. What's wrong with it (in beginner terms)

**1. `/report` does the same work over and over.** Not "the code is slow" — *the work is redundant*. Between two identical requests, nothing changed, and the server recomputed anyway. That's the waste a cache removes, and noticing the difference between "slow" and "redundantly slow" is how you tell whether caching is even the right tool.

**2. `/report/fast` serves a lie, permanently.** Three commands prove it: POST an order, GET `/report` (total went up), GET `/report/fast` (total didn't). And it never will. There is no deadline, no invalidation, no version — the entry is immortal. Users will report "the dashboard is wrong", someone will restart the server, it will "fix itself", and the ticket will be closed as not reproducible.

**3. Nothing bounds the staleness.** Even in an app with no writes at all, you'd want a ceiling: "no answer here is older than five minutes." Expiry is what lets you say that. Without it, the only recovery from any bad cached value is a redeploy.

**4. The dictionary only grows.** `curl "/report/fast?month=whatever"` and check `/cache/stats`. Every distinct key — every typo, every probe — adds an entry that will never be removed. Now imagine the key includes a user id, or a search term. This is a memory leak that looks like a performance feature, which is why it survives code review.

**5. You cannot test any of it.** The cache is a static field poked by an endpoint. To test "does a hit skip the computation?" you'd have to start a server, make two requests, and time them — a test that fails on a slow laptop and passes on a fast one. So the tests don't exist, and the staleness bug ships.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 The aggregation math and the caching decision are two different jobs sharing one function. Separate them: what's the smallest pure function that turns orders into a `Report`?
2. 🌿 Register `builder.Services.AddMemoryCache(o => o.SizeLimit = 128)` and inject `IMemoryCache`. Replace `Cache.Entries[key] = report` with `cache.Set(key, report, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ..., SlidingExpiration = ..., Size = 1 })`.
3. 🌳 Find every place that *writes* an order and make it `cache.Remove(...)` the affected keys. Then notice the danger: the reader builds a key string and the writer builds a key string, in two different files. Move key construction into one method both call.
4. 🍎 Now make it testable. Put the cache behind a tiny interface (`TryGet`, `Set`, `Remove`), write a dictionary-backed fake with hit/miss counters, and assert "the second call did not recompute" by *counting*, not by timing.

## 6. Understanding the refactored solution

**`Reports.cs`** — the domain, and nothing else. `Reports.Build(orders, month)` is pure: same input, same output, no clock, no cache, no HTTP. Roughly twenty assertions in `Tests.cs` cover it, including the empty-month case (zero orders → zero average, not a divide-by-zero), and none of them know a cache exists.

**`ICacheStore.cs`** — the seam, three methods wide. Note what it deliberately does *not* expose: callers cannot choose an expiry per call. Expiry is a deployment decision, not a per-request one, so it lives in the implementation where it can be changed once.

**`MemoryCacheStore.cs`** — the real one. All the policy the original was missing, in one class:

```csharp
_cache.Set(key, value, new MemoryCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = _absolute,   // 5 min ceiling
    SlidingExpiration = _sliding,                  // 1 min idle timeout
    Size = 1,                                      // counts against SizeLimit
});
```

`TryGet` uses `raw is T typed`, so a key holding the wrong type is a *miss* rather than a cast exception — caches fail closed, like `PasswordHasher.Verify` in cs#23.

**`FakeCacheStore.cs`** — the test double: a dictionary plus `Hits`/`Misses`/`Sets`/`Removes` counters and an `ExpireAll()` that means "now imagine five minutes passed". It turns every timing-based question into a counting-based one, which is the difference between a test suite you trust and one you rerun until it's green.

**`ReportService.cs`** — cache-aside in a dozen lines, plus the two things the original lacked:

```csharp
public static string KeyFor(string? month) => $"report:v1:{month ?? "all"}";

public void InvalidateFor(string month)
{
    _cache.Remove(KeyFor(month));
    _cache.Remove(KeyFor(null));    // a January order also changes the all-time report
}
```

One `KeyFor` is not fussiness: when the reader and the writer build keys separately, they eventually disagree by one character and invalidation silently stops working. The `v1` is a free migration — bump it and every old-shaped entry is ignored.

**`Program.cs`** — one `/report` endpoint, not two, because caching should be invisible from outside. `POST /orders` ends with `reports.InvalidateFor(order.Month)`, the line the original never had. `/stats` exposes `databaseQueries` and `reportsComputed` so you can watch hits cost nothing.

**`Tests.cs`** — the structure echoes cs#21: one `CacheAsideSuite(ICacheStore, label)` runs against the fake *and* the real `IMemoryCache`. It asserts hits skip the database, different months are different keys, and — pointedly — reproduces the original's bug (a write with no invalidation still serves the stale total) immediately before proving the fix. One test does sleep 120ms, and only one: a `MemoryCacheStore` built with a 20ms deadline, proving the framework really does forget.

## 7. Words you learned (glossary)

- **Cache** — a stored answer kept to avoid recomputing it.
- **Cache hit / miss** — the key was / wasn't there.
- **Cache-aside (lazy loading)** — look, miss, compute, store, return; your code owns the decision.
- **Staleness** — the gap between a cached answer and current reality.
- **Invalidation** — explicitly removing entries you know are now wrong.
- **Expiry** — an entry's automatic deadline.
- **Absolute expiration** — dies N after creation, regardless of use.
- **Sliding expiration** — dies after N with no reads (an idle timeout).
- **Eviction** — removal because the cache is full, not because time passed.
- **`SizeLimit` / `Size`** — the cache's capacity and each entry's cost against it.
- **`IMemoryCache`** — .NET's in-process cache; `AddMemoryCache()`; shared framework, no NuGet.
- **In-process vs distributed cache** — one app's memory vs a shared service (Redis) all servers see.
- **Cache stampede (dogpile)** — many simultaneous misses on one key all doing the same work.
- **Single-flight** — one computation per key at a time; per-key `SemaphoreSlim`.
- **`SemaphoreSlim`** — a lock you can `await`, unlike `lock`.
- **Cache key** — the string identifying an entry; built in exactly one place, or invalidation breaks.

## 8. Experiments to try on the plane (no internet needed)

All localhost, all offline.

1. **Watch the stale lie form.** Original server: `curl "http://localhost:5033/report/fast"` (note the total), POST an order with `?amount=999`, then `curl "http://localhost:5033/report"` and `curl "http://localhost:5033/report/fast"` back to back. One number moved. Repeat the fast one ten times — it never catches up. Now do the same three commands against the refactored server: the second read says `"cached":false` and shows the new total.
2. **Grow the leak on purpose.** Original: hit `/report/fast?month=` with twenty different junk values, then `curl "http://localhost:5033/cache/stats"`. Twenty entries, none of which will ever be removed. Now try to do the same to the refactored app — set `SizeLimit = 4` in `Program.cs`, restart, request six different months, and watch `/report` start reporting `"cached":false` for keys that were evicted. That's a cache admitting it is full.
3. **Make expiry visible.** In `MemoryCacheStore`, change `DefaultAbsolute` to `TimeSpan.FromSeconds(5)`. Restart, `curl "/report"` (miss), immediately again (hit), wait six seconds, again — miss. You just watched the staleness ceiling do its job with no invalidation code involved at all.
4. **Break invalidation the way real code breaks it.** In `Program.cs`, change the invalidation call to `reports.InvalidateFor("2026-99")`. Run `-- test` — still green (the unit tests call `InvalidateFor` correctly), but POST an order and `/report` is stale again. Now put `KeyFor` back in the driver's seat and consider: which test would have caught this? (One that goes through the endpoint. That's cs#35, next door.)
5. **Feel a stampede.** In `Program.cs` add `app.MapPost("/cache/clear", (ReportService r) => { r.InvalidateFor("2026-01"); return Results.Ok(); });`. Then from one terminal, clear the cache; from another, fire ten parallel requests — on Windows PowerShell: `1..10 | ForEach-Object -Parallel { curl.exe -s "http://localhost:5033/report" } -ThrottleLimit 10`. Check `/stats`: `reportsComputed` jumped by roughly ten, not one. Ten copies of the same 800ms job. Now go do PRACTICE exercise 5.
6. **Prove the fake and the framework agree.** In `FakeCacheStore.TryGet`, delete the `raw is T typed` check and just cast. Run `-- test`: the `[fake]` suite still passes but `a key holding the WRONG type is a miss` fails for the real store — and if you also make the fake's `Set` a no-op, watch the whole `[fake]` suite light up while `[memory]` stays green. That divergence is exactly what running one suite against both implementations is for.
