# 📘 Learning Guide: Fullstack Expense Tracker

Read this before or alongside the README — it teaches the concepts, then shows why "just cache the total" is how apps start lying to their users.

## 1. What are we building?

An expense tracker: add expenses (what, category, amount, date), delete them, and see a summary — total spent, spending per category, and which category is the biggest. You built this in the browser in js#63; this version moves the data and the math to an ASP.NET Core server, with a vanilla-JS page rendering a list panel and a summary panel side by side.

The star of this project isn't the tracker. It's a question: **when two parts of the screen show numbers about the same data, what guarantees they agree?** The original answers "hope". The refactor answers "they're computed by the same code from the same list, every time".

## 2. Concepts you need first

### Stored data vs derived data
**Stored** data is what you were told: "coffee, food, 3.50, Aug 21". **Derived** data is what you can figure out from it: the total, the per-category sums, the biggest category. The rule from react#09, now on the server: *store the facts, compute the conclusions.* Every derived value you store is a copy that must be manually kept in sync with the truth — forever, at every place the truth changes.

### Why caches go stale
A cache is a stored copy of a computed answer, kept "for speed":

```csharp
cachedTotal += amount;          // add updates it ✓
expenses.RemoveAll(...);        // delete forgets it ✗ — stale forever
```

The failure mode is structural, not careless: *every* mutation site must update *every* cache. Add one new mutation (edit an amount? import a CSV?) and every cache silently becomes a liability. The fix is to not have the cache.

### `decimal` — C#'s built-in money type
JavaScript has one number type (binary floating point), so js#63 had to store integer cents to avoid `0.1 + 0.2 === 0.30000000000000004`. C# has `decimal`: a base-10 number type built for money.

```csharp
double  d = 0.10 + 0.20;    // 0.30000000000000004  (same problem as JS)
decimal m = 0.10m + 0.20m;  // exactly 0.30         (the m suffix = decimal)
```

Same lesson, better tool. Rule of thumb: `double` for physics, `decimal` for invoices.

### `DateOnly`
A date with no time-of-day attached — exactly what an expense needs. `new DateOnly(2026, 8, 21)` has real `.Year` and `.Month` properties, so "is this in August 2026?" is two comparisons, not string surgery like the original's `e.Date.StartsWith("2026-08")`. It serializes to/from JSON as `"2026-08-21"`, which happens to be exactly what HTML's `<input type="date">` produces.

### LINQ `GroupBy` (recap of cs#04)
The whole summary is one pipeline:

```csharp
expenses
    .GroupBy(e => e.Category)                                   // buckets by name
    .Select(g => new CategoryTotal(g.Key, g.Sum(e => e.Amount)))// one row per bucket
    .OrderByDescending(c => c.Total);                           // biggest first
```

`GroupBy` produces one group per distinct key; `g.Key` is the category name and the group itself is the expenses in it. Compare with the original's manual `Dictionary` + `ContainsKey` dance — same result, but the pipeline has no bookkeeping to get wrong.

