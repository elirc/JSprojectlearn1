# 🏋️ Practice: Pagination & Filtering

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Tell the client where it is (warm-up)

The envelope has the numbers, but every client now writes the same two lines to work out whether the
Next button should be enabled. Add `HasNext` and `HasPrevious` as computed properties on
`PagedResult<T>` — no new constructor parameters, no changes to `Paginator.Slice`. They serialize into
the JSON automatically.
*Practices:* derived state on a record, and moving a calculation every caller repeats into the one
place that owns the data.
**Hint:** `HasNext => Page < TotalPages;` and `HasPrevious => Page > 1 && TotalPages > 0;`. Sanity-check
both against the empty result (zero pages) before you write them — that is the case that makes the
naive version wrong.
**Check offline:** add to `Tests.cs`:
```csharp
var first = Paginator.Slice(Enumerable.Range(1, 25).ToList(), new PageRequest(1, 10, "id", null));
Check.Equal(false, first.HasPrevious, "page 1 has no previous");
Check.Equal(true, first.HasNext, "page 1 of 3 has a next");
var last = Paginator.Slice(Enumerable.Range(1, 25).ToList(), new PageRequest(3, 10, "id", null));
Check.Equal(true, last.HasPrevious, "the last page has a previous");
Check.Equal(false, last.HasNext, "the last page has no next");
var none = Paginator.Slice(new List<int>(), new PageRequest(1, 10, "id", null));
Check.Equal(false, none.HasNext, "an empty result has no next");
Check.Equal(false, none.HasPrevious, "...and no previous either");
```
Then `curl "http://localhost:5034/products?page=500"` and look for `"hasNext":false`.

### ⭐⭐ 2. Price range, and a rule that needs two fields (core)

Add `?minPrice=` and `?maxPrice=` (both `decimal?`). A negative minimum **clamps** to 0 — obvious
intent. But `minPrice=10&maxPrice=5` is a **rejection**: it is not obviously a typo in either field,
and quietly returning nothing would look identical to "no products match", which is a different fact.
Add both parameters to `PageRequest` *with defaults* so existing calls still compile.
*Practices:* a validation rule that spans two fields, and the clamp/reject decision made twice in one
feature.
**Hint:** positional records accept defaults — `public record PageRequest(..., decimal? MinPrice = null, decimal? MaxPrice = null)`
— so every `new PageRequest(1, 10, "id", null)` in `Tests.cs` keeps working. `Validate` needs the two
new arguments, and should still return *all* problems at once.
**Check offline:** add to `Tests.cs`:
```csharp
Check.Equal(0, PageRequest.Validate(null, 5m, 10m).Count, "min below max is valid");
Check.Equal(0, PageRequest.Validate(null, 10m, 10m).Count, "min equal to max is valid");
Check.Equal(1, PageRequest.Validate(null, 10m, 5m).Count, "min above max is rejected");
Check.True(PageRequest.Validate(null, 10m, 5m)[0].Contains("minPrice"), "the error names the parameter");
Check.Equal(2, PageRequest.Validate("pirce", 10m, 5m).Count, "both problems are reported at once");
Check.Equal(0m, PageRequest.Normalize(null, null, null, null, -5m, null).MinPrice, "a negative minPrice clamps to 0");

var catalog = Small();
var ranged = ProductQuery.Apply(catalog.Products, PageRequest.Normalize(1, 10, "id", null, 5m, 10m));
Check.Equal(3, ranged.TotalItems, "3 products cost between 5 and 10 inclusive");
Check.Equal(2, ProductQuery.Apply(catalog.Products, PageRequest.Normalize(1, 10, "id", "rustic", 5m, 10m)).TotalItems,
    "search and price range compose");
```
Then `curl -i "http://localhost:5034/products?minPrice=10&maxPrice=5"` → `400`.

### ⭐⭐ 3. A facet is not a search (core)

