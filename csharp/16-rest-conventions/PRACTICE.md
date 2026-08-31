# 🏋️ Practice: REST Conventions

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Filter the collection by author (warm-up)

Support `GET /books?author=herbert`: only books whose author *contains* the query text
(case-insensitive). No query string → the whole collection, unchanged.
*Practices:* query parameters as collection filters (the REST way — no `/getBooksByAuthor` route!).
**Hint:** give `All` an optional `string? author = null` parameter so existing callers still compile.
**Check offline:** `curl "http://localhost:5016/books?author=austen"` → only Emma;
`Check.Equal(1, store.All("herbert").Count, "author filter matches")` passes.

### ⭐⭐ 2. PATCH — edit only what was sent (core)

Add `PATCH /books/{id:int}`. Unlike PUT, a `null` field means "keep the current value": sending
`{"title":"Dune Messiah"}` renames without touching the author. A *present but blank* title is still
a 400; unknown ids are 404.
*Practices:* the PUT-vs-PATCH distinction from section 2, as real code.
**Hint:** `books.MapPatch(...)` exists. In the store, `title is null ? current.Title : title.Trim()`.
**Check offline:** add this Check test — it should pass:
`Check.Equal("Frank Herbert", store.Patch(1, "Dune Messiah", null)!.Author, "PATCH keeps unsent fields");`

### ⭐⭐ 3. Refuse duplicates with 409 Conflict (core)

Posting a book whose title *and* author already exist (case-insensitive) should answer
`409 Conflict` with `{"error":"that book already exists"}` — not create a second copy.
*Practices:* picking the right status word: 400 is "malformed input", 409 is "the current state forbids it".
**Hint:** a pure `store.Exists(title, author)` method keeps the endpoint a one-liner; remember the
store normalizes a missing author to `"unknown"`.
**Check offline:** POST the same Dune body twice — first `201`, second `409`. And
`Check.True(store.Exists("DUNE", "frank herbert"), "Exists ignores case")` passes.

### ⭐⭐ 4. Page through the collection (core)

Extend the collection route to `GET /books?page=2&pageSize=1`. Defaults: page 1, size 10; clamp
nonsense (`page=0`, `pageSize=9999`) instead of erroring. It must compose with exercise 1's author filter.
*Practices:* optional typed query binding + a pure LINQ paging pipeline.
**Hint:** `Skip((page - 1) * size).Take(size)` — after the author filter, before `ToList()`.
**Check offline:** with the two seeded books, `curl "http://localhost:5016/books?page=2&pageSize=1"` →
`[{"id":2,...}]`; `Check.Equal(0, store.List(null, 3, 2).Count, "past the end is empty")` passes.

### ⭐⭐⭐ 5. Upsert: PUT that creates (challenge)

Real REST PUT may *create* at the URL the client chose: `PUT /books/50` with a valid body should
create book 50 and answer `201 Created` (with Location), while a PUT to an existing id keeps
replacing and answering `200`. Blank titles stay 400. Make sure a later `POST /books` never reuses
id 50! Write the store method first, returning both the book and whether it was created.
*Practices:* the pure domain layer — one method, two honest outcomes, plus an id-collision rule.
**Hint:** return `(Book Book, bool Created)?` — `null` still means invalid; bump `_nextId` with `Math.Max`.
**Check offline:** `curl -i -X PUT http://localhost:5016/books/50 -H "Content-Type: application/json" -d "{\"title\":\"Hyperion\",\"author\":\"Dan Simmons\"}"` → `201`, then the same command again → `200`.

## Solutions

### 1. Author filter

```csharp
// BookStore.cs — replaces All()
public IReadOnlyList<Book> All(string? author = null) =>
    author is null
        ? _books
        : _books.Where(b => b.Author.Contains(author.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();

// Program.cs
books.MapGet("/", (string? author) => store.All(author));
```

WHY: REST keeps the noun (`/books`) and expresses "which ones" with query parameters — inventing
`/booksByAuthor` would restart the RPC sprawl the project just cured. The optional parameter means
`store.All()` call sites (Tests.cs included) compile untouched.

### 2. PATCH

