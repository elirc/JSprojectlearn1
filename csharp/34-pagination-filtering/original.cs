#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// (That second line just silences native-AOT trimming warnings that
// file-based web apps emit for reflection-based JSON — ignore it.)
//
// 34 — pagination & filtering (ORIGINAL, flawed on purpose)
//
// A product catalogue with 10,000 items and an API that hands you all of them,
// every time, and then apologises in the comments.
//
// Run:   dotnet run csharp/34-pagination-filtering/original.cs
// Try:
//   curl -s http://localhost:5034/products | wc -c        (or just watch the
//        server console — it prints the payload size for every request)
//
//   THE OFF-BY-ONE, in two commands:
//   curl "http://localhost:5034/products/page?page=0"     -> products 1..20
//   curl "http://localhost:5034/products/page?page=1"     -> products 21..40
//        Page ONE is the SECOND page. Every client that says "page 1" for the
//        first page silently skips twenty products, and nobody notices until
//        a customer asks why they can't find "Rustic Chair #00003".
//
//   THE CRASHES, one command each:
//   curl -i "http://localhost:5034/products/page?page=-1"   -> 500
//   curl -i "http://localhost:5034/products/page?page=abc"  -> 500
//   curl -i "http://localhost:5034/products/page?page=9999" -> 500
//   curl -i "http://localhost:5034/products/sorted?sort=pirce" -> 500
//        Four different ways for a client to take the server down with a
//        query string. None of them are the client's fault.

using System.Text.Json;

var app = WebApplication.CreateBuilder(args).Build();

var categories = new[] { "tools", "toys", "books", "food", "garden" };
var adjectives = new[] { "Rustic", "Sleek", "Handmade", "Refined", "Ergonomic" };
var nouns = new[] { "Chair", "Lamp", "Table", "Mug", "Shelf" };

var products = new List<Product>();
for (int i = 1; i <= 10_000; i++)
    products.Add(new Product(
        i,
        $"{adjectives[i % 5]} {nouns[(i / 5) % 5]} #{i:D5}",
        categories[i % 5],
        1.99m + (i % 500),
        i % 97));

// ---------------------------------------------------------------------------
// FLAW #1: the whole table, on every request.
// ---------------------------------------------------------------------------
app.MapGet("/products", () =>
{
    var json = JsonSerializer.Serialize(products);

    // Watch this number in the console. It is the same number for a phone on
    // a train as for a datacentre — the server has no idea and no opinion.
    Console.WriteLine($"[/products] serialized {json.Length:N0} bytes for ONE request");

    // The team's official position, recorded here for posterity:
    //
    //   "It's fine, the frontend filters it. Just do
    //        products.filter(p => p.name.includes(q))
    //    in the browser and only render 20 of them."
    //
    // Which means: the database read 10,000 rows, the server serialized ~1MB
    // of JSON, the network carried all of it, the phone parsed all of it and
    // built 10,000 objects in memory — so that JavaScript could throw away
    // 9,980 of them. Every keystroke in the search box. The user sees a
    // spinner and blames their connection.
    return Results.Text(json, "application/json");
});

// ---------------------------------------------------------------------------
// FLAW #2: someone added paging. Sort of.
// ---------------------------------------------------------------------------
app.MapGet("/products/page", (HttpContext ctx) =>
{
    // Hand-rolled query parsing. int.Parse throws FormatException on anything
    // that isn't a number — "abc", "1.5", "٣", an empty retry from a flaky
    // client — and an unhandled exception in an endpoint is a 500. The client
    // sent bad input; the SERVER reports that it is broken.
    var raw = ctx.Request.Query["page"].ToString();
    var page = raw.Length == 0 ? 0 : int.Parse(raw);

    // The off-by-one, in one expression: page 0 is the first page. Every REST
    // API in the world starts at page 1, so every client here is off by
    // exactly twenty products, forever.
    var start = page * 20;

    // GetRange throws ArgumentOutOfRangeException when start is negative
    // (?page=-1) and when start is past the end (?page=9999). Two more 500s
    // reachable from the address bar.
    var slice = products.GetRange(start, Math.Min(20, products.Count - start));

    // And notice what's missing from the response: how many products exist,
    // how many pages there are, whether this is the last one. The client gets
    // twenty objects and has to guess. "Is there a next page?" is answered by
    // requesting it and seeing whether the server crashes.
    return Results.Ok(slice);
});

// ---------------------------------------------------------------------------
// FLAW #3: sorting by whatever the client types.
// ---------------------------------------------------------------------------
app.MapGet("/products/sorted", (string sort) =>
{
    // Reflection driven by a query string. Two problems, both bad:
    //   1. An unknown name gives null -> NullReferenceException -> 500.
    //      "?sort=pirce" is a typo; the response is a stack trace.
    //   2. Every property name on Product is now part of your public API. Add
    //      an internal CostPrice or SupplierMargin property one day and it is
    //      instantly sortable — and therefore *guessable* — by strangers.
    var prop = typeof(Product).GetProperty(sort);
    return Results.Ok(products.OrderBy(p => prop!.GetValue(p)).Take(20));
});

app.Run("http://localhost:5034");

record Product(int Id, string Name, string Category, decimal Price, int Stock);
