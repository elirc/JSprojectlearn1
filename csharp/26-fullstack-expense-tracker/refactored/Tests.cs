// ExpenseBook is pure domain — money math with no HTTP attached — so the
// tests read like a spec of the business rules.
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("ExpenseBook");
        DecimalIsExactMoney();
        EmptyBook();
        SingleCategory();
        CategoriesRankAndSum();
        MonthFiltering();
        ValidationRejectsGarbage();
        RemoveRecomputesEverything();
        return Check.Summary();
    }

    static DateOnly Aug(int day) => new(2026, 8, day);

    static void DecimalIsExactMoney()
    {
        // js#63 needed integer cents because 0.1 + 0.2 !== 0.3 in floats.
        // C#'s decimal type IS exact for money — same lesson, built-in fix.
        Check.Equal(0.30m, 0.10m + 0.20m, "decimal adds money exactly (no 0.30000000000000004)");
        var book = new ExpenseBook();
        book.Add("coffee", "food", 0.10m, Aug(1));
        book.Add("gum", "food", 0.20m, Aug(2));
        Check.Equal(0.30m, book.Summarize().Total, "book totals stay exact too");
    }

    static void EmptyBook()
    {
        var summary = new ExpenseBook().Summarize();
        Check.Equal(0m, summary.Total, "empty book totals zero");
        Check.True(summary.BiggestCategory is null, "empty book has no biggest category");
        Check.Equal(0, summary.ByCategory.Count, "empty book has no category rows");
    }

    static void SingleCategory()
    {
        var book = new ExpenseBook();
        book.Add("lunch", "food", 12.50m, Aug(3));
        book.Add("dinner", "food", 20.00m, Aug(4));
        var summary = book.Summarize();
        Check.Equal(32.50m, summary.Total, "one category: total is the sum");
        Check.Equal(1, summary.ByCategory.Count, "one category: one row");
        Check.Equal("food", summary.BiggestCategory, "one category: it is the biggest");
        Check.Equal(32.50m, summary.ByCategory[0].Total, "the row carries the category sum");
    }

    static void CategoriesRankAndSum()
    {
        var book = new ExpenseBook();
        book.Add("lunch", "food", 10m, Aug(1));
        book.Add("bus", "transport", 3m, Aug(2));
        book.Add("rent", "housing", 800m, Aug(3));
        book.Add("dinner", "food", 25m, Aug(4));
        var summary = book.Summarize();
        Check.Equal("housing", summary.BiggestCategory, "biggest category wins by total");
        Check.Equal("housing,food,transport",
            string.Join(",", summary.ByCategory.Select(c => c.Category)),
            "categories are sorted by total, descending");
        // The js#63 anti-bug test: rows must add up to the headline number,
        // because both come from the same single computation.
        Check.Equal(summary.Total, summary.ByCategory.Sum(c => c.Total),
            "category rows always sum to the total");
    }

    static void MonthFiltering()
    {
        var book = new ExpenseBook();
        book.Add("july groceries", "food", 40m, new DateOnly(2026, 7, 30));
        book.Add("august groceries", "food", 55m, new DateOnly(2026, 8, 2));
        book.Add("august taxi", "transport", 15m, new DateOnly(2026, 8, 5));
        book.Add("last year", "food", 99m, new DateOnly(2025, 8, 5));
        Check.Equal(70m, book.Summarize(2026, 8).Total, "year+month keeps only that month");
        Check.Equal(40m, book.Summarize(2026, 7).Total, "a different month, a different answer");
        Check.Equal(169m, book.Summarize(month: 8).Total, "month alone spans every year");
        Check.Equal(209m, book.Summarize().Total, "no filter sees everything");
    }

    static void ValidationRejectsGarbage()
    {
        var book = new ExpenseBook();
        Check.Throws<ArgumentException>(() => book.Add("x", "food", 0m, Aug(1)), "zero amount is rejected");
        Check.Throws<ArgumentException>(() => book.Add("x", "food", -5m, Aug(1)), "negative amount is rejected");
        Check.Throws<ArgumentException>(() => book.Add("x", "  ", 5m, Aug(1)), "blank category is rejected");
        Check.Throws<ArgumentException>(() => book.Add(null, "food", 5m, Aug(1)), "missing description is rejected");
        Check.Equal(0, book.All.Count, "rejected expenses never enter the book");
        var kept = book.Add("  tea  ", " food ", 2m, Aug(1));
        Check.Equal("tea", kept.Description, "description is trimmed");
        Check.Equal("food", kept.Category, "category is trimmed");
    }

    static void RemoveRecomputesEverything()
    {
        // The original's bug: delete updated the list but not the cached
        // totals. Here there is no cache — remove, re-ask, get the truth.
        var book = new ExpenseBook();
        var lunch = book.Add("lunch", "food", 10m, Aug(1));
        book.Add("bus", "transport", 3m, Aug(2));
        Check.Equal(13m, book.Summarize().Total, "before: both expenses counted");
        Check.Equal(true, book.Remove(lunch.Id), "remove reports success");
        var after = book.Summarize();
        Check.Equal(3m, after.Total, "after: the total forgot the deleted expense");
        Check.Equal("transport", after.BiggestCategory, "biggest category moved too");
        Check.Equal(1, after.ByCategory.Count, "the emptied category row disappeared");
        Check.Equal(false, book.Remove(lunch.Id), "removing twice reports failure");
    }
}
