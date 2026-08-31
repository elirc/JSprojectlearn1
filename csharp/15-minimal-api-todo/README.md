# CS 15 — minimal-api-todo

**Lesson: your first ASP.NET Core web app — and the same rule as always:
endpoints translate HTTP, a plain class makes the decisions. (js#65 in C#.)**

## Run it

```
dotnet run csharp/15-minimal-api-todo/original.cs
dotnet run --project csharp/15-minimal-api-todo/refactored
dotnet run --project csharp/15-minimal-api-todo/refactored -- test
```

With either server running, talk to it from a second terminal (or a browser
for the GETs):

```
curl http://localhost:5015/todos
curl -X POST http://localhost:5015/todos -H "Content-Type: application/json" -d "{\"title\":\"buy milk\"}"
curl -X POST http://localhost:5015/todos/1/toggle
curl "http://localhost:5015/todos?filter=done"
curl -X DELETE http://localhost:5015/todos/1
```

## What's wrong with the original?

It serves every request correctly. But look at *how*:

1. **Every decision lives inside an endpoint lambda.** Validation, id
   generation, filtering, find-by-id — all welded to HTTP. The only way to
   test any rule is to boot the server and curl it (js#65's exact disease).
2. **The find-by-id loop is copy-pasted four times** (GET one, PUT, toggle,
   DELETE) and **title validation twice** (POST, PUT). Change the rule
   "titles must be non-empty" to "…and under 200 chars" and you must find
   and fix every copy — miss one and the API disagrees with itself.
3. **A todo is a `Dictionary<string, object>`.** Nothing declares its shape;
   every endpoint casts (`(bool)t["done"]`) and hopes. Typo a key —
   `t["Done"]` — and the compiler shrugs; you find out at runtime.

## What changed in the refactor

- **`record Todo(int Id, string Title, bool Done)`** — the shape stated once,
  checked by the compiler everywhere (cs#07's records).
- **`TodoService`** owns the list and *all* the rules: `Add` validates,
  `Toggle`, `Update`, `Remove`, `Filter`. No HTTP anywhere in it — so
  `Tests.cs` exercises every rule with plain method calls, no server.
- **Endpoints became one-liners** that translate: bind input → call service →
  wrap result in `Results.Ok` / `Created` / `NotFound` / `BadRequest`.
- **`MapGroup("/todos")`** states the URL prefix once instead of six times.

Same behavior on the wire; the four copies of the loop are one method now.

## Key takeaway

A web framework hands you routing, JSON, and status codes — it does *not*
decide where your logic lives. Keep the js#65 layering: **endpoints
translate, services decide.** If a rule can't be tested without an HTTP
request, it's in the wrong place.
