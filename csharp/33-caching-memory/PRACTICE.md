# 🏋️ Practice: Caching in Memory

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Measure before you celebrate (warm-up)

`ReportService` counts `Computations`, but nobody knows how *often* the cache actually helps. Add
`Hits`, `Misses`, and a `HitRatePercent` property, increment them in `Get`, and surface all three at
`GET /stats`. A hit rate is the only honest way to answer "is this cache earning its complexity?" —
a cache at 5% is pure overhead plus a staleness risk.
*Practices:* instrumenting a decision instead of assuming it, and the zero-traffic edge case.
**Hint:** `Interlocked.Increment(ref _hits)` for the same reason `_computations` uses it — several
requests run at once. The rate is `total == 0 ? 0 : (int)Math.Round(100.0 * Hits / total)`; guard the
divide-by-zero *before* the division, not after.
**Check offline:** add to `Tests.cs`:
```csharp
var m = new ReportService(new OrderStore(TimeSpan.Zero, Seed()), new FakeCacheStore());
m.Get(null); m.Get(null);
Check.Equal(1, m.Hits, "one hit");
Check.Equal(1, m.Misses, "one miss");
Check.Equal(50, m.HitRatePercent, "hit rate is 50%");
Check.Equal(0, new ReportService(new OrderStore(TimeSpan.Zero, Seed()), new FakeCacheStore()).HitRatePercent,
    "no traffic reports 0%, not a crash");
```
Then hammer `curl "http://localhost:5033/report"` five times and check `/stats`.

### ⭐⭐ 2. A second dimension in the key (core)

Add `?category=books` to `/report`. Pass it through `Reports.Build(orders, month, category)` (filter by
both; `null` means "all") and — the part that matters — into `KeyFor`. Then go read `KeyFor` and say
out loud what happens if you forget: *every* category would share one cached entry, and the first
caller's answer would be served to all of them.
*Practices:* the cache-key rule — **the key must contain every input that can change the answer**.
**Hint:** build the filter with `IEnumerable<Order> rows = orders;` then two conditional `Where`
calls, and `.ToList()` once at the end. For `Scope`, `category is null ? (month ?? "all") : $"{month ?? "all"}/{category}"`.
**Check offline:** add to `Tests.cs`:
```csharp
Check.Equal(44.00m, Reports.Build(sample, null, null).Total, "no filters = everything");
Check.Equal(17.00m, Reports.Build(sample, null, "books").Total, "category filter alone");
Check.Equal(10.00m, Reports.Build(sample, "2026-01", "books").Total, "both filters together");
Check.Equal(0, Reports.Build(sample, "2026-01", "toys").OrderCount, "both filters, no matching rows");
Check.Equal("all/books", Reports.Build(sample, null, "books").Scope, "the scope names the category");
Check.True(ReportService.KeyFor("2026-01", "books") != ReportService.KeyFor("2026-01", "food"),
    "categories cannot share a cache entry");
```
Then `curl "http://localhost:5033/report?category=books"` and `?category=food` — different totals, and
each is `cached:true` on its second request.

### ⭐⭐ 3. Invalidate by generation, not by hand (core)

Exercise 2 just made invalidation combinatorial: an order in `books`/`2026-01` now invalidates
`all/all`, `2026-01/all`, `all/books`, and `2026-01/books`. Miss one and it goes stale silently.
Replace `InvalidateFor` with **generational invalidation**: keep an `int _generation`, fold it into
every key, and make a write bump the counter. Every old key instantly becomes unreachable — no
`Remove` calls at all — and the orphans die at their own expiry.
*Practices:* making a whole class of bugs unrepresentable instead of remembering to avoid it.
**Hint:** `KeyFor` stops being `static` (it needs the counter): `$"report:v1:g{Generation}:{month ?? "all"}:{category ?? "all"}"`.
`InvalidateAll()` is one `Interlocked.Increment`. Update the `KeyFor` tests to call it on an instance.
**Check offline:** add to `Tests.cs`:
```csharp
var cache = new FakeCacheStore();
var svc = new ReportService(new OrderStore(TimeSpan.Zero, Seed()), cache);
Check.Equal(false, svc.Get(null, null).FromCache, "first call misses");
Check.Equal(true, svc.Get(null, null).FromCache, "second call hits");
Check.True(svc.KeyFor(null, null).Contains("g0"), "keys carry the generation");
svc.InvalidateAll();
Check.Equal(1, svc.Generation, "a write bumps the generation");
Check.True(svc.KeyFor(null, null).Contains("g1"), "...so every key changes at once");
Check.Equal(false, svc.Get(null, null).FromCache, "old entries are unreachable");
Check.Equal(0, cache.Removes, "and nothing was removed by hand");
```

