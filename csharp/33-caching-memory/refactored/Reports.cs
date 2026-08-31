// The DOMAIN, and nothing else. No cache, no clock, no HTTP, no database —
// just "given these orders, what does the report say?".
//
// This separation is the whole reason caching is testable here. A cache is an
// optimisation *wrapped around* a computation; if the computation is tangled
// up with the cache, you can never answer "is the number right?" separately
// from "was it a hit or a miss?". Keep the math pure and both questions get
// easy answers.

public record Order(int Id, string Category, decimal Amount, string Month);

public record CategoryTotal(string Category, decimal Total, int Count);

public record Report(
    string Scope,
    int OrderCount,
    decimal Total,
    decimal Average,
    string TopCategory,
    IReadOnlyList<CategoryTotal> ByCategory);

public static class Reports
{
    /// Pure: same orders in, same report out, every time. No side effects,
    /// nothing to mock, and — crucially for a cached value — SAFE TO SHARE,
    /// because a `record` of `record`s cannot be mutated by whoever holds it.
    public static Report Build(IReadOnlyList<Order> orders, string? month)
    {
        var rows = month is null
            ? orders
            : orders.Where(o => o.Month == month).ToList();

        var byCategory = rows
            .GroupBy(o => o.Category)
            .Select(g => new CategoryTotal(g.Key, g.Sum(o => o.Amount), g.Count()))
            .OrderByDescending(c => c.Total)
            .ThenBy(c => c.Category)          // ties broken by name: deterministic output
            .ToList();

        var total = rows.Sum(o => o.Amount);

        return new Report(
            Scope: month ?? "all",
            OrderCount: rows.Count,
            Total: total,
            Average: rows.Count == 0 ? 0m : Math.Round(total / rows.Count, 2),
            TopCategory: byCategory.Count == 0 ? "" : byCategory[0].Category,
            ByCategory: byCategory);
    }
}
