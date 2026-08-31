// Program.cs — the whole API is one resource ("books"), five standard verbs,
// and honest status codes. A client who has seen ANY REST API can guess
// every route below without reading our code. That's the point.

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var store = new BookStore();
store.Add("Dune", "Frank Herbert");
store.Add("Emma", "Jane Austen");

var books = app.MapGroup("/books");

// GET /books — the collection
books.MapGet("/", () => store.All());

// GET /books/3 — one item, or an honest 404
books.MapGet("/{id:int}", (int id) =>
    store.Get(id) is Book b ? Results.Ok(b) : Results.NotFound());

// POST /books — create; 201 tells the client "made", Location says where
books.MapPost("/", (BookInput body) =>
    store.Add(body.Title, body.Author) is Book b
        ? Results.Created($"/books/{b.Id}", b)
        : Results.BadRequest(new { error = "title must not be empty" }));

// PUT /books/3 — replace the whole book
books.MapPut("/{id:int}", (int id, BookInput body) =>
    store.Get(id) is null ? Results.NotFound()
    : store.Update(id, body.Title, body.Author) is Book b ? Results.Ok(b)
    : Results.BadRequest(new { error = "title must not be empty" }));

// DELETE /books/3 — the verb that already existed; 204 = "done, nothing to say"
books.MapDelete("/{id:int}", (int id) =>
    store.Remove(id) ? Results.NoContent() : Results.NotFound());

app.Run("http://localhost:5016");