Add `?category=tools` — an **exact**, case-insensitive match, separate from `search`. Note the contrast
with exercise 2: an unknown category gets an empty page, *not* a 400, because "show me products in a
category with no products" is a perfectly clear request with a correct empty answer. Then add
`GET /products/categories` returning each category with its product count, so a client can build the
filter UI without guessing.
*Practices:* distinguishing a fuzzy search from an exact facet, and noticing that "reject the
ambiguous" does not mean "reject the unfamiliar".
**Hint:** `string.Equals(p.Category, request.Category, StringComparison.OrdinalIgnoreCase)` — `Equals`,
not `Contains`, is the whole difference. Refactoring `Filter` to take the whole `PageRequest` instead
of just the search string keeps its signature from growing a parameter per filter.
**Check offline:** add to `Tests.cs`:
```csharp
var c = Small().Products;
Check.Equal(2, ProductQuery.Apply(c, PageRequest.Normalize(1, 10, "id", null, null, null, "tools")).TotalItems,
    "category is an exact filter");
Check.Equal(2, ProductQuery.Apply(c, PageRequest.Normalize(1, 10, "id", null, null, null, "TOOLS")).TotalItems,
    "...case-insensitively");
Check.Equal(0, ProductQuery.Apply(c, PageRequest.Normalize(1, 10, "id", null, null, null, "tool")).TotalItems,
    "a PREFIX is not a category — exact, unlike search");
Check.Equal(0, ProductQuery.Apply(c, PageRequest.Normalize(1, 10, "id", null, null, null, "nope")).TotalItems,
    "an unknown category is an empty page, not a 400");

var facets = ProductQuery.Categories(c);
Check.Equal(4, facets.Count, "four distinct categories");
Check.Equal("books", facets[0].Name, "facets come back alphabetical");
Check.Equal(2, facets.First(f => f.Name == "tools").Count, "and carry their counts");
```

### ⭐⭐ 4. Prove the pages tile (core)

Add `"category"` to the sort whitelist and to `ProductQuery.Sort`. It has only five distinct values, so
in a 500-product catalogue almost every item is tied with 99 others — exactly the situation where a
missing tie-break silently duplicates and drops products. Then write a **property test**: for several
page sizes, walk every page and assert that each product appeared exactly once.
*Practices:* testing a property of the whole result ("the pages tile") instead of one example, which is
how you catch the bugs you did not think of.
**Hint:** loop `foreach (var size in new[] { 1, 7, 100, 499, 500, 501 })` — the interesting sizes are 1,
a size that divides unevenly, one below the total, exactly the total, and one above it. Collect every
page's ids into a list and compare `seen.Count` against `seen.Distinct().Count()`; if they differ, some
product came back twice and another never came at all.
**Check offline:** add to `Tests.cs`:
```csharp
Check.Equal(0, PageRequest.Validate("category", null, null).Count, "category is a whitelisted sort field now");
Check.Equal("4,5,1,3,2", Ids(ProductQuery.Sort(Small().Products, "category")), "category ascending, ties by id");
Check.Equal("2,3,1,5,4", Ids(ProductQuery.Sort(Small().Products, "-category")), "descending reverses the ties too");

var many = ProductCatalog.Seeded(500).Products;
foreach (var size in new[] { 1, 7, 100, 499, 500, 501 })
{
    var seen = new List<int>();
    var pages = ProductQuery.Apply(many, PageRequest.Normalize(1, size, "category", null)).TotalPages;
    for (int p = 1; p <= pages; p++)
        seen.AddRange(ProductQuery.Apply(many, PageRequest.Normalize(p, size, "category", null)).Items.Select(x => x.Id));
    Check.Equal(500, seen.Count, $"pageSize {size}: every product appears...");
    Check.Equal(500, seen.Distinct().Count(), $"pageSize {size}: ...exactly once");
}
```
Then delete the `ThenBy`/`ThenByDescending` and run it again to see what the property test is *for*.

### ⭐⭐⭐ 5. Pagination that survives a delete (challenge)