### Query strings
`GET /api/summary?year=2026&month=8` — the part after `?` is the **query string**: optional name=value filters. In a minimal API, declaring parameters `(int? year, int? month)` makes ASP.NET Core read them from there automatically; missing ones arrive as `null`. Nullable ints (`int?`, cs#05) are a perfect fit for "filter or no filter".

### Parsing strictly at the boundary
Input arrives as text and must be checked *at the door* (js#31's rule): `DateOnly.TryParseExact(text, "yyyy-MM-dd", out var date)` accepts exactly one format and reports failure as a `bool` instead of throwing. And because amounts travel as JSON *numbers* (not form text), there's no culture problem: JSON's number format is universal, while the original's `decimal.TryParse(form["amount"])` means whatever the server's OS locale says it means.

## 3. Walking through the original code

The state, near the top:

```csharp
var expenses = new List<Expense>();
var cachedTotal = 0m;
var cachedByCategory = new Dictionary<string, decimal>();
```

One real list — and two shadows of it. Now count the places that compute a summary:

**Copy #1**, in `GET /`: a `foreach` accumulating `total`, `monthTotal`, and `byCategory`, plus a second loop to find the biggest category, all interleaved with HTML string building.

**Copy #2**, in `GET /api/summary`: the *same* loops, typed out again. Read them side by side — are they identical? Are you sure? That's the maintenance job the duplication just created.

**Copy #3**, in `GET /api/stats`: no loops — it returns `cachedTotal` and `cachedByCategory`, the shadows.

And the mutations:

```csharp
app.MapPost("/add", ...)      // updates expenses AND both caches ✓
app.MapPost("/delete", ...)   // expenses.RemoveAll(...) — and nothing else ✗
```

`/delete` is not evil, just ordinary. Whoever wrote `/add` knew about the caches; whoever added `/delete` later didn't. **This is the bug**: from the first delete onward, `/api/stats` reports expenses that no longer exist, forever.

Also worth a wince: `Date` is a `string`, "this month" is `StartsWith`, and a garbage amount silently becomes `0m` because the `TryParse` result is never checked.

## 4. What's wrong with it (in beginner terms)

**1. Three copies of the math.** Any change — "exclude refunds", "round to whole euros" — must now be made three times. Miss one and the app disagrees with itself. You will miss one; the compiler won't help, and there are no tests to catch it because the math lives inside endpoints.

**2. The cache lies after every delete.** Stored derived data doesn't fail loudly — it fails by *quietly showing yesterday's answer*. Users trust the number on screen; a wrong number is worse than an error page.

**3. The boundaries are made of string.** String dates, culture-dependent number parsing, no validation. Every one of these "works" in a demo and corrupts data in month two (js#63 called this "apps rot at their boundaries").

## 5. Try it yourself first!

Fix the original before peeking. Hints, vaguest first:

1. 🌱 How many places compute a total? What's the smallest number of places that could?
2. 🌿 Delete `cachedTotal` and `cachedByCategory` entirely. Make `/api/stats` and the page call the same code `/api/summary` uses. Does anything still disagree after a delete? Can it?
3. 🌳 Pull the list and the math into an `ExpenseBook` class: `Add` (validate!), `Remove`, `Summarize()`. Use `decimal`, `DateOnly`, and one LINQ pipeline. No `HttpContext` inside.
4. 🍎 Write the test js#63 taught you: after any adds/removes, the category rows must sum to exactly the total. Then write the delete-then-summarize test the original would fail.

## 6. Understanding the refactored solution

**The backend** (`ExpenseBook.cs`) stores exactly one thing — `List<Expense>` — and answers every question by reading it:

```csharp
public Summary Summarize(int? year = null, int? month = null)
{
    var scoped = expenses
        .Where(e => year is null || e.Date.Year == year.Value)
        .Where(e => month is null || e.Date.Month == month.Value);
    var byCategory = scoped
        .GroupBy(e => e.Category)
        .Select(g => new CategoryTotal(g.Key, g.Sum(e => e.Amount)))
        .OrderByDescending(c => c.Total).ThenBy(c => c.Category)
        .ToList();
    var total = byCategory.Sum(c => c.Total);
    ...
}
```

Look what fell out of this shape *for free*: the total is the sum of the category rows **by construction** (they're computed from each other, not independently), "biggest category" is just the first row after sorting, and month filtering is two `Where` clauses instead of a fourth copy of the loops. Delete an expense? The next `Summarize()` call reads the shorter list. There is no cache to forget, so there is no stale-cache bug — the whole *category* of bug is gone, not fixed.

`Add` guards the door: blank description/category throw, `amount <= 0` throws, and the endpoint turns those `ArgumentException`s into 400s with readable messages. The `ThenBy(c => c.Category)` matters too: when two categories tie, the order is still deterministic — tests hate coin flips.

**The endpoints** (`Program.cs`) contain zero math. `GET /api/summary` is literally `book.Summarize(year, month)`. When endpoints are one line, the question "do the endpoints agree?" stops existing.

**The frontend** (`wwwroot/app.js`) applies the same law to the screen. After *any* change:

```js
const [expenses, summary] = await Promise.all([
  api('/api/expenses'),
  api(summaryUrl()),
]);
renderList(expenses);
renderSummary(summary);
```

Both panels re-render together from one fetch round. The list never computes its own total; the summary panel never counts rows. `Promise.all` (js#42) runs both requests concurrently. The month filter is UI-only state: it changes which query string `summaryUrl()` builds, and the server does the filtering — one more thing the client can't get wrong.

One honest note in the code: JSON numbers become JS floats in the browser. That's fine *because the client never does money math* — it only formats for display. The arithmetic all happens server-side in `decimal`. Deciding which side owns which job is the fullstack skill this track keeps drilling.

## 7. Words you learned (glossary)

- **Derived data** — values computable from stored data (totals, counts, "biggest").
- **Single source of truth** — the one place a fact lives; everything else derives from it.
- **Cache** — a stored copy of a computed answer; fast, and stale the moment you forget one update site.
- **Stale** — showing an old answer after the underlying data changed.
- **`decimal`** — C#'s exact base-10 number type; use it for money (`0.10m`, note the `m`).
- **`DateOnly`** — a date without a time; real `.Year`/`.Month` instead of string slicing.
- **`GroupBy`** — LINQ operator that buckets items by a key; one group per distinct key.
- **Query string** — optional `?name=value` filters on a URL, bound to nullable parameters.
- **`TryParseExact`** — strict parsing: one format, `bool` result, no exceptions, no surprises.
- **Culture** — the OS locale that changes how text like `"12.5"` parses; JSON numbers sidestep it.
- **`Promise.all`** — run several fetches concurrently, wait for all (js#42).
- **Boundary** — where outside data enters your app; where validation belongs.

## 8. Experiments to try on the plane (no internet needed)

Start the refactor (`dotnet run --project csharp/26-fullstack-expense-tracker/refactored`), open http://localhost:5026.

1. **Reproduce the original's bug — and fail.** Add three expenses, delete one, then visit http://localhost:5026/api/summary in another tab. Expected: it matches the page exactly, always. Then run the *original* and repeat, comparing `/api/summary` with `/api/stats` after the delete: stats still counts the ghost.
2. **The exact-money proof.** Add expenses of 0.10 and 0.20 in one category. Expected total: exactly `0.30`. The test suite checks the same thing in `decimal` (`DecimalIsExactMoney`) — and js#63's LEARN.md shows what floats did instead.
3. **Try to sneak garbage in.** In DevTools console: `(await fetch('/api/expenses', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({description:'x', category:'food', amount:-5, date:'2026-08-21'})})).status` → expected `400`. Try `date:'21/08/2026'` → also 400. The book stays clean.
4. **Month filtering.** Add expenses with dates in two different months (edit the date field), then use the Month filter box. Expected: total and categories change; "All time" brings everything back. Watch the Network tab — the summary URL grows `?year=...&month=...`.
5. **Break the sum test on purpose.** In `Summarize`, change `var total = byCategory.Sum(c => c.Total);` to `expenses.Sum(e => e.Amount)` (ignoring the filter scope). Run `-- test`. Expected: month-filtering tests fail — the total would count expenses the rows don't show. That's the panels-disagree bug, caught by a test instead of a user.
6. **Add a cache, feel the trap.** Add a `private decimal cachedTotal` to `ExpenseBook`, update it in `Add`, return it from `Summarize`. Run `-- test`: the remove test fails immediately. You just re-created the original's bug under alarm bells — notice how the *tests* encode the "compute, don't store" law.
