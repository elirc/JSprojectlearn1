# 📘 Learning Guide: REST Conventions

Read this before or alongside the README — cs#15 taught you the machinery (MapGet, Results, routes); this project teaches the *language* you should speak with it.

## 1. What are we building?

A books API, twice. Both versions store books in memory and let clients list, fetch, add, rename, and delete them. The **original** invents a private dialect: `/getAllBooks`, `/getBook?id=3`, `/addBook`, `/deleteBook` (via POST!), `/updateBookTitle` — and answers `200 OK` to *everything*, even "book not found". The **refactor** says the same things in REST, the shared dialect of the web: one noun (`/books`), the verbs HTTP already has, and honest status codes.

Nothing about the *features* changes. What changes is how much a stranger can guess.

## 2. Concepts you need first

### RPC thinking vs resource thinking

The original's routes are **RPC**-style ("remote procedure call"): each URL is the name of a *function* the client invokes — `getBook`, `addBook`, `updateBookTitle`. That's how you name functions in code, so it feels natural. But it scales badly: every new operation mints a new route name (`updateBookAuthor`? `deleteAllBooksByAuthor`?), and no two teams invent the same names.

**REST** ("representational state transfer" — the name matters less than the habit) flips it: URLs name *things* (**resources**), and the small fixed set of HTTP methods supplies the verbs. You stop inventing sentences and start combining:

- **Nouns**: `/books` (the collection), `/books/3` (one book).
- **Verbs**: GET, POST, PUT, DELETE — already defined by HTTP.
- **Replies**: status codes — already defined by HTTP.

### The verbs (HTTP methods) as a grammar

| Verb | On a collection `/books` | On one item `/books/3` |
|---|---|---|
| GET | list them | fetch it |
| POST | create a new one | (rare) |
| PUT | (rare) | replace it entirely |
| DELETE | (rare) | remove it |

Two verb properties worth knowing, because tooling relies on them:

- **Safe**: GET must not change anything. Browsers prefetch GETs, proxies cache them, crawlers follow them. A `GET /deleteBook?id=3` would be a landmine.
- **Idempotent**: doing it twice = doing it once. PUT and DELETE are idempotent (replace twice, same result; delete twice, still gone). POST is not (post twice, two books). This is why "retry the request" logic in every HTTP library feels free to retry PUT/DELETE but hesitates on POST.

### The replies (status codes) as vocabulary

You saw codes in js#65 and cs#15; here's the working set as *words*:

- **200 OK** — "here's what you asked for."
- **201 Created** — "made it." Comes with a **Location header**: the URL where the new thing now lives. In ASP.NET Core: `Results.Created($"/books/{b.Id}", b)`.
- **204 No Content** — "done; nothing to say." The natural reply to DELETE. There is literally no body.
- **400 Bad Request** — "your input is wrong" (blank title).
- **404 Not Found** — "that resource doesn't exist." `Results.NotFound()`.

The deep rule: **the status line is machine-readable truth**. Bodies are for humans and details; codes are for software. `fetch`'s `res.ok`, caches, uptime monitors, load balancers, curl's `-f` flag — all of them read the code and none of them read your `{"error": ...}` body.

### Why "200 with an error body" is a real bug factory

```js
// a client of the ORIGINAL — this code LIES silently
const res = await fetch("http://localhost:5016/getBook?id=99");
if (res.ok) {                 // true! 200!
  const book = await res.json();
  render(book.title);         // undefined — "error" bodies have no title
}
```

The client took the success branch on a failure. With an honest 404, `res.ok` is `false` and the failure path runs *without the client parsing anything*. Every generic tool in the pipeline gets smarter the moment your codes tell the truth.

### Route parameters, again — `{id:int}`

cs#15 introduced `{id}`; here it earns its keep. `/books/{id:int}` moves the identity *into the path* — the URL literally names the resource, which is what makes `Location: /books/3` and caching meaningful. The `:int` **route constraint** means `/books/abc` doesn't even match the route (you get a 404 without your code running). The framework parses the id and hands your lambda a real `int` — compare the original's `req.Query["id"]` + `int.TryParse` dance.

### PUT means *replace*