Offset pagination has a flaw no amount of clamping fixes: it is defined relative to a *position*, and
positions move. Delete one product between a client's page 1 and page 2 and everything shifts up by
one — so the product that was first on page 2 is now last on page 1, and the client never sees it.
Implement **keyset (cursor) pagination**: `Paginator.After(byId, after, pageSize)` returning
`CursorPage<Product>(Items, NextCursor, PageSize)`, where the cursor is the last id on the page. Expose
it as `GET /products/feed?after=&limit=`.
*Practices:* choosing a pagination strategy from its failure modes, and the peek-one-ahead trick.
**Hint:** `Where(p => after is null || p.Id > after.Value).Take(pageSize + 1)` — taking **one extra**
item is how you learn whether a next page exists without a second query. If you got `pageSize + 1`
back, drop the extra and return a cursor; if you got fewer, the cursor is `null` and the feed is done.
The list must be ordered by the cursor column, which is why the parameter is named `byId`.
**Check offline:** add to `Tests.cs`:
```csharp
var byId = Small().Products.OrderBy(p => p.Id).ToList();
var k1 = Paginator.After(byId, null, 2);
Check.Equal("1,2", Ids(k1.Items), "the first cursor page starts at the beginning");
Check.Equal(2, k1.NextCursor, "the cursor is the last id on the page");
var k2 = Paginator.After(byId, k1.NextCursor, 2);
Check.Equal("3,4", Ids(k2.Items), "the next page follows the cursor");
var k3 = Paginator.After(byId, k2.NextCursor, 2);
Check.Equal("5", Ids(k3.Items), "the last page is partial");
Check.Equal(null, k3.NextCursor, "and its cursor is null: there is no more");
Check.Equal(0, Paginator.After(byId, 999, 2).Items.Count, "a cursor past the end gives an empty page");

// The whole point, in five lines: somebody deletes product 1 between page 1 and page 2.
var afterDelete = byId.Where(p => p.Id != 1).ToList();
Check.Equal("4,5", Ids(Paginator.Slice(afterDelete, new PageRequest(2, 2, "id", null)).Items),
    "OFFSET page 2 skipped product 3 entirely");
Check.Equal("3,4", Ids(Paginator.After(afterDelete, 2, 2).Items),
    "KEYSET page 2 skipped nothing");
```

## Solutions

### 1. Tell the client where it is

```csharp
// Paginator.cs
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages)
{
    /// Derived, not stored: there is exactly one source of truth for "where am
    /// I", and these two read it rather than duplicating it.
    public bool HasPrevious => Page > 1 && TotalPages > 0;
    public bool HasNext => Page < TotalPages;
}
```

WHY: a computed property beats two more constructor parameters for the same reason a database has no
"age" column next to "birth date" — stored derived values drift from what they were derived from, and
the compiler cannot notice. `System.Text.Json` serializes public getters, so these appear in the response
without touching `Paginator.Slice` or any endpoint. The `TotalPages > 0` guard on `HasPrevious` is the
part worth pausing on: with zero results there are zero pages, so `page=1` is simultaneously the first
page and past the end. Every "which page am I on" bug lives in the empty case.

### 2. Price range, and a rule that needs two fields

```csharp
// PageRequest.cs — defaults keep every existing construction site compiling
public record PageRequest(int Page, int PageSize, string Sort, string? Search,
                          decimal? MinPrice = null, decimal? MaxPrice = null)
{
    public static IReadOnlyList<string> Validate(string? sort, decimal? minPrice, decimal? maxPrice)
    {
        var errors = new List<string>();

        if (!string.IsNullOrWhiteSpace(sort))
        {
            var (field, _) = ParseSort(sort.Trim().ToLowerInvariant());
            if (!SortFields.Contains(field))
                errors.Add($"unknown sort field '{field}'. Allowed: {string.Join(", ", SortFields)} " +
                           "(prefix with '-' for descending, e.g. -price)");
        }

        // A rule NEITHER field can check alone — which is exactly why validation
        // belongs to the request as a whole, not to each parameter.
        if (minPrice is not null && maxPrice is not null && minPrice > maxPrice)
            errors.Add($"minPrice ({minPrice}) must not be greater than maxPrice ({maxPrice})");

        return errors;
    }

    // Normalize gains two more clamped arguments; the first four are unchanged.
    //     minPrice is null ? null : Math.Max(0m, minPrice.Value),   // negative money is not a thing
    //     maxPrice is null ? null : Math.Max(0m, maxPrice.Value));

// ProductQuery.cs — Filter now takes the whole request
public static IReadOnlyList<Product> Filter(IReadOnlyList<Product> products, PageRequest request)
{
    IEnumerable<Product> rows = products;

    if (!string.IsNullOrWhiteSpace(request.Search))
        rows = rows.Where(p => p.Name.Contains(request.Search, StringComparison.OrdinalIgnoreCase)
                            || p.Category.Contains(request.Search, StringComparison.OrdinalIgnoreCase));

    if (request.MinPrice is not null) rows = rows.Where(p => p.Price >= request.MinPrice.Value);
    if (request.MaxPrice is not null) rows = rows.Where(p => p.Price <= request.MaxPrice.Value);

    return rows.ToList();          // one enumeration, at the end
}

// Program.cs — two more typed parameters, passed into Validate and Normalize.
```

