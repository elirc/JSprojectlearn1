# CS 16 — rest-conventions

**Lesson: REST is a shared vocabulary — resources as nouns, HTTP methods as
verbs, status codes as replies. Speak it and clients can guess your API.**

## Run it

```
dotnet run csharp/16-rest-conventions/original.cs
dotnet run --project csharp/16-rest-conventions/refactored
dotnet run --project csharp/16-rest-conventions/refactored -- test
```

Try both dialects (server running, second terminal):

```
curl http://localhost:5016/getAllBooks                # original's dialect
curl -i "http://localhost:5016/getBook?id=99"         # "error" ... with status 200!

curl http://localhost:5016/books                      # refactored
curl -i http://localhost:5016/books/99                # honest 404
curl -i -X POST http://localhost:5016/books -H "Content-Type: application/json" -d "{\"title\":\"Dune\",\"author\":\"Frank Herbert\"}"
curl -i -X DELETE http://localhost:5016/books/1       # 204 No Content
```

## What's wrong with the original?

1. **Routes are invented verb phrases** — `/getAllBooks`, `/getBook`,
   `/addBook`, `/updateBookTitle`. No system: plural here, singular there,
   one route per field edited. Every new feature mints a new route name that
   every client must learn from our source code.
2. **Everything returns 200** — including "book not found". Callers must
   parse the body to discover failure; generic HTTP tooling (caches,
   monitors, `fetch`'s `res.ok`) is blind to errors.
3. **Delete via POST** with the id in a query string, ignoring the DELETE
   verb HTTP already defines.
4. **Creation gives no address** — plain 200, no hint that `/getBook?id=3`
   is where the new book now lives.

## What changed in the refactor

One noun, five standard sentences (the whole route table):

| Original (RPC dialect)         | Refactored (REST)     | Store method     | Replies |
|--------------------------------|-----------------------|------------------|---------|
| `GET /getAllBooks`             | `GET /books`          | `All()`          | 200 |
| `GET /getBook?id=3`            | `GET /books/3`        | `Get(3)`         | 200 / **404** |
| `POST /addBook`                | `POST /books`         | `Add(...)`       | **201 + Location** / 400 |
| `POST /updateBookTitle`        | `PUT /books/3`        | `Update(3, ...)` | 200 / 404 / 400 |
| `POST /deleteBook?id=3`        | `DELETE /books/3`     | `Remove(3)`      | **204** / 404 |

- The id moved into the path — `{id:int}` — because it names *which resource*.
- A pure `BookStore` owns the data and rules; endpoints only translate its
  answers (`null` → 404, `false` → 404, book → 200/201) — and Tests.cs
  hits the store directly, missing-id cases included.

## Key takeaway

Conventions are compression. The original forces every client to memorize
five bespoke routes and parse bodies to detect errors; the refactor is one
noun plus grammar the whole web already knows. When there's a widely-shared
convention, *speaking it* is a design feature — surprise is cost.
