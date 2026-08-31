# 🏋️ Practice: Fullstack Expense Tracker

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Two more derived numbers (warm-up)

Add `int Count` and `decimal Average` to the `Summary` record, computed inside `Summarize` from the same scoped list every other number comes from. An empty period averages `0`, not a `DivideByZeroException`, and the average rounds to cents. Show them next to the headline total in `app.js`. Nothing gets stored — that is the whole point of this project.
*Practices:* the pure domain layer, guarding a division, `Math.Round` with an explicit rounding mode.
**Hint:** `count == 0 ? 0m : Math.Round(total / count, 2, MidpointRounding.AwayFromZero)` — `decimal` division by zero *does* throw, unlike `double`, so the guard is real. Note the average must respect the year/month filter, which it does for free if you derive it from `scoped`.
**Check offline:** add these Check tests to `Tests.cs` — all should pass:
```csharp
var book = new ExpenseBook();
book.Add("a", "food", 40m, new DateOnly(2026, 8, 1));   book.Add("b", "food", 55m, new DateOnly(2026, 8, 2));
book.Add("c", "transport", 15m, new DateOnly(2026, 8, 3));
Check.Equal(3, book.Summarize().Count, "Count is derived from the same list");
Check.Equal(36.67m, book.Summarize().Average, "110 / 3 rounds to 36.67");
Check.Equal(0, new ExpenseBook().Summarize().Count, "an empty book counts zero");
Check.Equal(0m, new ExpenseBook().Summarize().Average, "and averages zero instead of dividing by it");
```

### ⭐⭐ 2. A month-by-month rollup (core)

Add `IReadOnlyList<MonthTotal> ByMonth` to `Summary` (with `record MonthTotal(string Month, decimal Total)`, `Month` formatted `"2026-08"`), grouped from the same scoped list, newest month first. Render it in `app.js` as a second bar list under the categories. The invariant to assert is the one that killed the original: **month rows must sum to the total**, exactly like category rows do.
*Practices:* a second `GroupBy` over the same source, formatting a sort key so string ordering is date ordering, and re-using the anti-drift assertion.
**Hint:** `$"{e.Date.Year:D4}-{e.Date.Month:D2}"` zero-pads so `"2026-09"` sorts after `"2026-08"` — then `OrderByDescending(m => m.Month, StringComparer.Ordinal)`. Building the bars is the existing `renderSummary` loop with a different array.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var months = new ExpenseBook();
months.Add("july", "food", 40m, new DateOnly(2026, 7, 30));
months.Add("august", "food", 55m, new DateOnly(2026, 8, 2));   // same month as the taxi below
months.Add("taxi", "transport", 15m, new DateOnly(2026, 8, 5));
var s = months.Summarize();
Check.Equal("2026-08,2026-07", string.Join(",", s.ByMonth.Select(m => m.Month)), "newest month first");
Check.Equal(70m, s.ByMonth[0].Total, "each month sums its own expenses");
Check.Equal(s.Total, s.ByMonth.Sum(m => m.Total), "month rows always sum to the total");
Check.Equal(1, months.Summarize(2026, 7).ByMonth.Count, "a filtered summary rolls up only its scope");
```

### ⭐⭐ 3. Filter by category too (core)

Give `Summarize` a third optional parameter `string? category = null` (case-insensitive, trimmed, blank means all) and expose it as `GET /api/summary?category=food`. The trap is that a filter added in one place and forgotten in another is exactly the drift this project exists to prevent — so add the "rows sum to the total" assertion *under a category filter* to prove the new scope reaches every derived number.
*Practices:* composing filters in one pipeline, and testing an invariant under each new dimension.
**Hint:** one more `.Where(...)` in the `scoped` chain, before the grouping — every derived number is computed downstream of it, so they all pick up the filter with no further edits.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var cat = new ExpenseBook();
cat.Add("lunch", "food", 10m, new DateOnly(2026, 8, 1));   cat.Add("bus", "transport", 3m, new DateOnly(2026, 8, 2));
cat.Add("dinner", "Food", 25m, new DateOnly(2026, 8, 3));   // note the capital F
var food = cat.Summarize(category: "FOOD");
Check.Equal(35m, food.Total, "category matching is case-insensitive and trimmed");
Check.Equal(2, food.Count, "and Count follows the same scope");
Check.Equal(food.Total, food.ByCategory.Sum(c => c.Total), "rows still sum to the total under a filter");
Check.Equal(38m, cat.Summarize(category: "  ").Total, "a blank category means everything");
Check.Equal(0m, cat.Summarize(category: "yachts").Total, "an unused category totals zero");
```
Then `curl "http://localhost:5026/api/summary?category=food"`.