```csharp
// BookStore.cs
/// Partial edit: null means "keep the current value". A present-but-blank title is rejected.
public Book? Patch(int id, string? title, string? author)
{
    if (title is not null && string.IsNullOrWhiteSpace(title)) return null;
    var index = _books.FindIndex(b => b.Id == id);
    if (index < 0) return null;
    var current = _books[index];
    _books[index] = current with
    {
        Title = title is null ? current.Title : title.Trim(),
        Author = author is null ? current.Author : author.Trim(),
    };
    return _books[index];
}

// Program.cs — same 404-then-400 ladder as PUT
books.MapPatch("/{id:int}", (int id, BookInput body) =>
    store.Get(id) is null ? Results.NotFound()
    : store.Patch(id, body.Title, body.Author) is Book b ? Results.Ok(b)
    : Results.BadRequest(new { error = "title must not be blank" }));
```

WHY: PUT means "the book is now exactly this", PATCH means "change only these fields" — so `null`
flips meaning from "missing → replace with default" to "missing → keep". That semantic difference
lives in the store method, where a two-line test can pin it down forever.

### 3. 409 Conflict

```csharp
// BookStore.cs
public bool Exists(string? title, string? author) =>
    title is not null && _books.Any(b =>
        string.Equals(b.Title, title.Trim(), StringComparison.OrdinalIgnoreCase)
        && string.Equals(b.Author, string.IsNullOrWhiteSpace(author) ? "unknown" : author.Trim(),
            StringComparison.OrdinalIgnoreCase));

// Program.cs — replaces the POST endpoint
books.MapPost("/", (BookInput body) =>
    store.Exists(body.Title, body.Author)
        ? Results.Conflict(new { error = "that book already exists" })
        : store.Add(body.Title, body.Author) is Book b
            ? Results.Created($"/books/{b.Id}", b)
            : Results.BadRequest(new { error = "title must not be empty" }));
```

WHY: the request is perfectly well-formed — it's the *state of the collection* that forbids it, and
409 is HTTP's word for exactly that. `Exists` mirrors `Add`'s "missing author becomes unknown" rule so
the two methods can't disagree about what counts as the same book.

### 4. Paging

```csharp
// BookStore.cs — one method for the whole collection query
public IReadOnlyList<Book> List(string? author, int? page, int? pageSize)
{
    IEnumerable<Book> result = _books;
    if (!string.IsNullOrWhiteSpace(author))
        result = result.Where(b => b.Author.Contains(author.Trim(), StringComparison.OrdinalIgnoreCase));
    var size = Math.Clamp(pageSize ?? 10, 1, 100);
    var p = Math.Max(page ?? 1, 1);
    return result.Skip((p - 1) * size).Take(size).ToList();
}

// Program.cs — replaces the collection GET (exercise 1 folds in)
books.MapGet("/", (string? author, int? page, int? pageSize) => store.List(author, page, pageSize));
```

WHY: `int?` lets *absent* be a real value so the store owns the defaults — putting `?? 10` in the
endpoint would smuggle policy back into HTTP-land. Clamping instead of 400-ing is a deliberate,
defensible choice for paging: a too-big page size is a preference, not a protocol violation.

### 5. Upsert

```csharp
// BookStore.cs
/// PUT-with-create semantics. Returns null when the title is blank.
public (Book Book, bool Created)? Upsert(int id, string? title, string? author)
{
    if (string.IsNullOrWhiteSpace(title)) return null;
    var replacement = new Book(id, title.Trim(),
        string.IsNullOrWhiteSpace(author) ? "unknown" : author.Trim());
    var index = _books.FindIndex(b => b.Id == id);
    if (index < 0)
    {
        _books.Add(replacement);
        _nextId = Math.Max(_nextId, id + 1);   // POST must never mint id 50 again
        return (replacement, true);
    }
    _books[index] = replacement;
    return (replacement, false);
}

// Program.cs — replaces the PUT endpoint
books.MapPut("/{id:int}", (int id, BookInput body) =>
{
    var result = store.Upsert(id, body.Title, body.Author);
    if (result is null) return Results.BadRequest(new { error = "title must not be empty" });
    var (book, created) = result.Value;
    return created ? Results.Created($"/books/{book.Id}", book) : Results.Ok(book);
});
```

WHY: PUT is idempotent either way — run it twice and book 50 is the same book, which is why upsert is
legal PUT while it could never be POST. The store reports the *fact* (`Created` or replaced) and the
endpoint translates it into the two honest codes. The `Math.Max` line is the part everyone forgets:
without it the next `POST` would hand out id 50 again and silently overwrite by duplicate id.
