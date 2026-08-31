#:sdk Microsoft.NET.Sdk.Web
// Expense tracker — the version where the numbers disagree.
//
// Run from the repo root:
//   dotnet run csharp/26-fullstack-expense-tracker/original.cs
// then open http://localhost:5026 in a browser.
//
// It works — add a few expenses and every number looks right. Now DELETE
// one and compare three answers to "how much did I spend?":
//   the page itself, /api/summary, and /api/stats.
// Two of them recompute from the list. One reads a cache that add updates
// and delete forgot about. They will never agree again.

var expenses = new List<Expense>();
var nextId = 1;

// "For performance", running totals are kept up to date as expenses come in,
// so /api/stats never has to loop. Remember this decision — it's the bug.
var cachedTotal = 0m;
var cachedByCategory = new Dictionary<string, decimal>();

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// ---- the web page --------------------------------------------------------

app.MapGet("/", () =>
{
    // Summary math, copy #1: recomputed here with loops.
    var total = 0m;
    var monthTotal = 0m;
    var byCategory = new Dictionary<string, decimal>();
    var thisMonth = DateTime.Now.ToString("yyyy-MM");
    var rows = "";
    foreach (var e in expenses)
    {
        total += e.Amount;
        if (e.Date.StartsWith(thisMonth)) monthTotal += e.Amount;
        if (!byCategory.ContainsKey(e.Category)) byCategory[e.Category] = 0;
        byCategory[e.Category] += e.Amount;
        rows += $"<tr><td>{e.Date}</td><td>{e.Description}</td><td>{e.Category}</td>"
            + $"<td align='right'>{e.Amount:0.00}</td>"
            + "<td><form method='post' action='/delete' style='display:inline'>"
            + $"<input type='hidden' name='id' value='{e.Id}'>"
            + "<button>x</button></form></td></tr>";
    }
    // Biggest category, also copy #1.
    var biggest = "";
    var biggestAmount = 0m;
    foreach (var pair in byCategory)
        if (pair.Value > biggestAmount) { biggest = pair.Key; biggestAmount = pair.Value; }
    var cats = "";
    foreach (var pair in byCategory)
        cats += $"<li>{pair.Key}: {pair.Value:0.00}</li>";

    var html = $$"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Expenses (original)</title></head>
        <body>
          <h1>Expenses</h1>
          <form method="post" action="/add">
            <input name="description" placeholder="what">
            <input name="category" placeholder="category">
            <input name="amount" placeholder="amount">
            <input name="date" type="date">
            <button>Add</button>
          </form>
          <table border="1" cellpadding="4">
            <tr><th>date</th><th>what</th><th>category</th><th>amount</th><th></th></tr>
            {{rows}}
          </table>
          <h2>Summary</h2>
          <p>Total: {{total:0.00}} &middot; This month: {{monthTotal:0.00}} &middot; Biggest category: {{biggest}}</p>
          <ul>{{cats}}</ul>
          <p>API: <a href="/api/summary">/api/summary</a> &middot; <a href="/api/stats">/api/stats</a></p>
        </body>
        </html>
        """;
    return Results.Content(html, "text/html");
});

app.MapPost("/add", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    decimal.TryParse(form["amount"].ToString(), out var amount);   // "abc" → 0, silently
    var e = new Expense
    {
        Id = nextId,
        Description = form["description"].ToString(),
        Category = form["category"].ToString(),
        Amount = amount,
        Date = form["date"].ToString(),
    };
    nextId++;
    expenses.Add(e);
    // keep the caches fresh (add remembered to)
    cachedTotal += amount;
    if (!cachedByCategory.ContainsKey(e.Category)) cachedByCategory[e.Category] = 0;
    cachedByCategory[e.Category] += amount;
    ctx.Response.Redirect("/");
});

app.MapPost("/delete", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var id = int.Parse(form["id"].ToString());
    expenses.RemoveAll(e => e.Id == id);
    ctx.Response.Redirect("/");
});

// ---- the JSON API --------------------------------------------------------

app.MapGet("/api/expenses", () => expenses);

app.MapGet("/api/summary", () =>
{
    // Summary math, copy #2: the same loops again, typed out a second time.
    var total = 0m;
    var monthTotal = 0m;
    var byCategory = new Dictionary<string, decimal>();
    var thisMonth = DateTime.Now.ToString("yyyy-MM");
    foreach (var e in expenses)
    {
        total += e.Amount;
        if (e.Date.StartsWith(thisMonth)) monthTotal += e.Amount;
        if (!byCategory.ContainsKey(e.Category)) byCategory[e.Category] = 0;
        byCategory[e.Category] += e.Amount;
    }
    var biggest = "";
    var biggestAmount = 0m;
    foreach (var pair in byCategory)
        if (pair.Value > biggestAmount) { biggest = pair.Key; biggestAmount = pair.Value; }
    return Results.Ok(new { total, monthTotal, biggest, byCategory });
});

app.MapGet("/api/stats", () =>
{
    // Summary math, copy #3: no loops! Just read the cache. So fast. So wrong
    // the moment anyone deletes an expense.
    return Results.Ok(new { total = cachedTotal, byCategory = cachedByCategory });
});

app.Run("http://localhost:5026");

class Expense
{
    public int Id { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal Amount { get; set; }
    public string Date { get; set; } = "";   // "2026-08-21", or whatever the form sent
}