### ⭐⭐ 4. Cache-aside, written once (core)

`ReportService.Get` spells out look-miss-compute-store by hand. So will the next service. Add
`T GetOrCreate<T>(string key, Func<T> factory)` to `ICacheStore` as a **default interface method** —
a method with a body, right in the interface — so `MemoryCacheStore` and `FakeCacheStore` both inherit
it and neither can spell the pattern differently. Then rewrite `Get` to use it.
*Practices:* default interface methods (C# 8), and collapsing a repeated five-step ritual into one call.
**Hint:** mark it `sealed` so implementations cannot override it — the whole point is that there is
exactly one version. Keeping `FromCache` in the result means `Get` still needs its own `TryGet` first;
that is fine, and worth noticing: `GetOrCreate` hides *whether* it was a hit, which is exactly what you
want everywhere except a demo that reports it.
**Check offline:** add to `Tests.cs`:
```csharp
ICacheStore cache = new FakeCacheStore();
Check.Equal(7, cache.GetOrCreate("k", () => 7), "GetOrCreate computes on a miss");
Check.Equal(7, cache.GetOrCreate("k", () => 999), "...and returns the stored value on a hit");
Check.Equal(1, ((FakeCacheStore)cache).Sets, "...having stored it exactly once");
```
Note the `ICacheStore cache = ...` on the first line: a default interface method is only visible
through the *interface* type, not through `FakeCacheStore`. That surprise is part of the exercise.

### ⭐⭐⭐ 5. Stop the stampede (challenge)

The comment block in `ReportService.Get` describes single-flight; build it. Add
`Task<ReportResult> GetAsync(string? month, string? category)`: check the cache, then take a **per-key**
`SemaphoreSlim` from a `ConcurrentDictionary`, check the cache *again* while holding it, and only then
compute. Make `/report` `async` and await it. Fifty simultaneous misses must produce one computation.
*Practices:* the double-checked pattern, `SemaphoreSlim` as an awaitable lock, and why the second check
is not paranoia.
**Hint:** `_gates.GetOrAdd(key, _ => new SemaphoreSlim(1, 1))` — `GetOrAdd` is atomic, so all fifty get
the same semaphore. Release in a `finally`, always. Do **not** use `lock`: you cannot `await` inside
one, and blocking a request thread for 800ms is the problem you came to solve.
**Check offline:** add to `Tests.cs` — use the *real* `MemoryCacheStore`, because `FakeCacheStore`'s
plain `Dictionary` is not thread-safe (add a `lock` to it if you want to use it here):
```csharp
using (var mem = new MemoryCache(new MemoryCacheOptions { SizeLimit = 128 }))
{
    var slow = new OrderStore(TimeSpan.FromMilliseconds(200), Seed());
    var svc = new ReportService(slow, new MemoryCacheStore(mem));

    var racers = Enumerable.Range(0, 20).Select(_ => Task.Run(() => svc.GetAsync(null, null))).ToArray();
    var results = Task.WhenAll(racers).GetAwaiter().GetResult();
    Check.Equal(1, svc.Computations, "20 simultaneous misses caused exactly ONE computation");
    Check.Equal(1, slow.Queries, "...and exactly one database query");
    Check.Equal(1, results.Count(r => !r.FromCache), "exactly one racer did the work");
    Check.True(results.All(r => r.Report.Total == 44.00m), "and everyone got the same right answer");

    Task.WhenAll(Task.Run(() => svc.GetAsync("2026-01", null)), Task.Run(() => svc.GetAsync("2026-02", null)))
        .GetAwaiter().GetResult();
    Check.Equal(3, svc.Computations, "different months are different gates, not a queue");
}
```

## Solutions

### 1. Measure before you celebrate

```csharp
// ReportService.cs
private int _hits, _misses;

public int Hits => Volatile.Read(ref _hits);
public int Misses => Volatile.Read(ref _misses);

public int HitRatePercent
{
    get
    {
        var total = Hits + Misses;
        return total == 0 ? 0 : (int)Math.Round(100.0 * Hits / total);
    }
}

public ReportResult Get(string? month)
{
    var key = KeyFor(month);
    if (_cache.TryGet<Report>(key, out var cached) && cached is not null)
    {
        Interlocked.Increment(ref _hits);
        return new ReportResult(cached, FromCache: true);
    }
    Interlocked.Increment(ref _misses);
    // ...unchanged...
}

// Program.cs
app.MapGet("/stats", (OrderStore orders, ReportService reports) => Results.Ok(new
{
    orders = orders.Count,
    databaseQueries = orders.Queries,
    reportsComputed = reports.Computations,
    hits = reports.Hits,
    misses = reports.Misses,
    hitRatePercent = reports.HitRatePercent,
}));
```

WHY: caching is a *bet*, and this is the scoreboard. A 95% hit rate says the bet paid; a 5% hit rate
says you added staleness, memory, and an invalidation bug surface for nothing, and the honest move is to
delete the cache. The counters live next to the decision they measure rather than in the endpoint —
which would only see its own requests. And `total == 0` is not a nitpick: `/stats` is the first thing
you curl on a fresh server, and a `NaN`-shaped crash there is a bad first impression.

### 2. A second dimension in the key

```csharp
// Reports.cs
public static Report Build(IReadOnlyList<Order> orders, string? month, string? category)
{
    IEnumerable<Order> rows = orders;
    if (month is not null) rows = rows.Where(o => o.Month == month);
    if (category is not null) rows = rows.Where(o => o.Category == category);
    var list = rows.ToList();                       // enumerate ONCE, at the end

    var byCategory = list
        .GroupBy(o => o.Category)
        .Select(g => new CategoryTotal(g.Key, g.Sum(o => o.Amount), g.Count()))
        .OrderByDescending(c => c.Total).ThenBy(c => c.Category)
        .ToList();

    var total = list.Sum(o => o.Amount);
    return new Report(
        Scope: category is null ? (month ?? "all") : $"{month ?? "all"}/{category}",
        OrderCount: list.Count,
        Total: total,
        Average: list.Count == 0 ? 0m : Math.Round(total / list.Count, 2),
        TopCategory: byCategory.Count == 0 ? "" : byCategory[0].Category,
        ByCategory: byCategory);
}

// ReportService.cs
public static string KeyFor(string? month, string? category)
    => $"report:v1:{month ?? "all"}:{category ?? "all"}";

public ReportResult Get(string? month, string? category)   // key now covers both
{
    var key = KeyFor(month, category);
    // ...unchanged...
}

// Program.cs
app.MapGet("/report", (string? month, string? category, ReportService reports) => { /* ...reports.Get(month, category)... */ });
```

WHY: this is the one cache rule you must never break — **the key must contain every input that can
change the answer.** Leave `category` out and `?category=books` and `?category=food` collide: whoever
asks first wins, and everyone else silently gets the wrong department's revenue. Not a crash — a
*plausible number*, which is the worst kind of wrong. A single `KeyFor` exists because this rule is
enforced by inspection, and inspecting one three-line method is possible. Note the `IEnumerable`
chaining too: composing `Where` calls builds one query that runs once at `.ToList()` rather than
materialising a list per filter (cs#04's deferred-execution lesson).

### 3. Invalidate by generation, not by hand

```csharp
// ReportService.cs
private int _generation;

public int Generation => Volatile.Read(ref _generation);

// No longer static: the key depends on the current generation.
public string KeyFor(string? month, string? category)
    => $"report:v1:g{Generation}:{month ?? "all"}:{category ?? "all"}";

/// Every cached report is now unreachable. We removed nothing — we simply
/// stopped asking for the old keys, and they die at their own expiry.
public void InvalidateAll() => Interlocked.Increment(ref _generation);

// Program.cs — the write side gets simpler, not more complicated
var order = orders.Add(dto.Category.Trim(), dto.Amount, dto.Month.Trim());
reports.InvalidateAll();
return Results.Created($"/orders/{order.Id}", order);
```

WHY: precise invalidation is correct right up until someone adds a fourth filter, at which point it is
correct *minus one key you forgot*. Generational invalidation trades precision for a guarantee: after a
write there is no reachable stale entry, by construction, however many dimensions the key grows. The
cost is that a write throws away good entries too — February was not affected by a January order, but it
is gone. That trade is usually right for a write-rarely/read-constantly dashboard and usually wrong for
a hot write path; knowing which you have is the actual skill. The orphans are also why absolute expiry
matters more here: nothing deletes them, so `SizeLimit` and the 5-minute ceiling bound the memory.

### 4. Cache-aside, written once

```csharp
// ICacheStore.cs
public interface ICacheStore
{
    bool TryGet<T>(string key, out T? value);
    void Set<T>(string key, T value);
    void Remove(string key);

    /// A DEFAULT INTERFACE METHOD (C# 8): a body, in the interface. Every
    /// implementation inherits it, and `sealed` means none of them may
    /// redefine it — there is exactly one spelling of cache-aside.
    sealed T GetOrCreate<T>(string key, Func<T> factory)
    {
        if (TryGet<T>(key, out var hit) && hit is not null) return hit;
        var made = factory();
        Set(key, made);
        return made;
    }
}

// ReportService.cs — Get keeps its own TryGet only because it reports FromCache
public ReportResult Get(string? month, string? category)
{
    var key = KeyFor(month, category);
    if (_cache.TryGet<Report>(key, out var cached) && cached is not null)
        return new ReportResult(cached, FromCache: true);

    return new ReportResult(_cache.GetOrCreate(key, () =>
    {
        var report = Reports.Build(_orders.All(), month, category);
        Interlocked.Increment(ref _computations);
        return report;
    }), FromCache: false);
}
```

WHY: default interface methods let an interface ship *derived* behaviour — things every implementation
should do identically — without an abstract base class and without copy-paste. `GetOrCreate` is derived
by definition: `TryGet` + `Set` in a fixed order, so letting a Redis store invent its own version would
only create ways to get it wrong. (The framework does exactly this, via extension methods, for
`IMemoryCache`.) The catch worth internalising is that default methods are invisible through the
concrete type — `new FakeCacheStore().GetOrCreate(...)` does not compile, `((ICacheStore)fake).GetOrCreate(...)`
does — because the method belongs to the contract, not the class. An extension method on `ICacheStore`
(cs#13) gives the same reuse with the opposite visibility rules; both are defensible.

### 5. Stop the stampede

```csharp
// ReportService.cs — add: using System.Collections.Concurrent;
private readonly ConcurrentDictionary<string, SemaphoreSlim> _gates = new();

public async Task<ReportResult> GetAsync(string? month, string? category)
{
    var key = KeyFor(month, category);

    // Fast path: a hit never touches a lock at all.
    if (_cache.TryGet<Report>(key, out var cached) && cached is not null)
        return new ReportResult(cached, FromCache: true);

    // One gate PER KEY. GetOrAdd is atomic, so every racer on this key gets
    // the same semaphore — and a racer on a different key gets a different one.
    var gate = _gates.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
    await gate.WaitAsync();
    try
    {
        // The SECOND check. While we queued, the winner may have finished and
        // filled the cache; without this, everyone who waited would compute
        // anyway and the lock would have bought nothing but a delay.
        if (_cache.TryGet<Report>(key, out var late) && late is not null)
            return new ReportResult(late, FromCache: true);

        var report = Reports.Build(_orders.All(), month, category);
        Interlocked.Increment(ref _computations);
        _cache.Set(key, report);
        return new ReportResult(report, FromCache: false);
    }
    finally
    {
        gate.Release();   // in a finally: an exception must not wedge the key forever
    }
}

// Program.cs
app.MapGet("/report", async (string? month, string? category, ReportService reports) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    var result = await reports.GetAsync(month, category);
    return Results.Ok(new { report = result.Report, cached = result.FromCache, ms = sw.ElapsedMilliseconds });
});
```

WHY: this is **double-checked locking**, and both checks earn their place. The first keeps the common
case — a hit — completely lock-free, so the semaphore is only involved in the rare moment after an
expiry. The second is what actually kills the stampede: nineteen requests wait, then nineteen find the
answer already there. Delete it and you get "the stampede, but politely queued", which is *slower* than
no lock at all.

`SemaphoreSlim` rather than `lock` because you cannot `await` inside a `lock`, and a blocked request
thread is a thread Kestrel cannot use for anybody else. Per-key rather than global because a global lock
makes a January miss stall February for 800ms — a burst converted into a traffic jam. And the `finally`
is not decoration: an exception thrown while holding the gate leaves that key permanently unservable,
the kind of outage that shows up the day the database is already having a bad time.

One honest loose end: `_gates` grows one entry per distinct key and never removes them. For a bounded
key space that is fine; for user ids or search terms you would evict gates too — at which point you are
writing a cache to protect your cache, and it is time to reach for a library.
