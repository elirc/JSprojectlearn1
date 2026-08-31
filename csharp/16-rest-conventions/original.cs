#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// original.cs — a books API that works, but speaks a private dialect.
// Every route is a made-up verb phrase (getBook, addBook, deleteBook...),
// every answer is 200 — even "book not found" — and deleting happens via
// POST. Clients must read our source code to know what anything means.
//
// Run:   dotnet run csharp/16-rest-conventions/original.cs
// Then:  curl http://localhost:5016/getAllBooks

using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var books = new List<Book>
{
    new Book { Id = 1, Title = "Dune", Author = "Frank Herbert" },
    new Book { Id = 2, Title = "Emma", Author = "Jane Austen" },
};
var nextId = 3;

// "getAllBooks" — plural. The next route is "getBook" — singular. There is
// no system, so every caller has to memorize each route individually.
app.MapGet("/getAllBooks", () => Results.Json(books));

app.MapGet("/getBook", (HttpRequest req) =>
{
    // the id rides in the query string: /getBook?id=3
    string? idRaw = req.Query["id"];
    if (idRaw == null || !int.TryParse(idRaw, out var id))
        return Results.Json(new { error = "bad or missing id" });      // 200!

    foreach (var b in books)
        if (b.Id == id) return Results.Json(b);

    return Results.Json(new { error = "book not found" });             // 200!
});

app.MapPost("/addBook", (JsonElement body) =>
{
    if (!body.TryGetProperty("title", out var t) || t.ValueKind != JsonValueKind.String
        || t.GetString()!.Trim().Length == 0)
        return Results.Json(new { error = "title is required" });      // 200!

    var author = "unknown";
    if (body.TryGetProperty("author", out var a) && a.ValueKind == JsonValueKind.String)
        author = a.GetString()!;

    var book = new Book { Id = nextId++, Title = t.GetString()!.Trim(), Author = author };
    books.Add(book);
    return Results.Json(book);   // created something — still plain 200, no hint where it lives
});

// Deleting by POST, with the id in the query string. HTTP has a DELETE verb;
// this API just... doesn't use it.
app.MapPost("/deleteBook", (HttpRequest req) =>
{
    string? idRaw = req.Query["id"];
    if (idRaw == null || !int.TryParse(idRaw, out var id))
        return Results.Json(new { error = "bad or missing id" });      // 200!

    foreach (var b in books)
    {
        if (b.Id == id)
        {
            books.Remove(b);
            return Results.Json(new { ok = true });
        }
    }
    return Results.Json(new { error = "book not found" });             // 200!
});

// A whole route dedicated to one field. Tomorrow: /updateBookAuthor?
// /updateBookTitleAndAuthor? The route list grows with every feature.
app.MapPost("/updateBookTitle", (JsonElement body) =>
{
    if (!body.TryGetProperty("id", out var idProp) || idProp.ValueKind != JsonValueKind.Number)
        return Results.Json(new { error = "bad or missing id" });      // 200!
    if (!body.TryGetProperty("newTitle", out var t) || t.ValueKind != JsonValueKind.String
        || t.GetString()!.Trim().Length == 0)
        return Results.Json(new { error = "newTitle is required" });   // 200!

    var id = idProp.GetInt32();
    foreach (var b in books)
    {
        if (b.Id == id)
        {
            b.Title = t.GetString()!.Trim();
            return Results.Json(b);
        }
    }
    return Results.Json(new { error = "book not found" });             // 200!
});

app.Run("http://localhost:5016");

class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Author { get; set; } = "";
}