### ⭐⭐ 4. Fix a typo without deleting the row (core)

Add `Expense? Update(int id, string? description, string? category, decimal amount, DateOnly date)` returning `null` for an unknown id, plus `PUT /api/expenses/{id:int}` reusing the POST endpoint's date parsing and 400 handling. The rule that matters: `Update` must apply **exactly the same validation** as `Add` — extract the shared checks into one private method rather than copying three `if`s.
*Practices:* records and `with`, and refusing to duplicate validation (the sin the original committed with its summary math).
**Hint:** a private `static (string Description, string Category) Validate(string? d, string? c, decimal amount)` that trims, checks blanks and rejects `amount <= 0` — then both `Add` and `Update` call it first. Use `expenses.FindIndex(...)` and `expenses[index] = expenses[index] with { ... }`.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var edit = new ExpenseBook();  var lunch = edit.Add("lunch", "food", 10m, new DateOnly(2026, 8, 1));
var fixedUp = edit.Update(lunch.Id, "  lunch with sam  ", " food ", 12.50m, new DateOnly(2026, 8, 2));
Check.Equal("lunch with sam", fixedUp!.Description, "Update trims like Add does");
Check.Equal(12.50m, edit.Summarize().Total, "and the summary recomputes — no cache to forget");
Check.Equal(lunch.Id, fixedUp.Id, "the id is preserved");
Check.True(edit.Update(999, "x", "y", 1m, new DateOnly(2026, 8, 1)) is null, "unknown id returns null");
Check.Throws<ArgumentException>(() => edit.Update(lunch.Id, "x", "food", 0m, new DateOnly(2026, 8, 1)),
    "Update enforces the same amount rule as Add");
Check.Equal(12.50m, edit.Summarize().Total, "a rejected update changed nothing");
```
Then `curl -i -X PUT http://localhost:5026/api/expenses/1 -H "Content-Type: application/json" -d "{\"description\":\"lunch with sam\",\"category\":\"food\",\"amount\":12.5,\"date\":\"2026-08-02\"}"` → `200`, and a follow-up `curl http://localhost:5026/api/summary` shows the new total.

### ⭐⭐⭐ 5. Export to CSV, correctly (challenge)

