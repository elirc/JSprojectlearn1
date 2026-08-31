public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("PageRequest.Normalize: clamp what has an obvious intent");
        Check.Equal(1, PageRequest.Normalize(null, null, null, null).Page, "no page means page 1");
        Check.Equal(1, PageRequest.Normalize(0, null, null, null).Page, "page 0 clamps up to 1");
        Check.Equal(1, PageRequest.Normalize(-5, null, null, null).Page, "a negative page clamps up to 1");
        Check.Equal(7, PageRequest.Normalize(7, null, null, null).Page, "a sensible page is left alone");

        Check.Equal(20, PageRequest.Normalize(null, null, null, null).PageSize, "the default page size is 20");
        Check.Equal(1, PageRequest.Normalize(null, 0, null, null).PageSize, "pageSize 0 clamps up to 1");
        Check.Equal(1, PageRequest.Normalize(null, -99, null, null).PageSize, "a negative pageSize clamps up to 1");
        Check.Equal(50, PageRequest.Normalize(null, 50, null, null).PageSize, "a sensible pageSize is left alone");
        Check.Equal(100, PageRequest.Normalize(null, 100_000, null, null).PageSize, "pageSize is CAPPED, not honoured");
        Check.Equal(PageRequest.MaxPageSize, PageRequest.Normalize(null, int.MaxValue, null, null).PageSize,
            "even int.MaxValue only gets you MaxPageSize");

        Check.Equal("id", PageRequest.Normalize(null, null, null, null).Sort, "the default sort is id");
        Check.Equal("id", PageRequest.Normalize(null, null, "   ", null).Sort, "a blank sort is the default sort");
        Check.Equal("price", PageRequest.Normalize(null, null, "  PRICE ", null).Sort, "sort is trimmed and lowercased");
        Check.Equal("-price", PageRequest.Normalize(null, null, "-Price", null).Sort, "the descending prefix survives");

        Check.Equal(null, PageRequest.Normalize(null, null, null, null).Search, "no search is null");
        Check.Equal(null, PageRequest.Normalize(null, null, null, "   ").Search, "a blank search is ALSO null, not \"   \"");
        Check.Equal("mug", PageRequest.Normalize(null, null, null, "  mug  ").Search, "search is trimmed");

        Console.WriteLine("PageRequest.Validate: reject what has no obvious intent");
        Check.Equal(0, PageRequest.Validate(null).Count, "no sort is valid");
        Check.Equal(0, PageRequest.Validate("price").Count, "a whitelisted field is valid");
        Check.Equal(0, PageRequest.Validate("-PRICE").Count, "case and direction don't change the field");
        Check.Equal(1, PageRequest.Validate("pirce").Count, "a typo is rejected, not guessed at");
        Check.True(PageRequest.Validate("pirce")[0].Contains("price"), "and the error lists what IS allowed");
        Check.Equal(1, PageRequest.Validate("costPrice").Count, "an internal-sounding name is rejected too");
        Check.Equal(1, PageRequest.Validate("-nope").Count, "descending junk is still junk");

        Console.WriteLine("PageRequest.ParseSort");
        Check.Equal("price", PageRequest.ParseSort("price").Field, "a bare field is the field");
        Check.Equal(false, PageRequest.ParseSort("price").Descending, "...ascending by default");
        Check.Equal("price", PageRequest.ParseSort("-price").Field, "the '-' is not part of the field name");
        Check.Equal(true, PageRequest.ParseSort("-price").Descending, "...and it means descending");

        Console.WriteLine("Paginator.Slice: the boundaries where off-by-ones live");
        var items = Enumerable.Range(1, 25).ToList();

        var p1 = Paginator.Slice(items, new PageRequest(1, 10, "id", null));
        Check.Equal(1, p1.Items[0], "PAGE 1 STARTS AT THE FIRST ITEM (the original's bug)");
        Check.Equal(10, p1.Items.Count, "a full page has pageSize items");
        Check.Equal(10, p1.Items[^1], "...and ends where you'd expect");
        Check.Equal(25, p1.TotalItems, "the envelope reports the real total");
        Check.Equal(3, p1.TotalPages, "25 items at 10 per page is 3 pages, not 2");

        var p2 = Paginator.Slice(items, new PageRequest(2, 10, "id", null));
        Check.Equal(11, p2.Items[0], "page 2 starts exactly where page 1 stopped");
        Check.Equal(20, p2.Items[^1], "no gap, no overlap");

        var p3 = Paginator.Slice(items, new PageRequest(3, 10, "id", null));
        Check.Equal(5, p3.Items.Count, "the LAST page is partial, and that's fine");
        Check.Equal(21, p3.Items[0], "it starts right after page 2");
        Check.Equal(25, p3.Items[^1], "and ends at the last item");

        var p4 = Paginator.Slice(items, new PageRequest(4, 10, "id", null));
        Check.Equal(0, p4.Items.Count, "a page past the end is EMPTY, not a crash");
        Check.Equal(25, p4.TotalItems, "...and still reports the real total");
        Check.Equal(3, p4.TotalPages, "...and the real page count");

        var huge = Paginator.Slice(items, new PageRequest(int.MaxValue, 20, "id", null));
        Check.Equal(0, huge.Items.Count,
            "page int.MaxValue is empty — the long cast stops the skip from overflowing NEGATIVE");

        var exact = Paginator.Slice(Enumerable.Range(1, 20).ToList(), new PageRequest(2, 10, "id", null));
        Check.Equal(10, exact.Items.Count, "when the last page is exactly full it is still a page");
        Check.Equal(2, exact.TotalPages, "20 items at 10 per page is exactly 2 pages");
        Check.Equal(0, Paginator.Slice(Enumerable.Range(1, 20).ToList(), new PageRequest(3, 10, "id", null)).Items.Count,
            "...and there is no page 3");

        var none = Paginator.Slice(new List<int>(), new PageRequest(1, 10, "id", null));
        Check.Equal(0, none.Items.Count, "an empty source gives an empty page");
        Check.Equal(0, none.TotalItems, "...zero items");
        Check.Equal(0, none.TotalPages, "...and ZERO pages, not one empty one");

        var one = Paginator.Slice(new List<int> { 42 }, new PageRequest(1, 10, "id", null));
        Check.Equal(1, one.TotalPages, "one item is one page");
        Check.Equal(42, one.Items[0], "...containing that item");

        Console.WriteLine("ProductQuery.Filter: case-insensitive, name or category");
        var catalog = Small();
        Check.Equal(5, ProductQuery.Filter(catalog.Products, null).Count, "no search means everything");
        Check.Equal(5, ProductQuery.Filter(catalog.Products, "   ").Count, "a blank search means everything");
        Check.Equal(2, ProductQuery.Filter(catalog.Products, "rustic").Count, "a name substring matches");
        Check.Equal(2, ProductQuery.Filter(catalog.Products, "RUSTIC").Count, "...case-insensitively");
        Check.Equal(2, ProductQuery.Filter(catalog.Products, "tools").Count, "a category matches too");
        Check.Equal(1, ProductQuery.Filter(catalog.Products, "mug").Count, "one match is one match");
        Check.Equal(0, ProductQuery.Filter(catalog.Products, "zzz").Count, "no matches is an empty list, not null");

        Console.WriteLine("ProductQuery.Sort: the whitelist, and the tie-break that makes paging correct");
        Check.Equal("1,2,3,4,5", Ids(ProductQuery.Sort(catalog.Products, "id")), "id ascending");
        Check.Equal("5,4,3,2,1", Ids(ProductQuery.Sort(catalog.Products, "-id")), "id descending");
        Check.Equal("4,2,1,3,5", Ids(ProductQuery.Sort(catalog.Products, "price")), "price ascending, ties broken by id");
        Check.Equal("5,3,1,2,4", Ids(ProductQuery.Sort(catalog.Products, "-price")), "price descending, ties broken by id");
        Check.Equal("4,1,3,2,5", Ids(ProductQuery.Sort(catalog.Products, "name")), "name ascending");
        Check.Equal("2,5,4,1,3", Ids(ProductQuery.Sort(catalog.Products, "stock")), "stock ascending");
        Check.Equal("1,2,3,4,5", Ids(ProductQuery.Sort(catalog.Products, "pirce")),
            "an unknown field falls back to id — it can never reach a property by name");

        Console.WriteLine("ProductQuery.Apply: filter, then sort, then slice");
        var filtered = ProductQuery.Apply(catalog.Products, PageRequest.Normalize(1, 1, "id", "rustic"));
        Check.Equal(2, filtered.TotalItems, "totals count the FILTERED set, not the catalogue");
        Check.Equal(2, filtered.TotalPages, "2 matches at 1 per page is 2 pages");
        Check.Equal(1, filtered.Items.Count, "the page holds one item");
        Check.Equal(1, filtered.Items[0].Id, "the first match");

        var filteredPage2 = ProductQuery.Apply(catalog.Products, PageRequest.Normalize(2, 1, "id", "rustic"));
        Check.Equal(3, filteredPage2.Items[0].Id, "page 2 of the filtered set is the second match");

        var noMatches = ProductQuery.Apply(catalog.Products, PageRequest.Normalize(1, 10, "id", "zzz"));
        Check.Equal(0, noMatches.TotalItems, "a search with no hits totals zero");
        Check.Equal(0, noMatches.TotalPages, "...and has zero pages");

        // Walk every page and prove the pages TILE the result set: every
        // product exactly once, none twice, none missing. This is the property
        // an unstable sort quietly breaks.
        var seen = new List<int>();
        var pages = ProductQuery.Apply(catalog.Products, PageRequest.Normalize(1, 2, "price", null)).TotalPages;
        for (int p = 1; p <= pages; p++)
            seen.AddRange(ProductQuery.Apply(catalog.Products, PageRequest.Normalize(p, 2, "price", null))
                .Items.Select(x => x.Id));
        Check.Equal(3, pages, "5 products at 2 per page is 3 pages");
        Check.Equal(5, seen.Count, "walking every page yields every product...");
        Check.Equal(5, seen.Distinct().Count(), "...exactly once (a total order makes pages tile)");

        Console.WriteLine("The real catalogue: 10,000 products, 20 at a time");
        var big = ProductCatalog.Seeded();
        Check.Equal(10_000, big.Count, "the app seeds 10,000 products");

        var first = ProductQuery.Apply(big.Products, PageRequest.Normalize(null, null, null, null));
        Check.Equal(20, first.Items.Count, "a bare GET returns 20 items, not 10,000");
        Check.Equal(10_000, first.TotalItems, "...while still saying how many exist");
        Check.Equal(500, first.TotalPages, "10,000 / 20 = 500 pages");
        Check.Equal(1, first.Items[0].Id, "and it starts at the first product");

        var last = ProductQuery.Apply(big.Products, PageRequest.Normalize(500, null, null, null));
        Check.Equal(20, last.Items.Count, "the last page is full");
        Check.Equal(10_000, last.Items[^1].Id, "...and ends at the last product");
        Check.Equal(0, ProductQuery.Apply(big.Products, PageRequest.Normalize(501, null, null, null)).Items.Count,
            "page 501 is empty, not a 500");

        var capped = ProductQuery.Apply(big.Products, PageRequest.Normalize(1, 999_999, null, null));
        Check.Equal(100, capped.Items.Count, "?pageSize=999999 gets you 100 items — the cap is the defence");

        return Check.Summary();
    }

    private static string Ids(IEnumerable<Product> products) => string.Join(",", products.Select(p => p.Id));

    // Five products chosen so that every interesting case has a hand-checkable
    // answer: a price tie (1 and 3), two names sharing a prefix, a zero stock.
    private static ProductCatalog Small() => new(
    [
        new Product(1, "Rustic Chair", "tools", 10.00m, 5),
        new Product(2, "Sleek Lamp", "toys", 5.00m, 0),
        new Product(3, "Rustic Table", "tools", 10.00m, 9),
        new Product(4, "Handmade Mug", "books", 2.50m, 3),
        new Product(5, "Sleek Shelf", "garden", 99.00m, 1),
    ]);
}