WHY: `minPrice > maxPrice` is a rule neither field can enforce alone, and that is the argument for
validating the *request object* rather than sprinkling checks per parameter — a habit that scales to
"end date after start date", "discount not above total", and every other pairwise rule. Why reject
rather than helpfully swap them? Because a swap answers a question the client did not ask, and the two
readings ("fields typed backwards" vs "their code computed a bad range") call for opposite responses.
Returning zero results would be worse: indistinguishable from a genuine empty range, so the client's bug
hides as data. The negative-minimum clamp *is* unambiguous — there is no price below zero — so nothing
is lost by fixing that one silently.

Note the defaults on the record parameters: two new positional members would normally break every
`new PageRequest(...)` in the test suite, and `= null` keeps them all compiling (cs#21's `CreatedAt`
trick).

### 3. A facet is not a search

```csharp
// PageRequest.cs — one more optional member
public record PageRequest(int Page, int PageSize, string Sort, string? Search,
                          decimal? MinPrice = null, decimal? MaxPrice = null, string? Category = null);

// ...in Normalize, alongside the others:
    string.IsNullOrWhiteSpace(category) ? null : category.Trim()

// ProductQuery.cs
public record Facet(string Name, int Count);

// ...in Filter, after the search clause:
if (request.Category is not null)
    rows = rows.Where(p => string.Equals(p.Category, request.Category, StringComparison.OrdinalIgnoreCase));

public static IReadOnlyList<Facet> Categories(IReadOnlyList<Product> products)
    => products.GroupBy(p => p.Category)
               .Select(g => new Facet(g.Key, g.Count()))
               .OrderBy(f => f.Name, StringComparer.Ordinal)
               .ToList();

// Program.cs
app.MapGet("/products/categories", (ProductCatalog catalog) =>
    Results.Ok(ProductQuery.Categories(catalog.Products)));
```

WHY: `search` and `category` look like the same feature and are not. Search is a guess the user is
making — fuzzy, substring, forgiving — so `"cha"` finding "Rustic Chair" is desired. A facet is a choice
the user made from a list *you gave them*, so `"tool"` matching `"tools"` would be a bug: the filter no
longer corresponds to the button they clicked. `Equals` versus `Contains` is the entire difference, and
getting it backwards produces a filter that is subtly, occasionally wrong.

`/products/categories` exists because a facet filter is useless without the list of facets — otherwise
the client hard-codes five strings that drift from your data the day someone adds a category. The counts
are nearly free (`GroupBy` already knows them) and let the UI grey out empty options.

And an unknown category returns an empty page rather than a 400, which looks like it contradicts LEARN's
"reject the ambiguous" rule but doesn't: `?category=nope` is not ambiguous. It clearly means "products in
category nope", and "there are none" is the correct answer. The rule is about *ambiguity*, not
unfamiliarity — `?sort=pirce` gets a 400 because there is no correct answer to give.

### 4. Prove the pages tile

```csharp
// PageRequest.cs
public static readonly IReadOnlyList<string> SortFields = ["id", "name", "price", "stock", "category"];

// ProductQuery.cs — two more branches in the whitelist switch
("category", false) => products.OrderBy(p => p.Category, StringComparer.Ordinal),
("category", true)  => products.OrderByDescending(p => p.Category, StringComparer.Ordinal),
```

