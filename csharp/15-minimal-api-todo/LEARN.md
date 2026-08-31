# 📘 Learning Guide: Minimal API Todo

Read this before or alongside the README — this is your landing pad for *all* of ASP.NET Core, the web framework you'll use for the rest of the track.

## 1. What are we building?

A todo list API — a program that listens for HTTP requests and answers with JSON. You already built exactly this in js#65, where you hand-rolled everything on top of Node's bare `http` module. This time a framework does the plumbing, and the lesson is about where your *own* code should live.

The API speaks these routes:

| Method + path | Meaning |
|---|---|
| `GET /todos` | list all todos (optionally `?filter=done` or `?filter=open`) |
| `GET /todos/3` | one todo, or 404 |
| `POST /todos` | create from JSON `{"title": "..."}` |
| `PUT /todos/3` | replace title/done |
| `POST /todos/3/toggle` | flip done |
| `DELETE /todos/3` | remove |

## 2. Concepts you need first

### What a web framework actually does

Remember what you wrote *by hand* in js#65? Routing was an if/else ladder doing string surgery on `req.url`. Body parsing was collecting chunks off a stream. Every response needed you to set the status code, the `Content-Type` header, and `JSON.stringify` yourself. A **web framework** is that plumbing, written once, properly:

- **Routing** — you declare "this path + method runs this function," including patterns like `/todos/{id}`; the framework matches and extracts.
- **JSON in/out** — return a C# object, get a JSON response with the right headers; declare a parameter, the request body is parsed into it.
- **Status codes** — helpers like `Results.NotFound()` instead of hand-assembling responses.

**ASP.NET Core** is .NET's built-in web framework. It ships *inside* the SDK you already have — no packages, no npm-install equivalent, works offline.

### File-based web apps and `#:sdk`

Project cs#01–14 files started with nothing special. A *web* app needs the web half of the SDK, so `original.cs` starts with a directive line:

```csharp
#:sdk Microsoft.NET.Sdk.Web
```

