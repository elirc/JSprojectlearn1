// CACHE-ASIDE (also called lazy loading), the pattern in five lines:
//
//   1. look in the cache
//   2. hit?  return it
//   3. miss? do the expensive work
//   4. put the result in the cache
//   5. return it
//
// "Aside" because the cache sits *beside* the data source rather than in front
// of it: this class, not the cache, owns the decision to recompute. The other
// half — the half the original never wrote — is step 6: when the underlying
// data changes, someone must call Invalidate.
//
// Note who does what. Reports.Build is pure math. OrderStore is slow I/O.
// ICacheStore is memory. ReportService only *sequences* them, which is why it
// fits on one screen and is testable with a dictionary.

public record ReportResult(Report Report, bool FromCache);

public class ReportService
{
    private const string KeyPrefix = "report:";
    private const string AllScope = "all";

    private readonly OrderStore _orders;
    private readonly ICacheStore _cache;
    private int _computations;

    public ReportService(OrderStore orders, ICacheStore cache)
    {
        _orders = orders;
        _cache = cache;
    }

    /// How many times the report was actually built. Hits don't move it.
    public int Computations => Volatile.Read(ref _computations);

    /// One place that turns a query into a cache key. Scattering
    /// string-concatenated keys through endpoints is how invalidation starts
    /// missing entries: the writer spells the key slightly differently than
    /// the reader, and the stale copy lives on. The "v1" is a habit worth
    /// keeping — bump it and every old entry is ignored, which is the cheapest
    /// possible migration when the Report shape changes.
    public static string KeyFor(string? month) => $"{KeyPrefix}v1:{month ?? AllScope}";

    public ReportResult Get(string? month)
    {
        var key = KeyFor(month);

        if (_cache.TryGet<Report>(key, out var cached) && cached is not null)
            return new ReportResult(cached, FromCache: true);

        // ---------------------------------------------------------------
        // A note on CACHE STAMPEDE (also: dogpile, thundering herd).
        //
        // Suppose the entry expires at noon and fifty requests arrive at
        // 12:00:00. All fifty miss. All fifty start the 800ms computation.
        // The cache did not fail — it worked exactly as designed — and yet
        // the database just took fifty times its normal load at the worst
        // possible moment. Caches make outages *lumpier*, not smaller.
        //
        // The standard cure is SINGLE-FLIGHT: one lock PER KEY, taken around
        // the recompute, with a second cache check once you hold it —
        //
        //     var gate = _gates.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        //     await gate.WaitAsync();
        //     try {
        //         if (_cache.TryGet<Report>(key, out var late)) return late;  // someone else did it
        //         ... compute, Set ...
        //     } finally { gate.Release(); }
        //
        // Per-key matters: one global lock would make a miss on the January
        // report block the February one for 800ms, converting a stampede into
        // a queue. PRACTICE.md exercise 5 has you build it for real.
        // ---------------------------------------------------------------

        var report = Reports.Build(_orders.All(), month);
        Interlocked.Increment(ref _computations);
        _cache.Set(key, report);
        return new ReportResult(report, FromCache: false);
    }

    /// Called by the WRITE side. A new order in 2026-03 changes exactly two
    /// reports: that month's, and the all-time one. Dropping both keys — and
    /// only those two — is "explicit invalidation": the cache is told, rather
    /// than left to notice, which is the difference between a stale answer
    /// lasting milliseconds and lasting until the next deploy.
    public void InvalidateFor(string month)
    {
        _cache.Remove(KeyFor(month));
        _cache.Remove(KeyFor(null));
    }
}
