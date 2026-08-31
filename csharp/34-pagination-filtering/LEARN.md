# 📘 Learning Guide: Pagination & Filtering

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A product catalogue API. There are 10,000 products, and a client — a web page, a phone app, another service — wants to show them twenty at a time, sorted how the user asked, filtered by whatever they typed in the search box.

That is it. It sounds like the most boring endpoint in the world, and it is also the endpoint that every real application has several of, gets wrong in the same three ways, and only notices when the table has grown past the size where "just send everything" was survivable.

Both versions run on `http://localhost:5034`. The original will hand you a megabyte of JSON and four different ways to make it return a 500. The refactor returns twenty items and cannot be made to crash from the address bar.

You have met pieces of this before: js#36 and cs#04 taught `Where`/`OrderBy`/`Select`, cs#17 taught binding query strings into typed parameters, and cs#16 taught what an endpoint owes its caller. This project is those three lessons meeting a table that got big.

## 2. Concepts you need first

### Pagination, and why it isn't optional

**Pagination** is returning a *page* of results — a small window — instead of everything. The window is described by two numbers:

- **page** — which window (1, 2, 3…)
- **pageSize** (or *limit*, or *per page*) — how many items in it

The cost of not paginating is paid four times over, and it is worth walking through all four because "it's only a megabyte" hides them:

1. **The database** reads 10,000 rows instead of 20.
2. **The server** turns 10,000 objects into a megabyte of JSON text, holding all of it in memory at once.
3. **The network** carries that megabyte — over a phone connection on a train, that is seconds.
4. **The client** parses the megabyte and builds 10,000 JavaScript objects, on the UI thread, so it can render 20 of them.

And all four costs grow with the table. The code does not change; it just quietly gets worse, until one day the catalogue is 500,000 products and the app "randomly" crashes on some phones.

### Offset pagination and the skip/take arithmetic

The classic approach — the one this project builds — is **offset pagination**: skip some items, take some items.

```csharp
ordered.Skip((page - 1) * pageSize).Take(pageSize)
```

Stare at `(page - 1)`. That is the entire off-by-one lesson:

| page | `(page - 1) * 20` | items you get |
|------|-------------------|---------------|
| 1    | 0                 | 1st – 20th    |
| 2    | 20                | 21st – 40th   |
| 3    | 40                | 41st – 60th   |

The original wrote `page * 20`, which makes `?page=0` the first page. Both conventions are internally consistent; the problem is that every REST API in the world counts pages from 1, so every client written against the original is off by twenty products and nobody finds out until a customer complains.

In JS you have written the same line: `arr.slice((page - 1) * size, page * size)`. Same arithmetic, same trap.

### The page count, without floating point

How many pages do 25 items make at 10 per page? Three — two full and one with five left over. That is **ceiling division**:

```csharp
var totalPages = totalItems == 0 ? 0 : (totalItems + pageSize - 1) / pageSize;
```

`(25 + 9) / 10 = 3`. The `+ pageSize - 1` trick rounds up using only integers. You could write `(int)Math.Ceiling(25 / 10.0)`, and it works — but it converts to `double` and back, and doubles in counting arithmetic is how you end up one page short at exactly one input you never tested. Integers only, when the answer is a count.

Note also `totalItems == 0 ? 0` — zero items is **zero pages**, not one empty page. It is the kind of edge case that has no obviously right answer until you write the test and pick one.

### The response envelope

The original returned a bare array. The refactor returns:

```json
{ "items": [...], "page": 2, "pageSize": 20, "totalItems": 10000, "totalPages": 500 }
```

This is called an **envelope**: the payload plus metadata about the payload. Without it, the client cannot render "Page 2 of 500", cannot disable the Next button on the last page, and cannot tell "this page is empty because you went past the end" from "this page is empty because nothing matched". With it, all three are arithmetic.

### Total order: why sorting and paging are the same problem

Here is the subtle one, and it is genuinely the most valuable idea in this project.

Suppose ten products all cost £10.00 and you sort by price. Which of them is 4th? The sort does not say — they are *tied*, and an unspecified order is free to differ between two runs.

Now page through it. Request page 1: the database (or LINQ, or the sort in whatever layer) puts them in one order. Request page 2: nothing guarantees it uses the *same* order. A product that was 20th on page 1's ordering might be 21st on page 2's — so it appears on both pages. Another might move the other way and appear on neither.

