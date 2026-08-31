# 🏋️ Practice: Minimal API Todo

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. A stats endpoint (warm-up)

Add `GET /todos/stats` that answers `{"total":3,"done":1,"open":2}`. Put the counting in a new
`TodoService.Stats()` method returning a small record, so the endpoint stays a one-liner.
*Practices:* adding a route to a `MapGroup` + keeping the decision in the service.
**Hint:** LINQ's `Count(t => t.Done)` does the counting; a `record TodoStats(...)` states the shape once.
**Check offline:** add `Check.Equal(2, svc.Stats().Open, "two open after one toggle")` style tests — they
should pass — then `curl http://localhost:5015/todos/stats` → `200` with the three counts.

### ⭐⭐ 2. Search the list (core)

Let clients ask `GET /todos?q=milk` to get only todos whose title contains `q` (case-insensitive),
combinable with the existing filter: `?filter=open&q=milk`. Extend `Filter` to take a second parameter.
*Practices:* query-string binding with two optional parameters + a pure LINQ pipeline.
**Hint:** run the `switch` first, then apply `.Where(t => t.Title.Contains(q.Trim(), StringComparison.OrdinalIgnoreCase))` only when `q` has content.
**Check offline:** `Check.Equal(1, svc.Filter("open", "milk").Count, "search respects the filter")` should pass.

### ⭐⭐ 3. Duplicate a todo (core)

Add `POST /todos/{id}/duplicate`: it copies todo `id` into a brand-new todo titled `"<title> (copy)"`,
not done, with a fresh id, and answers `201 Created` (or `404` for an unknown id).
*Practices:* a new service method + translating its `Todo?` answer into 201/404.
**Hint:** mirror how `Toggle` is mapped; the service method reuses `Get(id)` and `_nextId++`.
**Check offline:** `curl -i -X POST http://localhost:5015/todos/1/duplicate` → `201`, `Location: /todos/2`;
`curl -i -X POST http://localhost:5015/todos/999/duplicate` → `404`.

### ⭐⭐ 4. Clear all finished todos (core)

Add `DELETE /todos/done` that removes every done todo at once and answers `200` with `{"removed":2}`.
The service method should return *how many* it removed.
*Practices:* a bulk operation + a route that must not collide with `DELETE /todos/{id:int}`.
**Hint:** `List<T>.RemoveAll(predicate)` already returns the count. `"done"` isn't an int, so the
`{id:int}` route can't swallow it.
**Check offline:** `Check.Equal(0, svc.ClearDone(), "nothing to clear on a fresh service")` passes; with a
server: toggle one todo, `curl -X DELETE http://localhost:5015/todos/done` → `{"removed":1}`.

### ⭐⭐⭐ 5. Reject duplicate titles — with the right error message (challenge)

Two different rejections ("blank title" vs "that title already exists", compared case-insensitively)
currently can't be told apart, because `Add` returns only `Todo?`. Introduce
`TryAdd(string? title)` returning `(Todo? Todo, string? Error)`, keep `Add` working by delegating to it
(so `Tests.cs` stays green), and make `POST /todos` echo the specific error in its 400 body.
*Practices:* the pure domain layer — evolving a service signature when `null` stops being informative.
**Hint:** tuple returns read like `var (todo, error) = service.TryAdd(body.Title);`.
**Check offline:** add this Check test — it should pass:
`Check.Equal("title must not be empty", svc.TryAdd("  ").Error, "blank keeps its own message");`
then POST the same title twice → second answer is `400` `{"error":"a todo titled '...' already exists"}`.

## Solutions

### 1. Stats endpoint

```csharp
// Todo.cs — one more shape
public record TodoStats(int Total, int Done, int Open);

// TodoService.cs
public TodoStats Stats() =>
    new(_todos.Count, _todos.Count(t => t.Done), _todos.Count(t => !t.Done));

// Program.cs (inside the group; a literal segment never clashes with {id:int})
todos.MapGet("/stats", () => service.Stats());
```

WHY: the counting is a *decision about the data*, so it lives in the service where a plain method call
can test it. The endpoint only forwards. `/todos/stats` and `/todos/{id:int}` coexist because `stats`
fails the `:int` constraint, so routing never confuses them.

