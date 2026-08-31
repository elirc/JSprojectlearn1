using Microsoft.Extensions.Caching.Memory;

public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Reports.Build: the math, with no cache anywhere near it");
        var sample = new List<Order>
        {
            new(1, "books", 10.00m, "2026-01"),
            new(2, "food",   5.50m, "2026-01"),
            new(3, "books",  7.00m, "2026-02"),
            new(4, "toys",  21.50m, "2026-02"),
        };

        var all = Reports.Build(sample, null);
        Check.Equal("all", all.Scope, "no month means the all-time report");
        Check.Equal(4, all.OrderCount, "counts every order");
        Check.Equal(44.00m, all.Total, "sums every amount");
        Check.Equal(11.00m, all.Average, "average is total / count");
        Check.Equal("toys", all.TopCategory, "top category is the biggest by total");
        Check.Equal(3, all.ByCategory.Count, "one row per category");
        Check.Equal(17.00m, all.ByCategory.First(c => c.Category == "books").Total, "books rows are summed together");
        Check.Equal(2, all.ByCategory.First(c => c.Category == "books").Count, "...and counted together");

        var jan = Reports.Build(sample, "2026-01");
        Check.Equal("2026-01", jan.Scope, "the month is echoed back as the scope");
        Check.Equal(2, jan.OrderCount, "a month report only counts that month");
        Check.Equal(15.50m, jan.Total, "a month report only sums that month");
        Check.Equal(7.75m, jan.Average, "a month report averages that month");
        Check.Equal("books", jan.TopCategory, "January's top category differs from all-time");

        var empty = Reports.Build(sample, "2026-03");
        Check.Equal(0, empty.OrderCount, "a month with no orders reports zero orders");
        Check.Equal(0m, empty.Total, "...zero total");
        Check.Equal(0m, empty.Average, "...and zero average, not a divide-by-zero crash");
        Check.Equal("", empty.TopCategory, "...and no top category");

        var ties = new List<Order> { new(1, "beta", 10m, "m"), new(2, "alpha", 10m, "m") };
        Check.Equal("alpha", Reports.Build(ties, null).ByCategory[0].Category,
            "equal totals are broken by name, so the output is deterministic");

        // The same cache-aside suite against BOTH implementations of the seam.
        // If the fake ever drifts from the framework's real cache, this catches
        // it — cs#21's contract-test idea, applied to caching.
        Console.WriteLine("Cache-aside suite vs FakeCacheStore (the double)");
        CacheAsideSuite(new FakeCacheStore(), "fake");

        Console.WriteLine("Cache-aside suite vs MemoryCacheStore (the real IMemoryCache)");
        using (var real = new MemoryCache(new MemoryCacheOptions { SizeLimit = 128 }))
            CacheAsideSuite(new MemoryCacheStore(real), "memory");

        Console.WriteLine("FakeCacheStore: the counters say what happened");
        {
            var cache = new FakeCacheStore();
            var service = new ReportService(new OrderStore(TimeSpan.Zero, Seed()), cache);

            service.Get(null);
            Check.Equal(1, cache.Misses, "the first read missed");
            Check.Equal(1, cache.Sets, "...so the result was stored");
            service.Get(null);
            Check.Equal(1, cache.Hits, "the second read hit");
            Check.Equal(1, cache.Sets, "...and stored nothing new");
            Check.Equal(1, cache.Count, "one key in the cache");
            Check.Equal(ReportService.KeyFor(null), cache.Keys[0], "and it is the key the service computed");

            // "Now imagine five minutes passed." No Thread.Sleep in sight.
            cache.ExpireAll();
            var afterExpiry = service.Get(null);
            Check.Equal(false, afterExpiry.FromCache, "an expired entry is a miss");
            Check.Equal(2, service.Computations, "...and the work is done again");
            Check.Equal(44.00m, afterExpiry.Report.Total, "the recomputed number is still correct");
        }

        Console.WriteLine("MemoryCacheStore: the framework's own behaviour");
        using (var real = new MemoryCache(new MemoryCacheOptions { SizeLimit = 128 }))
        {
            var store = new MemoryCacheStore(real);
            store.Set("k", new Order(1, "books", 3m, "2026-01"));

            Check.True(store.TryGet<Order>("k", out var got), "a stored value comes back");
            Check.Equal(3m, got!.Amount, "...unchanged");
            Check.Equal(false, store.TryGet<Order>("nope", out _), "an unknown key is a miss");
            Check.Equal(false, store.TryGet<Report>("k", out _), "a key holding the WRONG type is a miss, not a crash");

            store.Remove("k");
            Check.Equal(false, store.TryGet<Order>("k", out _), "Remove really removes");
            store.Remove("k");   // must not throw
            Check.Equal(false, store.TryGet<Order>("k", out _), "removing twice is silent");
        }

        Console.WriteLine("MemoryCacheStore: entries really do expire (the one test that waits)");
        using (var real = new MemoryCache(new MemoryCacheOptions { SizeLimit = 128 }))
        {
            // 20ms instead of 5 minutes — the policy is a constructor argument
            // precisely so this test can exist at all.
            var quick = new MemoryCacheStore(real, TimeSpan.FromMilliseconds(20), TimeSpan.FromMilliseconds(20));
            quick.Set("k", new Order(1, "books", 3m, "2026-01"));
            Check.True(quick.TryGet<Order>("k", out _), "present immediately after Set");

            Thread.Sleep(120);
            Check.Equal(false, quick.TryGet<Order>("k", out _),
                "gone after its absolute deadline — the cache is ALLOWED to forget");
        }

        Console.WriteLine("Cache keys");
        Check.Equal("report:v1:all", ReportService.KeyFor(null), "no month keys the all-time report");
        Check.Equal("report:v1:2026-01", ReportService.KeyFor("2026-01"), "a month keys its own report");
        Check.True(ReportService.KeyFor("2026-01") != ReportService.KeyFor("2026-02"),
            "different months cannot collide");

        return Check.Summary();
    }

    private static Order[] Seed() =>
    [
        new Order(1, "books", 10.00m, "2026-01"),
        new Order(2, "food",   5.50m, "2026-01"),
        new Order(3, "books",  7.00m, "2026-02"),
        new Order(4, "toys",  21.50m, "2026-02"),
    ];

    // One suite, any ICacheStore. It pins the three behaviours that separate a
    // cache from a memory leak: hits skip the work, writes are noticed, and
    // different keys are different answers.
    private static void CacheAsideSuite(ICacheStore cache, string label)
    {
        var orders = new OrderStore(TimeSpan.Zero, new[]
        {
            new Order(1, "books", 10m, "2026-01"),
            new Order(2, "food",   5m, "2026-01"),
            new Order(3, "books",  7m, "2026-02"),
        });
        var reports = new ReportService(orders, cache);

        var first = reports.Get(null);
        Check.Equal(false, first.FromCache, $"[{label}] the first call is a MISS");
        Check.Equal(1, reports.Computations, $"[{label}] a miss builds the report");
        Check.Equal(1, orders.Queries, $"[{label}] a miss hits the database");
        Check.Equal(22m, first.Report.Total, $"[{label}] and the number is right");

        var second = reports.Get(null);
        Check.Equal(true, second.FromCache, $"[{label}] the second call is a HIT");
        Check.Equal(1, reports.Computations, $"[{label}] a hit builds nothing");
        Check.Equal(1, orders.Queries, $"[{label}] a hit never touches the database");
        Check.Equal(22m, second.Report.Total, $"[{label}] and returns the same number");
        Check.True(ReferenceEquals(first.Report, second.Report),
            $"[{label}] the SAME object is handed out — safe only because Report is immutable");

        var janMiss = reports.Get("2026-01");
        Check.Equal(false, janMiss.FromCache, $"[{label}] a different month is a different key");
        Check.Equal(15m, janMiss.Report.Total, $"[{label}] and gets its own answer");
        Check.Equal(true, reports.Get("2026-01").FromCache, $"[{label}] which then caches too");

        // The original's bug, reproduced deliberately: a write with no
        // invalidation leaves a confident, wrong answer in place.
        orders.Add("toys", 100m, "2026-01");
        Check.Equal(true, reports.Get(null).FromCache, $"[{label}] a write alone does not refresh anything");
        Check.Equal(22m, reports.Get(null).Report.Total,
            $"[{label}] so the STALE total is still served (this is the original's bug)");

        // ...and the fix.
        reports.InvalidateFor("2026-01");
        var afterInvalidate = reports.Get(null);
        Check.Equal(false, afterInvalidate.FromCache, $"[{label}] invalidation forces a recompute");
        Check.Equal(122m, afterInvalidate.Report.Total, $"[{label}] which sees the new order");
        Check.Equal(true, reports.Get(null).FromCache, $"[{label}] and the fresh answer is cached again");

        var janAfter = reports.Get("2026-01");
        Check.Equal(false, janAfter.FromCache, $"[{label}] the month key was invalidated too");
        Check.Equal(115m, janAfter.Report.Total, $"[{label}] and it also sees the new order");

        // February was untouched by a January write, so it must still be cached.
        var feb = reports.Get("2026-02");
        Check.Equal(false, feb.FromCache, $"[{label}] February was never cached before");
        Check.Equal(7m, feb.Report.Total, $"[{label}] February total is unaffected by January");
        Check.Equal(true, reports.Get("2026-02").FromCache, $"[{label}] February caches like everything else");
    }
}