That one line tells `dotnet run` "this single file is a web app" — it unlocks the ASP.NET Core types below. (The `#:property PublishAot=false` line next to it just silences build warnings you don't need yet.)

### The builder and the app

Every ASP.NET Core program starts with the same two-step ritual:

```csharp
var builder = WebApplication.CreateBuilder(args); // 1. gather configuration
var app = builder.Build();                        // 2. produce the running app

app.MapGet("/hello", () => "hi");                 // 3. declare routes

app.Run("http://localhost:5015");                 // 4. listen, forever
```

`builder` is where setup goes (you'll use it seriously in cs#18). `app` is the thing that owns routes. `app.Run(url)` is like js#65's `server.listen(3000)` — it blocks and serves until you press Ctrl+C. The URL says which port to claim; each project in this track gets its own (this one: **5015**).

### Declaring routes: `MapGet`, `MapPost`, and friends

```csharp
app.MapGet("/todos", () => todos);          // like Express's app.get
app.MapPost("/todos", () => ...);           // app.post
app.MapPut("/todos/{id}", (int id) => ...); // app.put, with a route parameter
app.MapDelete("/todos/{id}", (int id) => ...);
```

The second argument is a **lambda** — an inline function, same idea as a JS arrow function. Compare with js#65's original, where "routing" was `if (url === "/todos" && method === "GET")`. Here the framework keeps the route table.

`{id}` in the path is a **route parameter**. Declare a lambda parameter with the same name and the framework hands you the value — *converted to the declared type*. `(int id)` means `/todos/3` arrives as the integer `3`. In the refactor you'll see `{id:int}`, a **route constraint** — "only match if this segment is a number."

### Automatic JSON, in both directions

Out: return any object and it becomes a JSON response, `Content-Type` and all. `record Todo(int Id, string Title, bool Done)` serializes as `{"id":1,"title":"...","done":false}` — note the framework lower-cases property names to match JSON convention (camelCase).

In: declare a parameter of some type and the JSON body is parsed into it:

```csharp
public record CreateTodo(string? Title);
app.MapPost("/todos", (CreateTodo body) => ...); // {"title":"x"} → body.Title == "x"
```

This is called **model binding** (cs#17 goes deep on it). In js#65 you wrote `JSON.parse` on hand-collected stream chunks; here it's a parameter declaration.

### Results: speaking in status codes

Returning a raw object always means 200. For anything else, use the `Results` helpers, which produce an `IResult` — a value that says "status X, body Y":

```csharp
Results.Ok(todo)                  // 200 + JSON body
Results.Created($"/todos/3", todo) // 201 + Location header — "made it, it lives here"
Results.NoContent()               // 204 — "done, nothing to say"
Results.BadRequest(new { error = "..." }) // 400 — "your input is wrong"
Results.NotFound()                // 404
```

You met these numbers in js#65; cs#16 turns them into a full vocabulary lesson.

### `new { error = "..." }` — anonymous objects

That's an **anonymous object**: a one-off shape with no named record, handy for tiny JSON replies. Like a JS object literal `{ error: "..." }`.

### Query strings

`/todos?filter=done` — everything after `?` is the **query string**. Declare `(string? filter)` and the framework fills it from `?filter=...`, or leaves it `null` when absent. (The original digs it out of `req.Query` by hand.)

### `JsonDocument` / `JsonElement` — JSON the hard way

The original binds bodies as `JsonElement` — a "raw JSON tree" you interrogate manually: `body.TryGetProperty("title", out var p)`, check `p.ValueKind`, call `p.GetString()`. It's C#'s equivalent of rooting around in an untyped `JSON.parse` result. You'll see why the typed-record way beats it.

### curl — poking a server from the command line

`curl URL` makes a GET request and prints the body. The flags you need today:

```
curl -X POST <url>            # choose the method
     -H "Content-Type: application/json"   # a request header
     -d "{\"title\":\"x\"}"   # the body (quotes escaped for the shell)
     -i                       # also print status line + headers
```

A browser address bar can only do GETs — fine for `/todos`, useless for POST. That's why curl.

## 3. Walking through the original code

Open `original.cs`. After the builder ritual, the "database":

```csharp
var todos = new List<Dictionary<string, object>>();
```

A list of dictionaries — each todo is a bag of key/value pairs, like a JS object used as a map. Nothing anywhere states that a todo has `id`, `title`, `done`. Every endpoint just *knows*, and casts: `(int)t["id"]`, `(bool)t["done"]`.

`GET /todos` reads `req.Query["filter"]` and walks the list with inline skip logic. `GET /todos/{id}` does a find-by-id loop. `POST /todos` digs `title` out of a `JsonElement`, validates it (required, non-blank), scans the list for the max id to make a new one, builds a dictionary, returns 201.

Then `PUT /todos/{id}`: the find-by-id loop *again* (copy #2), the title validation *again* (copy #2). Then toggle: loop copy #3. Then DELETE: loop copy #4.

Count with me: **four copies** of find-by-id, **two copies** of validation, plus inline filtering and id generation. Each copy is welded inside a lambda that only runs when a real HTTP request arrives.

## 4. What's wrong with it (in beginner terms)

**1. You can't test any of it without a server.** "Is an all-spaces title rejected?" The only way to know is: start the app, send a crafted request, read the response. Cs#01's question — *how would you test this?* — has the same bad answer as ever: you can't, because deciding (is the title valid? which todo has id 3?) and doing (HTTP) are welded together.

**2. Duplication means the copies will drift.** Suppose titles must now also be under 200 characters. You must fix POST *and* PUT. Miss one — and nothing warns you — and now creating rejects a long title while renaming accepts it. Your API disagrees with itself, and only a user finds out.

**3. `Dictionary<string, object>` throws away the compiler.** The whole reason you're in C# is that the compiler is your first test suite. Write `t["tittle"]` or cast `t["done"]` to `int` and it compiles fine — you get a runtime exception, on some request, someday. A record would make both mistakes impossible to compile.

**4. Endpoints have two jobs.** Each lambda both *translates HTTP* and *makes business decisions*. Two jobs per function is exactly the tangle every previous project untied.

## 5. Try it yourself first!

Before reading the refactor, try the surgery yourself. Hints, vaguest first:

1. 🌱 What *shape* is a todo? Say it once, in one place, with a record.
2. 🌿 Write a plain class `TodoService` holding a `List<Todo>`. Move one decision into it — start with the find-by-id loop (all four copies become one `Get(int id)` method).
3. 🌳 Move the rest: `Add(string? title)` (returns `null` when invalid), `Toggle`, `Update`, `Remove`, `Filter`. No `Results.*`, no `HttpRequest` allowed inside the class — that's the discipline.
4. 🍎 Now shrink every endpoint to one line: bind input → call the service → wrap the answer in `Results.Ok` / `Created` / `NotFound` / `BadRequest`. Then write tests that `new TodoService()` and call methods — no server anywhere.

## 6. Understanding the refactored solution

**`Todo.cs` — the shape, stated once.**

```csharp
public record Todo(int Id, string Title, bool Done);
public record CreateTodo(string? Title);
```

`Todo` is what we store and return. `CreateTodo` is what clients may *send* — its `Title` is `string?` because clients forget fields; validation decides what happens then. Two shapes, because "what exists" and "what you're allowed to ask for" are different things.

**`TodoService.cs` — all the decisions, zero HTTP.** The four loops became:

```csharp
public Todo? Get(int id) => _todos.FirstOrDefault(t => t.Id == id);
```

One line of LINQ (cs#04). Validation lives in exactly one place now:

```csharp
public Todo? Add(string? title)
{
    if (string.IsNullOrWhiteSpace(title)) return null;
    var todo = new Todo(_nextId++, title.Trim(), Done: false);
    _todos.Add(todo);
    return todo;
}
```

Returning `Todo?` is the honest signature from cs#05: "you get a todo, or you get null and it's your job to check." Updates use records' `with` (cs#07): `_todos[index] with { Done = !_todos[index].Done }` — a copy with one field changed, no mutation-in-place surprises.

**`Program.cs` — one line per endpoint.**

```csharp
var todos = app.MapGroup("/todos");
todos.MapGet("/{id:int}", (int id) =>
    service.Get(id) is Todo t ? Results.Ok(t) : Results.NotFound());
```

`MapGroup("/todos")` states the prefix once; the routes inside are relative. Each endpoint is pure translation: pattern-match the service's answer, pick the status code. If a line here had a bug, it could only be a *translation* bug — the decisions are elsewhere, under test.

**`Tests.cs` — the payoff.** Every rule is checked by constructing a `TodoService` and calling methods:

```csharp
var svc = new TodoService();
Check.Equal(null, svc.Add("   "), "a whitespace-only title is rejected");
```

No port, no curl, no server. 28 checks run in a blink — the exact tests that were *impossible* to write against the original.

## 7. Words you learned (glossary)

- **Web framework** — a library that handles HTTP plumbing (routing, JSON, status codes) so you write handlers, not parsers.
- **ASP.NET Core** — .NET's built-in web framework; ships with the SDK.
- **Minimal API** — the ASP.NET Core style you're using: `app.MapGet(path, lambda)` with no ceremony.
- **`#:sdk` directive** — first line of a file-based app choosing which SDK flavor it needs (`Microsoft.NET.Sdk.Web` for web apps).
- **Builder pattern** — configure on a `builder` object, then `Build()` the real thing.
- **Endpoint** — one route + handler pair.
- **Route parameter** — a `{name}` segment in a path, bound to a handler parameter.
- **Route constraint** — `{id:int}`: only match when the segment fits the type.
- **Query string** — the `?key=value` part of a URL.
- **Model binding** — the framework turning request parts (body, route, query) into typed parameters.
- **DTO** — data transfer object; a record describing what crosses the wire (`CreateTodo`).
- **`IResult` / `Results`** — values representing "status code + body" (`Results.NotFound()` etc.).
- **Anonymous object** — `new { error = "x" }`, a one-off shape for tiny JSON replies.
- **`JsonElement`** — a raw parsed-JSON node you query by hand; the untyped alternative to binding.
- **`MapGroup`** — declare a shared URL prefix once for a set of endpoints.
- **Service class** — a plain class owning state + rules, with no HTTP in it.
- **curl** — command-line HTTP client; `-X` method, `-H` header, `-d` body, `-i` show status/headers.

## 8. Experiments to try on the plane (no internet needed)

A server on `localhost` is a program talking to *your own machine* — no wifi involved, works at 35,000 feet. Start it in one terminal, curl from another.

1. **See both apps behave identically.** Run the original, then the refactored, and fire the same requests: `curl -i -X POST http://localhost:5015/todos -H "Content-Type: application/json" -d "{\"title\":\"pack socks\"}"` → expect `201` with `{"id":1,"title":"pack socks","done":false}`. Then `curl http://localhost:5015/todos/1` → the same todo. Refactoring changed the *inside* only — that's the definition.
2. **Trip the validation.** `curl -i -X POST http://localhost:5015/todos -H "Content-Type: application/json" -d "{\"title\":\"   \"}"` → expect `400` and `{"error":"title must not be empty"}`. Now find the ONE place in `TodoService.cs` that decided that.
3. **Break a test on purpose.** In `TodoService.Add`, delete the `IsNullOrWhiteSpace` check and run `dotnet run --project csharp/15-minimal-api-todo/refactored -- test`. Expect 3 FAILs naming exactly what broke. Put it back; green again. That's your safety net — the original had none.
4. **Add a rule in one place.** In `Add` (and `Update`), reject titles over 200 chars. Write a test with `new string('x', 201)` first, watch it fail, then make it pass. Count how many *endpoints* you touched: zero.
5. **Feel a route constraint.** `curl -i http://localhost:5015/todos/abc` → `404` from the refactor (the `{id:int}` route simply doesn't match). Try the same against the original — its `{id}` binds an `int` too, so ASP.NET answers `400 Bad Request` for you. Different, defensible choices — the point is *you* now know who's answering.
6. **Restart and notice the data is gone.** Add todos, Ctrl+C the server, start it again, `curl http://localhost:5015/todos` → `[]`. In-memory state dies with the process — cs#21 fixes exactly this.