Add `GET /api/expenses.csv` returning a downloadable CSV with a header row. The interesting part is not the loop — it is the escaping. A description containing a comma, a double quote, or a newline must survive a round trip through Excel, which means RFC 4180 rules: wrap the field in quotes and double every internal quote. Write `Csv.Escape(string?)` as a pure function and test it directly; make sure `decimal` formats with `InvariantCulture` so a German-locale server does not emit `12,50` into a comma-separated file.
*Practices:* a pure formatting function with nasty edge cases, `Results.Text` with a content type, and culture-invariant number formatting.
**Hint:** quote only when needed — `value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r')` — then `$"\"{value.Replace("\"", "\"\"")}\""`. Join rows with `\r\n` (the spec's line ending) and set `Content-Disposition` so browsers offer a filename.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
Check.Equal("plain", Csv.Escape("plain"), "ordinary text is left alone");
Check.Equal("\"a,b\"", Csv.Escape("a,b"), "a comma forces quoting");
Check.Equal("\"say \"\"hi\"\"\"", Csv.Escape("say \"hi\""), "quotes are doubled, then wrapped");
Check.Equal("\"two\nlines\"", Csv.Escape("two\nlines"), "newlines are quoted, not stripped");
Check.Equal("", Csv.Escape(null), "null becomes an empty field");
var exp = new ExpenseBook();  exp.Add("dinner, with \"friends\"", "food", 12.50m, new DateOnly(2026, 8, 1));
var csv = Csv.From(exp.All);
Check.True(csv.StartsWith("id,date,description,category,amount"), "there is a header row");
Check.True(csv.Contains("\"dinner, with \"\"friends\"\"\""), "the nasty description survived");
Check.True(csv.Contains(",12.50\r\n") || csv.Contains(",12.5\r\n"), "the amount used a dot, not a comma");
```
Then `curl -i http://localhost:5026/api/expenses.csv` → `200`, `Content-Type: text/csv; charset=utf-8`, a `Content-Disposition` header, and a body you can paste into a spreadsheet.

## Solutions

### 1. Two more derived numbers

```csharp
// ExpenseBook.cs — the record grows two members, Summarize two lines.
public record Summary(decimal Total, string? BiggestCategory,
                      IReadOnlyList<CategoryTotal> ByCategory, int Count, decimal Average);
var scopedList = scoped.ToList();          // materialise once; we read it twice now
var count = scopedList.Count;
var average = count == 0 ? 0m : Math.Round(total / count, 2, MidpointRounding.AwayFromZero);
return new Summary(total, biggest, byCategory, count, average);
```

```js
// app.js, in renderSummary — two more spans beside the headline total
document.querySelector('#count').textContent = `${summary.count} expenses`;
document.querySelector('#average').textContent = `avg ${money(summary.average)}`;
```

WHY: both numbers come out of the same `scoped` sequence as the total, so a month filter narrows all of them together and there is no third place to forget. `Math.Round`'s explicit `MidpointRounding` matters more than it looks: the default is banker's rounding (`0.125m` → `0.12`), which surprises people reading a money column, so state the intent. And `decimal` really does throw on divide-by-zero where `double` would hand you `NaN` — the guard is not defensive padding.

### 2. A month-by-month rollup

```csharp
// ExpenseBook.cs
public record MonthTotal(string Month, decimal Total);
// Summary grows one more member
public record Summary(decimal Total, string? BiggestCategory, IReadOnlyList<CategoryTotal> ByCategory,
                      int Count, decimal Average, IReadOnlyList<MonthTotal> ByMonth);
// inside Summarize, beside byCategory
var byMonth = scopedList
    .GroupBy(e => $"{e.Date.Year:D4}-{e.Date.Month:D2}")   // zero-padded: sorts as a date
    .Select(g => new MonthTotal(g.Key, g.Sum(e => e.Amount)))
    .OrderByDescending(m => m.Month, StringComparer.Ordinal).ToList();
```

```js
// app.js — the existing category loop, generalised so BOTH lists share it
function renderBars(target, rows, label) {
  target.innerHTML = '';
  const max = rows.length ? Math.max(...rows.map(r => r.total)) : 0;
  for (const row of rows) {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `${row[label]} — ${money(row.total)}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = `${max ? (row.total / max) * 100 : 0}%`;
    li.append(text, bar);
    target.appendChild(li);
  }
}
// renderSummary now calls it twice:
renderBars(byCategoryEl, summary.byCategory, 'category');
renderBars(byMonthEl, summary.byMonth, 'month');
```

WHY: `"2026-08"` is chosen so that *string* ordering equals *chronological* ordering — the same trick ISO 8601 exists for, and the reason `yyyy-MM-dd` beats `dd/MM/yyyy` for anything a computer sorts. The `D2` format specifier is what makes it work; `$"{Year}-{Month}"` would emit `"2026-8"`, which sorts after `"2026-10"`. On the client, noticing that two bar lists are the same function with different data is worth the refactor: two copies would drift the first time one gained a tooltip.

### 3. Filter by category too

```csharp
// ExpenseBook.cs
public Summary Summarize(int? year = null, int? month = null, string? category = null)
{
    var wanted = (category ?? "").Trim();
    var scopedList = expenses
        .Where(e => year is null || e.Date.Year == year.Value)
        .Where(e => month is null || e.Date.Month == month.Value)
        .Where(e => wanted.Length == 0 || string.Equals(e.Category, wanted, StringComparison.OrdinalIgnoreCase))
        .ToList();
    // ...everything downstream is unchanged and picks the filter up for free
}
// Program.cs
app.MapGet("/api/summary", (int? year, int? month, string? category, ExpenseBook book) =>
    Results.Ok(book.Summarize(year, month, category)));