### 2. Search

```csharp
// TodoService.cs — replaces Filter
public IReadOnlyList<Todo> Filter(string? filter, string? q = null)
{
    IEnumerable<Todo> result = filter switch
    {
        "done" => _todos.Where(t => t.Done),
        "open" => _todos.Where(t => !t.Done),
        _ => _todos,
    };
    if (!string.IsNullOrWhiteSpace(q))
        result = result.Where(t => t.Title.Contains(q.Trim(), StringComparison.OrdinalIgnoreCase));
    return result.ToList();
}

// Program.cs
todos.MapGet("/", (string? filter, string? q) => service.Filter(filter, q));
```

WHY: the default `q = null` keeps every existing caller (and test) compiling. Staying in
`IEnumerable<Todo>` until the final `ToList()` lets the two conditions *compose* instead of multiplying
into four branches — cs#04's pipeline idea. Binding gives us both query values for free.

### 3. Duplicate

```csharp
// TodoService.cs
/// Returns the fresh copy, or null when the source id is unknown.
public Todo? Duplicate(int id)
{
    var source = Get(id);
    if (source is null) return null;
    var copy = new Todo(_nextId++, $"{source.Title} (copy)", Done: false);
    _todos.Add(copy);
    return copy;
}

// Program.cs
todos.MapPost("/{id:int}/duplicate", (int id) =>
    service.Duplicate(id) is Todo t
        ? Results.Created($"/todos/{t.Id}", t)
        : Results.NotFound());
```

WHY: a duplicate is a *new resource*, so the honest reply is `201` with its address — the same
convention `POST /todos` already uses. Reusing `Get` keeps find-by-id in exactly one place, which was
the whole point of the refactor.

### 4. Clear finished

```csharp
// TodoService.cs
/// Removes every done todo; returns how many were removed.
public int ClearDone() => _todos.RemoveAll(t => t.Done);

// Program.cs — map this; "done" is not an int, so {id:int} never captures it
todos.MapDelete("/done", () => new { removed = service.ClearDone() });
```

WHY: `RemoveAll` returns the removal count, which is exactly the fact the client wants back, so the
service exposes it directly. We answer `200` with a body (not `204`) because there *is* something to
say. The `:int` constraint is what makes this route safe to add.

### 5. TryAdd with a reason

```csharp
// TodoService.cs
/// Returns (todo, null) on success, or (null, reason) explaining the rejection.
public (Todo? Todo, string? Error) TryAdd(string? title)
{
    if (string.IsNullOrWhiteSpace(title)) return (null, "title must not be empty");
    var trimmed = title.Trim();
    if (_todos.Any(t => string.Equals(t.Title, trimmed, StringComparison.OrdinalIgnoreCase)))
        return (null, $"a todo titled '{trimmed}' already exists");
    var todo = new Todo(_nextId++, trimmed, Done: false);
    _todos.Add(todo);
    return (todo, null);
}

/// Old signature, kept so existing callers and tests stay green.
public Todo? Add(string? title) => TryAdd(title).Todo;

// Program.cs
todos.MapPost("/", (CreateTodo body) =>
{
    var (todo, error) = service.TryAdd(body.Title);
    return todo is not null
        ? Results.Created($"/todos/{todo.Id}", todo)
        : Results.BadRequest(new { error });
});

// Tests.cs — new checks
var svc = new TodoService();
Check.Equal("title must not be empty", svc.TryAdd("  ").Error, "blank keeps its own message");
svc.TryAdd("buy milk");
Check.True(svc.TryAdd("BUY MILK").Error!.Contains("already exists"), "duplicates are named as such");
Check.Equal(1, svc.All().Count, "the duplicate was never added");
```

WHY: `Todo?` can say *no* but not *why* — with two rules that's no longer enough, so the signature
grows into a tiny Result tuple (cs#08's idea without a new type). Delegating `Add` to `TryAdd` keeps
one copy of the rules and zero broken tests, and the endpoint stays pure translation: it just forwards
whichever reason the domain produced.
