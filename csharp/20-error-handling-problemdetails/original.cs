#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// (That second line just silences native-AOT trimming warnings that
// file-based web apps emit for reflection-based JSON — ignore it.)
//
// 20 — error handling (ORIGINAL, flawed on purpose)
//
// An inventory API where every endpoint wraps its whole body in try/catch and
// invents its OWN error format. Three different error shapes, one swallowed
// exception, and a domain layer that throws generic Exception for everything.
//
// Run:   dotnet run csharp/20-error-handling-problemdetails/original.cs
// Try:
//   curl -i http://localhost:5020/items
//   curl -i http://localhost:5020/items/99
//        -> 500 {"err":"no item with id 99"}                    (shape #1 — and why 500?!)
//   curl -i -X POST http://localhost:5020/items/3/purchase
//        -> run twice; second time: 400 {"message":"...","ok":false}  (shape #2)
//   curl -i -X POST "http://localhost:5020/items?name=&category=paper&stock=-1"
//        -> 500 plain text "ERROR: name is required"            (shape #3)
//   curl -i "http://localhost:5020/items/by-category/electronixs"
//        -> 200 []   <-- typo'd category, yet it LOOKS like success. THE BUG.

var app = WebApplication.CreateBuilder(args).Build();

var items = new List<Item>
{
    new() { Id = 1, Name = "Keyboard", Category = "electronics", Stock = 12 },
    new() { Id = 2, Name = "Notebook", Category = "paper",       Stock = 40 },
    new() { Id = 3, Name = "Webcam",   Category = "electronics", Stock = 1  },
};

app.MapGet("/items", () => items);

app.MapGet("/items/{id}", (int id) =>
{
    try
    {
        return Results.Ok(Inventory.Find(items, id));
    }
    catch (Exception ex)
    {
        // Error shape #1: {"err": "..."} — and a 500, even though "not found"
        // is the CLIENT asking for something that isn't there (should be 404).
        return Results.Json(new { err = ex.Message }, statusCode: 500);
    }
});

app.MapGet("/items/by-category/{category}", (string category) =>
{
    try
    {
        return Results.Ok(Inventory.ByCategory(items, category));
    }
    catch
    {
        // "An exception here probably just means nothing matched." (It does NOT.)
        // ByCategory only throws for a category that doesn't exist AT ALL — a
        // typo like /items/by-category/electronixs lands here, and the caller
        // gets 200 OK with []. That's indistinguishable from a real, empty
        // category. The frontend renders "no items yet" and NOBODY ever finds
        // out the request was wrong. This is THE BUG of this project:
        // a swallowed exception dressed up as success.
        return Results.Ok(new List<Item>());
    }
});

app.MapPost("/items", (string? name, string? category, int stock) =>
{
    try
    {
        return Results.Ok(Inventory.Add(items, name, category, stock));
    }
    catch (Exception ex)
    {
        // Error shape #3: raw text, no JSON at all — and 500 for what is
        // really the user's input problem (should be 400).
        return Results.Text("ERROR: " + ex.Message, "text/plain", statusCode: 500);
    }
});

app.MapPost("/items/{id}/purchase", (int id) =>
{
    try
    {
        return Results.Ok(Inventory.Purchase(items, id));
    }
    catch (Exception ex)
    {
        // Error shape #2: {"message": "...", "ok": false} — different keys,
        // different status. And because the domain throws plain Exception for
        // EVERYTHING, "no item with id 99" (a 404 story) and "out of stock"
        // (a 409 story) both come out as 400 here. The catch block cannot
        // tell them apart — the exception type carries no information.
        return Results.BadRequest(new { message = ex.Message, ok = false });
    }
});

app.Run("http://localhost:5020");

class Item
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public int Stock { get; set; }
}

static class Inventory
{
    public static readonly string[] KnownCategories = { "electronics", "paper", "furniture" };

    // Generic Exception for every failure — the caller can't tell "not found"
    // from "out of stock" from "bad input" without parsing message strings.
    public static Item Find(List<Item> items, int id)
        => items.FirstOrDefault(i => i.Id == id)
           ?? throw new Exception($"no item with id {id}");

    public static List<Item> ByCategory(List<Item> items, string category)
    {
        if (!KnownCategories.Contains(category))
            throw new Exception($"unknown category '{category}'");
        return items.Where(i => i.Category == category).ToList();
    }

    public static Item Purchase(List<Item> items, int id)
    {
        var item = Find(items, id);
        if (item.Stock <= 0)
            throw new Exception($"'{item.Name}' is out of stock");
        item.Stock--;
        return item;
    }

    public static Item Add(List<Item> items, string? name, string? category, int stock)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new Exception("name is required");
        if (category is null || !KnownCategories.Contains(category))
            throw new Exception($"unknown category '{category}'");
        if (stock < 0)
            throw new Exception("stock cannot be negative");
        var item = new Item
        {
            Id = items.Max(i => i.Id) + 1,
            Name = name.Trim(),
            Category = category,
            Stock = stock,
        };
        items.Add(item);
        return item;
    }
}
