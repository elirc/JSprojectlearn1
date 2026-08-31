# 📘 Learning Guide: Fullstack Todo

Read this before or alongside the README — it teaches every concept the README assumes, and walks one click through the entire stack.

## 1. What are we building?

A todo list — again! You built one in the browser (js#14) and an API for one (js#65, cs#15). This time you build **both halves and wire them together**: an ASP.NET Core server that owns the data and the rules, and a plain-JavaScript page that shows the data and sends changes back. That's what "fullstack" means: frontend + backend + the agreement between them.

Both versions look similar in a browser. The difference:

- The **original** is one C# file where the server builds HTML strings, every button reloads the whole page, and the todo rules are written twice.
- The **refactor** serves a static page from `wwwroot/` that talks to a clean JSON API — no reloads, one copy of every rule, and tests for all of them.

## 2. Concepts you need first

### The client/server split
Two programs run at once. The **server** (C#, always running) owns the data. The **client** (JavaScript, in your browser tab) owns the screen. They only communicate through HTTP requests. Neither can call the other's functions directly — they can only exchange *messages*.

### HTTP verbs — the four you need
Every HTTP request names a **verb** (what to do) and a **path** (to what):

```
GET    /api/todos      read the list (never changes anything)
POST   /api/todos      create a new one
PUT    /api/todos/7    update the one with id 7
DELETE /api/todos/7    delete it
```

You met this in cs#16 (REST conventions). GET+POST+PUT+DELETE ≈ the CRUD you know: Create, Read, Update, Delete.

### Status codes — the response's one-word summary
Every response carries a number. The ones this project uses:

- `200 OK` — here's your data
- `201 Created` — made it; the `Location` header says where it now lives
- `204 No Content` — done, nothing to send back (perfect for DELETE)
- `400 Bad Request` — *your* input was invalid (blank text)
- `404 Not Found` — that id doesn't exist

The original returns `200 OK` for almost everything, even deleting a todo that was never there. Codes are the API's body language — clients rely on them.

### JSON — the shared language
The client speaks JavaScript, the server speaks C#. They exchange **JSON** text:

```json
{ "id": 3, "text": "buy milk", "done": false }
```

ASP.NET Core converts C# records ⇄ JSON automatically, using camelCase names (`Text` becomes `"text"`). On the JS side, `JSON.stringify` and `response.json()` do the same. Neither side ever parses text by hand.

### `fetch` — how JS makes requests
You know this from the JS track; here's the shape used all through `app.js`:

```js
const res = await fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'buy milk' }),
});
const todo = await res.json();   // parsed JSON body
```

`res.ok` is true for 2xx codes; `res.status` is the number itself.

### DTOs — the shapes HTTP speaks
A **DTO** (data transfer object) is a record that describes exactly what a request body may contain (cs#17):

```csharp
public record CreateTodoRequest(string? Text);
```

When an endpoint takes `CreateTodoRequest request` as a parameter, ASP.NET Core reads the JSON body and fills it in — model binding. Keeping DTOs separate from domain types means the API's shape and the domain's shape can change independently.

### Services and DI (recap of cs#18)
`builder.Services.AddSingleton<TodoService>();` registers one `TodoService` for the whole app. Any endpoint that lists `TodoService todos` as a parameter gets that instance handed to it — dependency injection. Singleton = one shared list, which is exactly right for in-memory data.

### Static files (recap of cs#24)
`app.UseDefaultFiles()` + `app.UseStaticFiles()` means: requests for `/` get `wwwroot/index.html`, and `/app.js`, `/style.css` are served as-is. The server stops being an HTML factory.

## 3. Walking through the original code

Open `original.cs`. One file, three layers of tangle:

```csharp
app.MapGet("/", () =>
{
    var total = 0; var done = 0;
    var items = "";
    foreach (var t in todos) { ... items += "<li>..." + t.Text + "..."; }
```

The page endpoint *is* the renderer: it loops the list, counts, and glues HTML strings — including `t.Text`, unescaped.

```csharp
app.MapPost("/add", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var text = form["text"].ToString();
    if (text != "") { todos.Add(new Todo { Id = nextId, Text = text }); nextId++; }
    ctx.Response.Redirect("/");
});
```

Each button on the page is a `<form method="post">`. The browser submits it, the server changes the list, then `Redirect("/")` tells the browser to load the whole page again. That's the reload you can see.

Then it all happens *again*:

```csharp
app.MapPost("/api/todos", async (HttpContext ctx) =>
{
    var todo = await ctx.Request.ReadFromJsonAsync<Todo>();
    if (todo == null || todo.Text.Trim() == "") return Results.BadRequest("bad todo");
```

The JSON API re-implements add/toggle/delete. Note the drift already: this copy calls `.Trim()`, the form copy doesn't. Same app, two sets of rules.

## 4. What's wrong with it (in beginner terms)

**1. The page-reload tax.** Every click throws away the entire page — scroll position, focus, half-typed text — to change one boolean. It works, but it feels like 1998, and it *has* to work that way because the server is the only thing that can draw.

**2. Two copies of the truth.** "What is a valid todo?" has two different answers in one file. Today it's trim vs no-trim. Next month someone adds a max length to one copy. Every rule change is now a scavenger hunt, and every missed copy is a bug that tests can't catch — because there are no tests, because...

**3. ...everything is welded to HTTP.** The rules live inside lambdas that need a running server, a socket, and a browser to execute. Project 01's question — "how would I test this?" — answer: you can't.

**4. The API misinforms.** 200 for creates, "OK" for deleting nothing. A client can't tell success from silent failure without re-fetching and diffing.

## 5. Try it yourself first!

Before reading the refactor, try fixing the original. Hints, vaguest first:

1. 🌱 Which code changes data, and which code shows data? Draw the line.
2. 🌿 Pull every rule into one class with methods like `Add`, `Toggle`, `Remove`, `Counts` — no `HttpContext` allowed inside. Make both the HTML endpoints and the JSON endpoints call it.
3. 🌳 Now delete the HTML endpoints entirely. Serve a static page from `wwwroot/` instead (you did this in cs#24) and use `fetch` for every action (js#14 + js#44).
4. 🍎 Give each API response its honest status code: 201 + Location for create, 204 for delete, 404 for unknown ids, 400 for blank text. Then write tests for the service class alone.

## 6. Understanding the refactored solution

The refactor's whole shape is one loop. Trace a single click — checking off "buy milk" (id 3) — through every file:

**1. Click → event listener** (`wwwroot/app.js`). The checkbox's `change` listener runs:

```js
checkbox.addEventListener('change', () =>
  run(() => api(`/api/todos/${todo.id}`, put({ done: checkbox.checked }))));
```

**2. fetch → HTTP request.** `api()` calls `fetch('/api/todos/3', { method:'PUT', body:'{"done":true}' })`. The browser sends `PUT /api/todos/3` to `localhost:5025`.

**3. Route → endpoint** (`Program.cs`). ASP.NET Core matches `MapPut("/api/todos/{id:int}", ...)`, parses `3` into `int id`, and binds the JSON body into `UpdateTodoRequest(null, true)`.

**4. Endpoint → service.** The endpoint validates the *shape* (text present but blank? → 400), then calls the domain: `todos.Update(3, null, true)`.

**5. Service → decision** (`TodoService.cs`). `Update` finds the todo, applies `with { Done = true }` (records + `with`, cs#07), stores it, returns it. Unknown id? Returns `null` — and the endpoint translates that to 404. The rule lives *here*, once.

**6. JSON → response.** The endpoint returns `Results.Ok(todo)`; ASP.NET Core serializes the record to `{"id":3,"text":"buy milk","done":true}`.

**7. Re-fetch → render.** Back in `app.js`, `run()` re-fetches `/api/todos` and calls `render(data)`, which redraws the list and counts from scratch. The checkbox you clicked, the strikethrough, and the "1 done" counter all update together because they're all drawn from the same fresh data — js#14's "screen is a function of state", with the state now living on a server.

That's the entire request lifecycle. Every fullstack app you'll ever touch is this loop with more steps in the middle.

Two design choices worth noticing:

- **Re-fetch over clever patching.** After any change, the client just asks for the list again. For an app this size, simple-and-correct beats fast-and-fragile (KISS). Optimistic UI (js#64's rollback trick) is a later optimization, not a starting point.
- **Validation in two layers on purpose.** The endpoint checks blank text so clients get a clean 400 message; `TodoService.CleanText` *also* throws on blank — the domain protects itself even if some future endpoint forgets. The tests cover the throw (`Check.Throws`, the cs#08 helper).

## 7. Words you learned (glossary)

- **Fullstack** — building both the client (browser) and the server (API) halves of an app.
- **Client / server** — the program that asks vs the program that owns the data.
- **HTTP verb** — the action word of a request: GET, POST, PUT, DELETE.
- **Status code** — the response's numeric summary (200/201/204/400/404 here).
- **REST** — the convention of using verbs + resource paths (`/api/todos/3`) to mean CRUD.
- **JSON** — the text format client and server exchange.
- **Serialization** — converting C# objects ⇄ JSON text (automatic in minimal APIs).
- **DTO** — a record describing exactly what a request/response body contains.
- **Model binding** — ASP.NET Core filling parameters from the route and body.
- **Service** — the class that owns business rules, free of HTTP.
- **Dependency injection (DI)** — the framework handing registered objects to endpoints.
- **Singleton** — one instance shared by the whole app.
- **`wwwroot` / static files** — files served to the browser unchanged.
- **Request lifecycle** — click → fetch → route → service → JSON → render.
- **Empty state** — what the UI shows when there's no data yet (never just blank).

## 8. Experiments to try on the plane (no internet needed)

Run the server (`dotnet run --project csharp/25-fullstack-todo/refactored`), open http://localhost:5025, and keep DevTools' Network tab open — it shows every step 2 and 6 of the lifecycle.

1. **Watch the loop.** Add a todo with the Network tab open. Expected: a `POST /api/todos` (201) followed by a `GET /api/todos` (200) — the change, then the re-fetch. Every button produces the same pair.
2. **Break a rule in one place, see it everywhere.** In `TodoService.CleanText`, change the rule to reject text longer than 10 characters (throw the same `ArgumentException`). Restart, try a long todo — the API refuses it. One edit changed the app *and* what `-- test` checks. Then add a matching check in the endpoint to turn it into a clean 400 message.
3. **Prove the counts can't lie.** Run `dotnet run --project ... -- test`. Then in `TodoService.Counts()`, sabotage it: return `new TodoCounts(0, 0, 0)`. Expected: the "counts come from the same list" test fails loudly. The original had no alarm wired to its counter.
4. **Type `<b>hi</b>` as a todo** in the refactor. Expected: it displays literally, because `app.js` uses `textContent`. Now run the original and do the same — it renders bold. Same input, one XSS habit apart.
5. **Talk to the API without the page.** In DevTools' console: `await (await fetch('/api/todos')).json()`. Then delete an id that doesn't exist: `(await fetch('/api/todos/999', {method:'DELETE'})).status` → expected `404`. The API answers honestly even with no UI involved — that's what "the contract" means.
6. **Kill the server mid-session** (Ctrl+C) and click a checkbox. Expected: the red error banner appears — the `catch` in `run()` doing its job. Restart the server, click again: it recovers. (Note what you *lost* on restart: everything. In-memory data dies with the process — cs#21's repository pattern is the cure, and project 28 uses it.)