The fix is to make the ordering **total**: every item has exactly one position, with no ties left over. You do that by adding a tie-breaker on something unique:

```csharp
products.OrderBy(p => p.Price).ThenBy(p => p.Id)
```

Now equal prices are ordered by id, ids are unique, and the sequence is fully determined. The pages **tile** the result set — each item in exactly one page, no gaps, no duplicates.

This bug is nasty because it is invisible on small data (LINQ's `OrderBy` happens to be stable, so you may never see it locally) and shows up under a real database with parallel query plans. Write the tie-break every time. It costs one clause.

### Filtering on the server

**Filtering** is narrowing which items are in the result at all. The rule that makes the original wrong is simple:

> Filter before you paginate, and filter on the server.

Filtering *after* paginating gives you "page 1 of everything, then hide most of it" — a page with three items and a page 2 with none. Filtering on the *client* means you shipped everything anyway, which is the cost you were trying to avoid.

The order is always **filter → sort → slice**, and it matters: sorting before filtering wastes work, and slicing before either produces nonsense.

### Whitelists, and why `?sort=` is a security question

The original did this:

```csharp
var prop = typeof(Product).GetProperty(sort);      // sort comes from the URL
products.OrderBy(p => prop!.GetValue(p))
```

It works, and it is a trap with two doors. The small one: an unknown name gives `null` and the next line throws — `?sort=pirce` is a typo answered with a stack trace. The large one: *every property on `Product` is now part of your public API*. Add an internal `CostPrice` next year and a stranger can sort by it, which means they can binary-search your margins with a query string. You did not decide to expose it; reflection decided for you.

A **whitelist** inverts that. Name the allowed values explicitly, and let everything else be an error:

```csharp
public static readonly IReadOnlyList<string> SortFields = ["id", "name", "price", "stock"];

IOrderedEnumerable<Product> ordered = (field, descending) switch
{
    ("price", false) => products.OrderBy(p => p.Price),
    // ...
};
```

The switch *is* the whitelist. There is no path from a client string to a member. This is the same instinct as SQL parameterisation: never let user input choose *what code runs*, only *what data it runs on*.

### Clamp or reject? The rule

Both are ways to handle bad input, and picking wrongly is how APIs become annoying or dangerous:

- **Clamp** when there is exactly one thing the user could have meant. `?page=-3` obviously means the first page. Nobody typed -3 hoping for an error.
- **Reject** (400) when there isn't. `?sort=pirce` might mean `price`, or might mean the client has a bug — and returning *some* order pretends to have answered a question you did not understand. Silently wrong data is worse than a loud error.

`?pageSize=100000` is the case that teaches the rule. The intent is obvious ("everything"), so clamping is honest — but clamping to a **cap** rather than honouring it, because the whole point of the endpoint is that the server decides how much work it will do. A cap is not a limitation on the caller; it is the server declining to be talked into a denial of service by a query string.

### Typed parameters do validation for free

```csharp
app.MapGet("/products", (int? page, int? pageSize, string? sort, string? search, ...) => ...);
```

Because `page` is `int?` rather than `string`, ASP.NET Core parses it *before* your lambda runs and answers `?page=abc` with a 400 by itself. That is cs#17's model-binding lesson paying rent: no `int.Parse`, no `try`/`catch`, no possible `FormatException`. The type is the validator, and it cannot be forgotten.

## 3. Walking through the original code

The whole-table endpoint, with its defence in the comments:

```csharp
app.MapGet("/products", () =>
{
    var json = JsonSerializer.Serialize(products);
    Console.WriteLine($"[/products] serialized {json.Length:N0} bytes for ONE request");
    return Results.Text(json, "application/json");
});
```

Run it and watch the console. About a million bytes, per request, regardless of who is asking or what they wanted.

The paging attempt:

```csharp
var raw = ctx.Request.Query["page"].ToString();
var page = raw.Length == 0 ? 0 : int.Parse(raw);        // FormatException on junk
var start = page * 20;                                   // off by one page
var slice = products.GetRange(start, Math.Min(20, products.Count - start));
```

Line by line: hand-rolled parsing that throws on anything non-numeric; an offset that makes page 0 the first page; and `GetRange`, which throws `ArgumentOutOfRangeException` for a negative start (`?page=-1`) *and* for a start past the end (`?page=9999`). Three unhandled exceptions, three 500s, all reachable from a browser address bar.

And the sort:

```csharp
var prop = typeof(Product).GetProperty(sort);
return Results.Ok(products.OrderBy(p => prop!.GetValue(p)).Take(20));
```

That `!` is the null-forgiving operator from cs#05 — "trust me, it's not null" — applied to a value that came from the internet.

## 4. What's wrong with it (in beginner terms)

**1. It sends everything, and the comment says that's fine.** The team's position, recorded in the file, is that the frontend will filter. That converts a server-side `Where` — which a database does in milliseconds over an index — into a megabyte download and 10,000 objects on a phone, per keystroke. The user sees a spinner and blames their connection. This is not a performance nitpick; it is the difference between an app that works on a train and one that doesn't.

**2. Page 1 skips twenty products.** Not a crash. Not an error. Just twenty products that no client counting from 1 will ever see, discovered eventually by a customer asking why they can't find something. Off-by-ones do not fail loudly; they hand you *plausible* data.

**3. Four different query strings return 500.** A 500 means "the server is broken". These aren't — the *request* was malformed, which is a 400. Getting this backwards matters operationally: your alerting fires on 500s, so a bored crawler sending `?page=abc` looks exactly like an outage.

**4. Reflection turned the class into the API.** Nobody decided that `Product`'s property names would be publicly enumerable and sortable. `GetProperty(sort)` decided it, silently, and it will keep deciding it for every property anyone adds.

**5. The client can't tell where it is.** A bare array of twenty. Are there more? Only one way to find out: ask for the next page and see whether you get a 500.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Every crash in this file comes from trusting a string from the URL. What if the *types* of the endpoint's parameters did the parsing instead of your code?
2. 🌿 Collect the four knobs — page, pageSize, sort, search — into one record. Write a function that turns four nullable, possibly-hostile inputs into a valid one, and make sure it *cannot throw*. Decide for each knob: clamp, or reject?
3. 🌳 Write `Slice<T>(IReadOnlyList<T> ordered, PageRequest request)` returning items *plus* `totalItems` and `totalPages`. Test it at the boundaries before wiring it up: page 1, the last partial page, one page past the end, an empty source, and a page number so big the multiplication overflows.
4. 🍎 Replace the reflection sort with a `switch` over allowed field names, and put `ThenBy(p => p.Id)` on the end of every branch. Then write a test that walks *every* page and asserts each product appeared exactly once — that test is the one that would have caught the tie-break bug.

## 6. Understanding the refactored solution

**`Product.cs`** — the record, plus a `ProductCatalog` that takes its products as a constructor argument. Tests build a five-product catalogue with hand-picked prices (including a deliberate tie); the app calls `ProductCatalog.Seeded()`.

**`PageRequest.cs`** — the policy, stated in a comment before any code, then implemented as two pure functions. `Validate` returns *all* problems at once (cs#17's shape) and only complains about the sort field. `Normalize` is a **total function**: every possible input maps to a valid `PageRequest`, so there is no query string that can produce an exception.

```csharp
var normalizedPage = page is null || page < 1 ? 1 : page.Value;
var normalizedSize = pageSize is null ? DefaultPageSize : Math.Clamp(pageSize.Value, 1, MaxPageSize);
var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
```

That last line does quiet work: `null`, `""`, and `"   "` all become `null`, so downstream code has one "no search" value to check instead of four.

**`Paginator.cs`** — generic, because slicing has nothing to do with products, and the interesting line is the `long`:

```csharp
long skip = (long)(request.Page - 1) * request.PageSize;
var items = skip >= totalItems ? Array.Empty<T>() : ordered.Skip((int)skip).Take(request.PageSize).ToArray();
```

`(int.MaxValue - 1) * 20` overflows `int` and wraps **negative**; `Skip(negative)` skips nothing, so `?page=2000000000` would quietly return page one. Widening to `long` before multiplying makes the overflow impossible, and the `skip >= totalItems` check turns "past the end" into an empty page instead of an error.

**`ProductQuery.cs`** — filter, then sort, then slice, in one line of composition. The sort switch is the whitelist, and every branch ends with a tie-break on `Id`. Read the comment there; it is the total-order argument in full.

**`Program.cs`** — one endpoint. Reject, normalize, delegate:

```csharp
var errors = PageRequest.Validate(sort);
if (errors.Count > 0) return Results.BadRequest(new { errors });

var request = PageRequest.Normalize(page, pageSize, sort, search);
return Results.Ok(ProductQuery.Apply(catalog.Products, request));
```

Four lines, no arithmetic, no LINQ. All the thinking happens in pure functions that the 83 tests can reach without a server.

**`Tests.cs`** — worth reading as a catalogue of where off-by-ones live: page 1's first item, page 2 starting exactly where page 1 stopped, the last partial page, one past the end, exactly-full last page, empty source, single item, `int.MaxValue`. And the property test at the end — walk every page, assert every product appears exactly once — which is the one that catches bugs you did not think of.

## 7. Words you learned (glossary)

- **Pagination** — returning a window of results instead of all of them.
- **Page / pageSize (limit)** — which window, and how big.
- **Offset pagination** — skip `(page - 1) * pageSize`, take `pageSize`.
- **Keyset / cursor pagination** — "give me what comes after *this item*"; immune to inserts and deletes (PRACTICE exercise 5).
- **Off-by-one** — an index or count that is out by exactly one; produces plausible data, not errors.
- **Ceiling division** — `(a + b - 1) / b`, rounding up with integers only.
- **Envelope** — the response wrapper carrying items *plus* metadata (totals, page info).
- **Total order** — an ordering with no ties; what makes pages tile the result set exactly once.
- **Tie-break** — the `ThenBy` on a unique column that creates a total order.
- **Stable sort** — one that preserves the input order of equal items; a convenience, not a substitute for a tie-break.
- **Filtering** — narrowing which items are in the result at all.
- **Whitelist (allow-list)** — an explicit set of accepted values; everything else is an error.
- **Clamp** — forcing a value into a valid range (`Math.Clamp`).
- **Cap** — a maximum the server enforces regardless of what the client asks for.
- **Total function** — one that returns a valid result for every possible input and never throws.
- **Facet** — a filter over a known small set of values, like category (PRACTICE exercise 3).

## 8. Experiments to try on the plane (no internet needed)

All localhost, all offline.

1. **Measure the megabyte.** Start the original, `curl -s http://localhost:5034/products > NUL`, and read the size the server console prints. Now start the refactored server and `curl -s "http://localhost:5034/products" | more`. Same catalogue, same information available, about 1/500th of the bytes. Then ask the refactored server for `?pageSize=999999` and note that it politely gives you 100.
2. **Reproduce the off-by-one from the client's side.** Against the original: `curl "http://localhost:5034/products/page?page=1"` and look at the first id — 21. Every product from 1 to 20 is unreachable by a client that starts counting at 1. Against the refactored server, `?page=1` starts at id 1.
3. **Try to make the refactored server return a 500.** Genuinely try: `?page=abc`, `?page=-1`, `?page=99999999999`, `?pageSize=0`, `?pageSize=-5`, `?sort=`, `?sort=;DROP TABLE`, `?search=%00`. You should get 200s and 400s only. Then do the same list against the original and count the stack traces.
4. **Break the total order and watch pages lie.** In `ProductQuery.Sort`, delete the `ThenBy(p => p.Id)` (return `ordered.ToList()`), then in `Tests.cs` change the tiling test to use the 10,000-product catalogue sorted by `"stock"` (only 97 distinct values, so thousands of ties) at `pageSize` 100. Run `-- test`. LINQ's stable sort may still save you — which is the real lesson: the bug is *latent*, and it detonates the day the data moves to a database whose sort is not stable. Put the tie-break back.
5. **Find the last page by arithmetic, not by probing.** `curl "http://localhost:5034/products?search=chair"`, read `totalPages` from the envelope, and jump straight there with `?page=<that>`. Then ask for `totalPages + 1` — an empty `items` array with the totals still correct, no error. That difference between "empty because you overshot" and "error" is what the envelope buys.
6. **Watch filter-then-page work.** `curl "http://localhost:5034/products?search=mug&pageSize=5"` and note `totalItems` — it counts the *matches*, not the catalogue. Now imagine implementing that with the original's advice: the client would need all 10,000 products to compute that one number.