The test is the exercise:

```csharp
// Tests.cs
var many = ProductCatalog.Seeded(500).Products;
foreach (var size in new[] { 1, 7, 100, 499, 500, 501 })
{
    var seen = new List<int>();
    var pages = ProductQuery.Apply(many, PageRequest.Normalize(1, size, "category", null)).TotalPages;
    for (int p = 1; p <= pages; p++)
        seen.AddRange(ProductQuery.Apply(many, PageRequest.Normalize(p, size, "category", null))
            .Items.Select(x => x.Id));

    Check.Equal(500, seen.Count, $"pageSize {size}: every product appears...");
    Check.Equal(500, seen.Distinct().Count(), $"pageSize {size}: ...exactly once");
}
```

WHY: the two assertions look redundant and are not. `seen.Count == 500` catches products that were
*dropped*; `seen.Distinct().Count() == 500` catches products that were *duplicated*. An unstable sort
produces both at once — one item slides from page 2 to page 1 and another slides the other way — so a
test checking only one could pass while the result set was scrambled.

This is a **property test**: rather than asserting that a specific page holds specific ids, it asserts an
invariant that must hold for *every* page size and lets the loop find the counterexample. The sizes are
not arbitrary — 1 (every page a boundary), 7 (divides unevenly, partial last page), 100 (divides evenly),
499 / 500 / 501 (one below, exactly, one above the total). Those shapes are where slicing arithmetic
breaks, and enumerating them beats trusting yourself to imagine the failure.

Adding `category` first is what makes the test meaningful: with five distinct values across 500 products,
every page boundary lands inside a hundred-way tie. Sorting by `id` would pass this test with the
tie-break deleted — which is why "my tests are green" and "my code is correct" are different claims.

### 5. Pagination that survives a delete

```csharp
// Paginator.cs
public record CursorPage<T>(IReadOnlyList<T> Items, int? NextCursor, int PageSize);

/// Keyset pagination: "the next N items AFTER this id".
/// `byId` must be ordered by the cursor column — the cursor is a position in
/// that order, not an offset into a list.
public static CursorPage<Product> After(IReadOnlyList<Product> byId, int? after, int pageSize)
{
    // Take ONE MORE than asked. If we get it, there is a next page; if we
    // don't, this is the end. One pass, no second count query.
    var window = byId
        .Where(p => after is null || p.Id > after.Value)
        .Take(pageSize + 1)
        .ToList();

    var hasMore = window.Count > pageSize;
    var items = hasMore ? window.Take(pageSize).ToList() : window;

    return new CursorPage<Product>(items, hasMore ? items[^1].Id : null, pageSize);
}

// Program.cs
app.MapGet("/products/feed", (int? after, int? limit, ProductCatalog catalog) =>
{
    var pageSize = limit is null ? PageRequest.DefaultPageSize : Math.Clamp(limit.Value, 1, PageRequest.MaxPageSize);
    var byId = catalog.Products.OrderBy(p => p.Id).ToList();
    return Results.Ok(Paginator.After(byId, after, pageSize));
});
```

WHY: offset pagination answers "give me items 21 through 40", which is a question about *positions*, and
positions move whenever anything is inserted or deleted. Delete one product while a user reads page 1 and
every later item shifts up a slot: the item that was 21st becomes 20th, the client asks for 21–40, and
that product is never shown to anyone. On an infinite-scroll feed, where insertions happen constantly at
the front, that drift is not an edge case — it is why such feeds show you the same post three times.

Keyset pagination asks about *content* instead: "the next twenty items after the one with id 2". Deleting
id 1 does not change the answer, because the cursor names an item rather than a count. The peek-one-ahead
trick is worth stealing too: the obvious way to answer "is there a next page?" is a second counting
query, an extra round trip per page, whereas fetching `pageSize + 1` answers it inside the query you were
already making, for one row.

The trade: keyset has no page numbers and no "jump to page 47", because it never computes a total. Offset
gives numbered pages and random access; keyset gives correctness under concurrent writes. Catalogue with
a pager → offset. Feed with a Load More button → keyset. Knowing which one your screen actually is beats
reaching for the familiar one.
