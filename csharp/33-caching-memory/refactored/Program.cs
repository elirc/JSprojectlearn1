if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);

// IMemoryCache ships in the ASP.NET Core shared framework — no NuGet package.
// SizeLimit is the line the original was missing most: a cache that cannot be
// full is a dictionary that cannot be emptied. With a limit set, every entry
// must declare a Size (MemoryCacheStore gives each one 1), and the framework
// evicts the least valuable entries when the cache is full.
builder.Services.AddMemoryCache(options => options.SizeLimit = 128);

builder.Services.AddSingleton<ICacheStore, MemoryCacheStore>();
builder.Services.AddSingleton(new OrderStore());        // the 800ms "database"
builder.Services.AddSingleton<ReportService>();

var app = builder.Build();

// One report endpoint, not two. Caching is not a feature with its own URL —
// it is invisible from the outside, except that the answer arrives sooner.
app.MapGet("/report", (string? month, ReportService reports) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    var result = reports.Get(month);
    return Results.Ok(new
    {
        report = result.Report,
        cached = result.FromCache,
        ms = sw.ElapsedMilliseconds,
    });
});

// The write side does two things, and the second one is the whole lesson.
app.MapPost("/orders", (NewOrder dto, OrderStore orders, ReportService reports) =>
{
    if (string.IsNullOrWhiteSpace(dto.Category))
        return Results.BadRequest(new { error = "category is required" });
    if (string.IsNullOrWhiteSpace(dto.Month))
        return Results.BadRequest(new { error = "month is required (e.g. 2026-01)" });
    if (dto.Amount <= 0)
        return Results.BadRequest(new { error = "amount must be positive" });

    var order = orders.Add(dto.Category.Trim(), dto.Amount, dto.Month.Trim());
    reports.InvalidateFor(order.Month);     // <- the line the original never had
    return Results.Created($"/orders/{order.Id}", order);
});

// Proof that hits are free: hammer /report and watch these two stay put.
app.MapGet("/stats", (OrderStore orders, ReportService reports) => Results.Ok(new
{
    orders = orders.Count,
    databaseQueries = orders.Queries,
    reportsComputed = reports.Computations,
}));

app.Run("http://localhost:5033");

public record NewOrder(string? Category, decimal Amount, string? Month);
