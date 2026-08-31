// The single source of truth: the expense LIST is the data, every summary
// number is DERIVED from it, fresh, on demand. No caches, so there is
// nothing to forget to update. (react#09's "compute, don't store", now
// server-side.)

public record Expense(int Id, string Description, string Category, decimal Amount, DateOnly Date);

public record CategoryTotal(string Category, decimal Total);

public record Summary(decimal Total, string? BiggestCategory, IReadOnlyList<CategoryTotal> ByCategory);

public class ExpenseBook
{
    private readonly List<Expense> expenses = new();
    private int nextId = 1;

    public IReadOnlyList<Expense> All => expenses;

    public Expense Add(string? description, string? category, decimal amount, DateOnly date)
    {
        var desc = Clean(description, "Description");
        var cat = Clean(category, "Category");
        if (amount <= 0)
            throw new ArgumentException("Amount must be greater than zero.");
        var expense = new Expense(nextId, desc, cat, amount, date);
        nextId++;
        expenses.Add(expense);
        return expense;
    }

    public bool Remove(int id) => expenses.RemoveAll(e => e.Id == id) > 0;

    // EVERY summary number comes from this one method. The page, the API,
    // the tests — all callers get answers computed from the same list by the
    // same code, so they cannot disagree.
    public Summary Summarize(int? year = null, int? month = null)
    {
        var scoped = expenses
            .Where(e => year is null || e.Date.Year == year.Value)
            .Where(e => month is null || e.Date.Month == month.Value);

        var byCategory = scoped
            .GroupBy(e => e.Category)                                  // cs#04's LINQ pipeline
            .Select(g => new CategoryTotal(g.Key, g.Sum(e => e.Amount)))
            .OrderByDescending(c => c.Total)
            .ThenBy(c => c.Category)                                   // stable order on ties
            .ToList();

        var total = byCategory.Sum(c => c.Total);
        var biggest = byCategory.Count > 0 ? byCategory[0].Category : null;
        return new Summary(total, biggest, byCategory);
    }

    private static string Clean(string? value, string label)
    {
        var cleaned = (value ?? "").Trim();
        if (cleaned.Length == 0)
            throw new ArgumentException($"{label} cannot be blank.");
        return cleaned;
    }
}
