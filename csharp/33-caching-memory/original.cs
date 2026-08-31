#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// (That second line just silences native-AOT trimming warnings that
// file-based web apps emit for reflection-based JSON — ignore it.)
//
// 33 — caching (ORIGINAL, flawed on purpose)
//
// A sales-report endpoint over an in-memory order table. The aggregation is
// "expensive" (we simulate a slow database with Thread.Sleep(800)), so:
//
//   GET /report        recomputes EVERYTHING on every single request. 800ms,
//                      every time, even when nothing changed. Watch the "ms"
//                      field in the response.
//
//   GET /report/fast   the "fix" someone shipped at 4pm on a Friday: a static
//                      Dictionary that remembers every report forever. It is
//                      fast. It is also wrong, in two separate ways.
//
// Run:   dotnet run csharp/33-caching-memory/original.cs
// Try:
//   curl "http://localhost:5033/report"                 -> ms: ~800, every time
//   curl "http://localhost:5033/report/fast"            -> ms: ~800 the first time
//   curl "http://localhost:5033/report/fast"            -> ms: ~0   after that
//
//   THE STALENESS BUG, in three commands:
//   curl -X POST "http://localhost:5033/orders?category=books&amount=999&month=2026-01"
//   curl "http://localhost:5033/report"                 -> total went up. Correct.
//   curl "http://localhost:5033/report/fast"            -> total did NOT go up.
//        The cached copy has no idea a write happened. It will keep serving
//        that stale number until the process restarts. Forever.
//
//   THE MEMORY BUG, in one command:
//   curl "http://localhost:5033/cache/stats"
//   ...then hit /report/fast?month=2026-01 ... 2026-12, plus a few typos like
//   ?month=whatever, and check /cache/stats again. Every distinct query string
//   adds an entry that is never removed. A cache with no expiry and no size
//   limit is not a cache — it is a memory leak with good manners.

using System.Diagnostics;

var app = WebApplication.CreateBuilder(args).Build();

// The "database": 2,400 orders. Pretend it is 24 million and lives on another
// machine — that is what the Thread.Sleep below is standing in for.
var categories = new[] { "books", "food", "toys", "tools" };
var orders = new List<Order>();
for (int i = 1; i <= 2400; i++)
    orders.Add(new Order(i, categories[i % 4], 5m + (i % 40), $"2026-{(i % 12) + 1:00}"));

app.MapGet("/orders/count", () => Results.Ok(new { count = orders.Count }));

// ---------------------------------------------------------------------------
// Version 1: no cache at all. Correct, and unusably slow.
// ---------------------------------------------------------------------------
app.MapGet("/report", (string? month) =>
{
    var sw = Stopwatch.StartNew();

    // FLAW #1: this runs on EVERY request. Ten users refreshing a dashboard =
    // ten identical 800ms aggregations of data that did not change between
    // them. The work is not just slow, it is *repeated* — which is the part a
    // cache can actually fix.
    Thread.Sleep(800);
    var report = BuildReport(orders, month);

    return Results.Ok(new { report, ms = sw.ElapsedMilliseconds, cached = false });
});

// ---------------------------------------------------------------------------
// Version 2: the Friday-afternoon "fix".
// ---------------------------------------------------------------------------
app.MapGet("/report/fast", (string? month) =>
{
    var sw = Stopwatch.StartNew();
    var key = month ?? "all";

    if (Cache.Entries.TryGetValue(key, out var hit))
        return Results.Ok(new { report = hit, ms = sw.ElapsedMilliseconds, cached = true });

    Thread.Sleep(800);
    var report = BuildReport(orders, month);

    // FLAW #2 (staleness): this entry is written once and never invalidated.
    // No expiry, no version, nothing watching the orders list. The moment
    // anyone POSTs an order, this cached report becomes a lie — and it is a
    // lie the server will repeat, confidently, for the rest of its life.
    //
    // FLAW #3 (unbounded growth): Cache.Entries has no size limit either. One
    // entry per distinct ?month value, including every typo and every probe
    // from a bored crawler. Nothing is ever evicted. This dictionary only
    // grows, and it grows in the same memory your app needs to serve requests.
    Cache.Entries[key] = report;

    return Results.Ok(new { report, ms = sw.ElapsedMilliseconds, cached = false });
});

app.MapPost("/orders", (string category, decimal amount, string month) =>
{
    var order = new Order(orders.Count + 1, category, amount, month);
    orders.Add(order);

    // Note what is NOT here: any attempt to tell the cache that the world
    // changed. The write side and the cache have never been introduced.
    return Results.Created($"/orders/{order.Id}", order);
});

// Proof of flaw #3: watch this number climb and never come down.
app.MapGet("/cache/stats", () => Results.Ok(new
{
    entries = Cache.Entries.Count,
    keys = Cache.Entries.Keys.ToList(),
}));

app.Run("http://localhost:5033");

Report BuildReport(List<Order> all, string? month)
{
    var scope = month ?? "all";
    var rows = month is null ? all : all.Where(o => o.Month == month).ToList();
    var byCategory = rows
        .GroupBy(o => o.Category)
        .Select(g => new CategoryTotal(g.Key, g.Sum(o => o.Amount), g.Count()))
        .OrderByDescending(c => c.Total)
        .ToList();

    return new Report(
        scope,
        rows.Count,
        rows.Sum(o => o.Amount),
        rows.Count == 0 ? 0m : Math.Round(rows.Sum(o => o.Amount) / rows.Count, 2),
        byCategory.Count == 0 ? "" : byCategory[0].Category,
        byCategory);
}

// A static dictionary that outlives every request. In a real app someone
// writes exactly this, calls it "just a small cache", and moves on.
static class Cache
{
    public static readonly Dictionary<string, Report> Entries = new();
}

record Order(int Id, string Category, decimal Amount, string Month);
record CategoryTotal(string Category, decimal Total, int Count);
record Report(string Scope, int OrderCount, decimal Total, decimal Average, string TopCategory, List<CategoryTotal> ByCategory);