```

WHY: the filter is applied once, upstream of every derivation, so the total, the category rows, the month rows, the count and the average all narrow together — you did not have to remember five places, because there is only one. That is the structural version of this project's lesson: the original's three copies of the summary math would have needed three copies of this filter, and one of them would have been forgotten. Asserting "rows sum to the total" again under the new filter is cheap insurance; that single assertion is what would catch a future filter applied to the grouping but not to the total.

### 4. Fix a typo without deleting the row

```csharp
// ExpenseBook.cs — Add's first two lines become one call; Update reuses it.
private static (string Description, string Category) Validate(string? description, string? category, decimal amount)
{
    var desc = Clean(description, "Description");
    var cat = Clean(category, "Category");
    if (amount <= 0) throw new ArgumentException("Amount must be greater than zero.");
    return (desc, cat);
}
public Expense? Update(int id, string? description, string? category, decimal amount, DateOnly date)
{
    var (desc, cat) = Validate(description, category, amount);   // SAME rules, one copy
    var index = expenses.FindIndex(e => e.Id == id);
    if (index < 0) return null;
    expenses[index] = expenses[index] with
        { Description = desc, Category = cat, Amount = amount, Date = date };
    return expenses[index];
}
// Program.cs — PUT is POST's body with an id and a 404 branch
app.MapPut("/api/expenses/{id:int}", (int id, NewExpenseRequest request, ExpenseBook book) =>
{
    if (!DateOnly.TryParseExact(request.Date, "yyyy-MM-dd", out var date))
        return Results.BadRequest(new ErrorResponse("Date must look like 2026-08-21."));
    if (request.Amount is null) return Results.BadRequest(new ErrorResponse("Amount is required."));
    try
    {
        var updated = book.Update(id, request.Description, request.Category, request.Amount.Value, date);
        return updated is null ? Results.NotFound(new ErrorResponse($"No expense with id {id}."))
                               : Results.Ok(updated);
    }
    catch (ArgumentException ex) { return Results.BadRequest(new ErrorResponse(ex.Message)); }
});
```

WHY: validating *before* looking up the id is deliberate — a request that is malformed is malformed whether or not the row exists, and doing it in that order also means a bad update can never leave the book half-changed. Extracting `Validate` is the same anti-duplication move the whole project is about, one level down: the original's bug was three copies of the summary math, and "two copies of the validation" is exactly how that starts. The summary needs no attention at all here, because there is still nothing stored to update.

### 5. Export to CSV, correctly

```csharp
// Csv.cs — needs `using System.Globalization;`
public static class Csv
{
    /// RFC 4180: quote a field only when it contains a comma, a quote or a
    /// line break — and double every internal quote.
    public static string Escape(string? field)
    {
        var value = field ?? "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
    public static string From(IEnumerable<Expense> expenses)
    {
        var lines = new List<string> { "id,date,description,category,amount" };
        foreach (var e in expenses)
            lines.Add(string.Join(",", e.Id, Escape(e.Date.ToString("yyyy-MM-dd")),
                Escape(e.Description), Escape(e.Category),
                e.Amount.ToString(CultureInfo.InvariantCulture)));   // 12.50, never 12,50
        return string.Join("\r\n", lines) + "\r\n";
    }
}
// Program.cs
app.MapGet("/api/expenses.csv", (ExpenseBook book, HttpContext ctx) =>
{
    ctx.Response.Headers.ContentDisposition = "attachment; filename=\"expenses.csv\"";
    return Results.Text(Csv.From(book.All), "text/csv", System.Text.Encoding.UTF8);
});
```

WHY: naive CSV export is one of the most reliably broken features in software, and both bugs are here. The first is escaping: a single comma inside a description silently shifts every later column, producing a file that *opens* fine and is quietly wrong — the same failure mode as the original's stale cache. The second is culture: `12.50m.ToString()` on a machine with a German locale emits `"12,50"`, adding a phantom column to a comma-separated file, which is why anything written for a *machine* to read must say `InvariantCulture` while anything shown to a human should not. Keeping `Escape` a pure static function is what lets you test the ugly cases directly instead of squinting at a downloaded file — and quoting only when necessary keeps the common case readable, exactly as the spec intends.