PUT `/books/3` with `{"title":"Dune","author":null}` means "the book is now exactly this". That's why the refactored `Update` sets a missing author to `"unknown"` rather than keeping the old one — full replacement, and doing it twice gives the same result (idempotent). (Partial edits have their own verb, PATCH — mentioned so you recognize it; we don't need it here.)

### Naming conventions

Tiny rules that keep APIs guessable: resource names are **plural nouns** (`/books`, not `/book` or `/bookList`), lowercase, no verbs in the path (the method *is* the verb). The original violates all three, differently on each route — that inconsistency is itself the lesson.

## 3. Walking through the original code

Open `original.cs`. The data is two seeded `Book` objects (a mutable class with get/set properties — fine here; the routes are today's crime scene).

`GET /getAllBooks` — fine-ish, if you squint past the name. Then:

`GET /getBook` — the id arrives as `?id=3`. The handler pulls `req.Query["id"]` (a string), `TryParse`s it, loops to find the book... and when nothing matches: `return Results.Json(new { error = "book not found" });` — which defaults to **200**. The body admits failure; the status line swears success.

`POST /addBook` — digs `title` out of a raw `JsonElement` (the cs#15 way we already retired), appends the book, returns it with 200 — no 201, no Location, so the client that just created book 7 has no idea `/getBook?id=7` is its address, except by convention it invented itself.

`POST /deleteBook?id=3` — a POST that destroys data, id in the query string. And `POST /updateBookTitle` — a route *per field*. Notice the shape of the future: every feature adds a bespoke route, and the route list becomes a private language only this codebase speaks.

Also notice: five endpoints, and the find-by-id loop is pasted in three of them (cs#15's disease, still uncured).

## 4. What's wrong with it (in beginner terms)

**1. Clients must read your source code.** There's no pattern to extrapolate. Knowing `/getAllBooks` exists tells you nothing about how to delete — is it `/deleteBook`? `/removeBook`? GET or POST? Query string or body? Every question needs your docs. In the refactor, a developer who has used *any* REST API guesses all five routes on the first try.

**2. Lying status codes break real tools.** `res.ok` is true on failure. A monitoring dashboard shows 100% success while every lookup fails. An HTTP cache happily caches your "error" body. Status codes are the contract that lets strangers' software cooperate with yours; 200-for-everything opts out of the whole ecosystem.

**3. Delete-by-POST and GETs that will someday mutate.** Once verbs stop meaning anything, nothing protects you: someone adds `GET /resetLibrary` "just for testing", a crawler or a browser prefetch hits it, and the library is gone. True story, many times over, across the industry.

**4. The route list grows without bound.** `/updateBookTitle` today, `/updateBookAuthor` tomorrow, `/updateBookTitleAndAuthor` by Friday. RPC naming has no grammar, so there's nothing to stop the sprawl. REST's fixed verb set forces the growth into *nouns*, which is where it belongs.

## 5. Try it yourself first!

Rewrite the original's API surface in REST. Hints, vaguest first:

1. 🌱 What is the *noun* in this API? There's exactly one. All five routes should be spellings of it.
2. 🌿 Map each old route to method + path: list, fetch-one, create, replace, delete. Where does the id go? (Into the path: `{id:int}`.)
3. 🌳 Now the replies. Which cases are 404? Which is 201 (and what goes in `Location`)? What does DELETE return when it succeeds — and when the id doesn't exist?
4. 🍎 Pull the data + rules into a `BookStore` class (cs#15's move) whose methods return `Book?` / `bool`, so each endpoint is one line translating that answer into a status code. Then write tests against the store, especially the missing-id cases.

## 6. Understanding the refactored solution

**`BookStore.cs`** — `record Book(int Id, string Title, string Author)` plus a store with `All / Get / Add / Update / Remove`. Same layering as cs#15; note the honest signatures: `Get` returns `Book?` ("maybe there's no such book"), `Remove` returns `bool` ("did I actually delete anything?"). Those returns are *exactly* the information the endpoints need to pick a status code — the store decides facts, the endpoint translates them to HTTP words.

**`Program.cs`** — the whole API in five sentences:

```csharp
var books = app.MapGroup("/books");
books.MapGet("/", () => store.All());
books.MapGet("/{id:int}", (int id) =>
    store.Get(id) is Book b ? Results.Ok(b) : Results.NotFound());
books.MapPost("/", (BookInput body) =>
    store.Add(body.Title, body.Author) is Book b
        ? Results.Created($"/books/{b.Id}", b)
        : Results.BadRequest(new { error = "title must not be empty" }));
```

Read the POST line aloud: "try to add; if a book comes back, reply 201 and tell them where it lives; otherwise 400." The `Results.Created` call is the whole 201+Location convention in one helper. DELETE translates `Remove`'s bool: `true` → 204, `false` → 404.

`PUT /books/{id:int}` checks `Get` first (unknown id → 404) and only then validates via `Update` (blank title → 400) — two different failures, two different words, exactly what a client needs to react correctly.

**`Tests.cs`** — no HTTP, yet every status-code decision is covered, because each one is just a translation of a store answer the tests pin down: `Get(999)` is null, `Remove` twice is `false` the second time, `Update(999, ...)` doesn't invent a book. If the store's answers are right and the translations are one-liners, the API is right.

## 7. Words you learned (glossary)

- **RPC style** — URLs as function names (`/getBook`); every operation is a bespoke route.
- **REST** — URLs as nouns, HTTP methods as verbs, status codes as replies.
- **Resource** — a *thing* with a URL: `/books` (collection), `/books/3` (item).
- **Collection / item routes** — plural noun for the set; `/{id}` appended for one member.
- **Safe method** — changes nothing (GET). Tools assume this; never mutate on GET.
- **Idempotent** — twice = once (PUT, DELETE). Retry-friendly.
- **201 Created** — "new resource made"; pairs with the **Location header**, its address.
- **204 No Content** — success with deliberately empty body; DELETE's natural reply.
- **404 Not Found** — the resource named by the URL doesn't exist.
- **400 Bad Request** — the input was malformed or invalid.
- **Route constraint** — `{id:int}`: the route only matches when the segment parses as that type.
- **PUT vs PATCH** — replace-entirely vs edit-some-fields.
- **`res.ok`** — fetch's shortcut for "status 200–299"; one of many tools that trust your codes.

## 8. Experiments to try on the plane (no internet needed)

localhost is your own machine — every experiment here works in airplane mode. Run one server at a time (both use port 5016).

1. **Catch the original lying.** `curl -i "http://localhost:5016/getBook?id=99"` → `HTTP/1.1 200 OK` with `{"error":"book not found"}`. Then run the refactor: `curl -i http://localhost:5016/books/99` → `HTTP/1.1 404 Not Found`. Same fact, but now the status line tells the truth.
2. **Follow a 201's Location.** `curl -i -X POST http://localhost:5016/books -H "Content-Type: application/json" -d "{\"title\":\"Hyperion\",\"author\":\"Dan Simmons\"}"` → look for `Location: /books/3` in the headers, then `curl http://localhost:5016/books/3` → your book. Creation handed you its address.
3. **Feel idempotency.** `curl -i -X DELETE http://localhost:5016/books/1` → `204`. Run the *same command* again → `404`. The resource-level outcome is the same (book 1 is gone) — and the second reply honestly says "there's nothing here." Now POST the same book twice → two different ids. That's why POST isn't idempotent.
4. **Watch the route constraint work.** `curl -i http://localhost:5016/books/abc` → 404: the `{id:int}` route never matched, no handler ran, no `TryParse` needed. In the original, `/getBook?id=abc` needed hand-written parsing to survive.
5. **Test a 404 without a server.** In `Tests.cs`, add: `Check.Equal(null, new BookStore().Get(42), "empty store has no book 42");` and re-run tests. You just tested a 404 path with zero HTTP — because the *decision* lives in the store, and 404 is only its translation.
6. **Design on paper: add reviews.** Books have reviews; sketch the REST routes. Expected shape: `GET /books/3/reviews`, `POST /books/3/reviews`, `DELETE /books/3/reviews/7` — nested nouns, same five verbs, zero new vocabulary. That's the grammar paying rent.
