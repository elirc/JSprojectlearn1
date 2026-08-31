# 🏋️ Practice: Fullstack Todo

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Clear the finished ones (warm-up)

Add `TodoService.ClearDone()` returning how many todos it removed, and `DELETE /api/todos/done` answering `200` with `{ "removed": 2 }`. Adding a "Clear done" button to `index.html` and `app.js` is two lines, because the frontend's whole vocabulary is already *do something, then re-fetch*.
*Practices:* the pure domain layer, `List.RemoveAll`'s count return, and the shape of the fetch loop.
**Hint:** `todos.RemoveAll(t => t.Done)` already returns the number removed — that is the whole method. The endpoint is one line; the button is `run(() => api('/api/todos/done', { method: 'DELETE' }))`.
**Check offline:** add these Check tests to `Tests.cs` — all should pass:
```csharp
var svc = new TodoService();
var a = svc.Add("a"); svc.Add("b"); var c = svc.Add("c");
svc.Toggle(a.Id); svc.Toggle(c.Id);   // two done, one active
Check.Equal(2, svc.ClearDone(), "ClearDone reports how many it removed");
Check.Equal(1, svc.All.Count, "only the active one survives");
Check.Equal(0, svc.ClearDone(), "a second call removes nothing");
```
Then `curl -i -X DELETE http://localhost:5025/api/todos/done` → `200` and `{"removed":2}`.

### ⭐⭐ 2. Filtering, on the side that owns it (core)

Add `TodoService.Filter(string? filter)` accepting `"all"`, `"active"`, `"done"` (blank/null means all) and throwing `ArgumentException` for anything else, then let `GET /api/todos?filter=active` return the filtered list. The subtle part: `counts` must keep describing the **whole** list, so the UI can say "1 of 3 shown" — filtering the list must not filter the counts.
*Practices:* a `switch` expression over strings (project 06), and noticing when two things in one response have different scopes.
**Hint:** normalise with `(filter ?? "all").Trim().ToLowerInvariant()` before switching, and keep `Counts()` reading `todos`, not the filtered result. Turn the `ArgumentException` into a `400` in the endpoint the same way blank text is handled.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var f = new TodoService();
f.Add("buy milk"); var done = f.Add("call mom"); f.Toggle(done.Id);
Check.Equal(2, f.Filter("all").Count, "all shows everything");
Check.Equal("buy milk", f.Filter("active")[0].Text, "active hides the finished ones");
Check.Equal("call mom", f.Filter("done")[0].Text, "done shows only the finished ones");
Check.Equal(2, f.Filter(null).Count, "no filter means all");
Check.Equal(new TodoCounts(2, 1, 1), f.Counts(), "counts still describe the WHOLE list");
Check.Throws<ArgumentException>(() => f.Filter("finished"), "an unknown filter is rejected loudly");
```
Then `curl "http://localhost:5025/api/todos?filter=active"` → one todo, `counts.total` still `2`.

### ⭐⭐ 3. Filter buttons in the UI (core — builds on 2)

Add three buttons (All / Active / Done) above the list. Clicking one stores the choice in a module variable, marks that button with a `.selected` class, and re-fetches. Keep the render function *pure-ish*: it should draw whatever the server sent, and the only new decision is which URL to ask for. Show `"3 total · 1 active · 2 done"` unchanged underneath, because that is the whole list.
*Practices:* extending the fetch-render loop, client state that is a *view* choice rather than data.
**Hint:** `let filter = 'all';` plus `api(`/api/todos?filter=${filter}`)` inside `run`. Re-apply the `.selected` class inside `render` so the highlight cannot drift from the data.
**Check offline:** open http://localhost:5025 with DevTools' Network tab open. Add two todos, tick one, then click **Active**. Expected: one `GET /api/todos?filter=active`, the list shrinks, the counts line is unchanged, and the page never reloads. Click **All**: the request loses the query string and everything comes back.

### ⭐⭐ 4. No accidental duplicates (core)

Make `Add` reject text that duplicates an **active** todo (case-insensitively, after trimming) with `ArgumentException`. A todo you already finished should not block adding it again — "buy milk" is a weekly event. Then check what your endpoint does: `ArgumentException` currently escapes as a 500, so turn it into a `400` with the exception's message.
*Practices:* a domain invariant with a deliberately narrow scope, and the endpoint's job of translating a domain failure into a status code.
**Hint:** the check goes in `Add`, after `CleanText` (so it compares cleaned text to cleaned text) and before the todo is constructed. In `Program.cs`, wrap the `todos.Add(...)` call in `try/catch (ArgumentException ex)` and return `Results.BadRequest(new ErrorResponse(ex.Message))`.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var d = new TodoService();
var milk = d.Add("buy milk");
Check.Throws<ArgumentException>(() => d.Add("  BUY MILK "), "the same active todo is refused");
Check.Equal(1, d.All.Count, "and nothing was added");
d.Toggle(milk.Id);
Check.Equal("buy milk", d.Add("buy milk").Text, "once it is done, the text is free again");
Check.Equal(2, d.All.Count, "so the second one really was added");
```
Then `curl -i -X POST http://localhost:5025/api/todos -H "Content-Type: application/json" -d "{\"text\":\"buy milk\"}"` twice → `201` then `400` with a readable message (not a 500).

### ⭐⭐⭐ 5. Todos that survive a restart (challenge)

LEARN.md's last experiment ends with everything vanishing on Ctrl+C. Fix it with project 21's pattern: define `ITodoStore` with `(IReadOnlyList<Todo> Todos, int NextId) Load()` and `void Save(IReadOnlyList<Todo> todos, int nextId)`, write a `JsonTodoStore` that reads and writes one JSON file, and have `TodoService` load in its constructor and save after every change. Keep a parameterless `TodoService()` constructor backed by a do-nothing store, so every existing test stays fast and file-free.
*Practices:* composing project 21's repository seam into project 25, saving `nextId` so ids are never reused, and constructor overloads that keep DI and tests both happy.
**Hint:** serialize one wrapper object — `record TodoFile(List<Todo> Todos, int NextId)` — not just the list, or a restart hands out an id that already exists. Anchor the path with `Path.Combine(AppContext.BaseDirectory, "todos.json")` (project 21's wandering-database lesson) and write via a `.tmp` file plus `File.Move(tmp, path, overwrite: true)` so a crash mid-write cannot leave half a file.
**Check offline:** add to `Tests.cs` — all should pass, on a temp file that is deleted afterwards:
```csharp
var path = Path.Combine(Path.GetTempPath(), $"todos-{Guid.NewGuid():N}.json");
try
{
    var first = new TodoService(new JsonTodoStore(path));
    first.Add("buy milk");
    first.Toggle(first.Add("call mom").Id);
    first.Remove(first.Add("typo").Id);                            // id 3 is used up and gone
    var afterRestart = new TodoService(new JsonTodoStore(path));   // "the app restarted"
    Check.Equal(2, afterRestart.All.Count, "todos survive a restart");
    Check.Equal(true, afterRestart.All[1].Done, "so does their done state");
    Check.Equal(4, afterRestart.Add("fresh").Id, "ids continue where they left off — never reused");
    Check.Equal(0, new TodoService().All.Count, "the parameterless constructor still touches no disk");
}
finally { if (File.Exists(path)) File.Delete(path); }
```
Then run the server, add a todo, Ctrl+C, restart, and reload the page: it is still there.

## Solutions

### 1. Clear the finished ones

```csharp
// TodoService.cs
public int ClearDone() => todos.RemoveAll(t => t.Done);

// Program.cs
app.MapDelete("/api/todos/done", (TodoService todos) =>
    Results.Ok(new { removed = todos.ClearDone() }));
```

```js
// app.js
document.querySelector('#clear-done').addEventListener('click', () =>
  run(() => api('/api/todos/done', { method: 'DELETE' })));
```

WHY: `RemoveAll` returning a count means the whole rule is one expression — and returning that count rather than `void` gives the endpoint something honest to say. Notice that the frontend needed no new concepts: every button in this app is "call the API, then re-fetch and re-render", so features are cheap precisely because there is only one way to change the screen.

### 2. Filtering, on the side that owns it

```csharp
// TodoService.cs
public IReadOnlyList<Todo> Filter(string? filter) => (filter ?? "all").Trim().ToLowerInvariant() switch
{
    "active" => todos.Where(t => !t.Done).ToList(),
    "done"   => todos.Where(t => t.Done).ToList(),
    "" or "all" => todos.ToList(),
    _ => throw new ArgumentException($"Unknown filter '{filter}'. Use all, active or done."),
};

// Program.cs — the list is filtered; the COUNTS still describe the whole list.
app.MapGet("/api/todos", (TodoService todos, string? filter) =>
{
    try { return Results.Ok(new TodoListResponse(todos.Filter(filter), todos.Counts())); }
    catch (ArgumentException ex) { return Results.BadRequest(new ErrorResponse(ex.Message)); }
});
```

WHY: the tempting bug is computing the counts from the filtered list, which makes the summary line change meaning depending on which button is pressed — "1 total" while three todos exist. Keeping `Counts()` reading the full list makes the response two facts with two scopes, stated once each. Rejecting an unknown filter instead of quietly falling back to "all" follows project 06's lesson: a silent `default` branch turns a client typo into a wrong answer nobody investigates.

### 3. Filter buttons in the UI

```html
<!-- index.html, above the list -->
<div id="filters" class="filters">
  <button type="button" data-filter="all" class="selected">All</button>
  <button type="button" data-filter="active">Active</button>
  <button type="button" data-filter="done">Done</button>
</div>
```

```js
// app.js
let filter = 'all';   // a VIEW choice, not data — the todos live on the server
document.querySelector('#filters').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  filter = button.dataset.filter;
  run(null);
});
// inside run(), the only line that changed:
render(await api(`/api/todos?filter=${encodeURIComponent(filter)}`));
// inside render(), keep the highlight derived from the same state:
for (const button of document.querySelectorAll('#filters button'))
  button.classList.toggle('selected', button.dataset.filter === filter);
```

WHY: one listener on the container instead of three on the buttons is event delegation — fewer handlers, and it keeps working if the buttons are ever re-rendered. The important discipline is where `filter` lives: it is a *view* choice, so the client owns it, while the todos stay on the server and are re-fetched rather than filtered locally. Re-applying the `.selected` class inside `render` means the highlight is derived from state on every paint, so it cannot drift — the same "compute, don't store" instinct project 26 makes explicit.

### 4. No accidental duplicates

```csharp
// TodoService.cs
public Todo Add(string? text)
{
    var cleaned = CleanText(text);
    // Scoped on purpose: only ACTIVE todos collide. "buy milk" is weekly.
    if (todos.Any(t => !t.Done && string.Equals(t.Text, cleaned, StringComparison.OrdinalIgnoreCase)))
        throw new ArgumentException($"\"{cleaned}\" is already on the list.");
    var todo = new Todo(nextId, cleaned, false);
    nextId++;
    todos.Add(todo);
    return todo;
}
// Program.cs — the domain guards its own rules; the endpoint just translates
app.MapPost("/api/todos", (CreateTodoRequest request, TodoService todos) =>
{
    try
    {
        var todo = todos.Add(request.Text);
        return Results.Created($"/api/todos/{todo.Id}", todo);
    }
    catch (ArgumentException ex) { return Results.BadRequest(new ErrorResponse(ex.Message)); }
});
```

WHY: the rule's *scope* is the interesting decision — "no duplicates ever" would be wrong for a todo list, and getting that right is a domain question the endpoint has no business answering. Comparing cleaned text to cleaned text matters too: without it, `"buy milk "` and `"buy milk"` would look different to the rule and identical on screen. The `try/catch` in the endpoint is the translation layer doing its one job — a rule broken in the domain is a `400`, not a stack trace, which is exactly the split project 20 formalises with ProblemDetails.

### 5. Todos that survive a restart

```csharp
// TodoStore.cs
public interface ITodoStore
{
    (IReadOnlyList<Todo> Todos, int NextId) Load();
    void Save(IReadOnlyList<Todo> todos, int nextId);
}
/// The fake: what tests and the parameterless constructor use. No disk at all.
public sealed class NullTodoStore : ITodoStore
{
    public (IReadOnlyList<Todo>, int) Load() => (Array.Empty<Todo>(), 1);
    public void Save(IReadOnlyList<Todo> todos, int nextId) { }
}
/// Save BOTH the todos and nextId — otherwise a restart re-issues live ids.
public sealed record TodoFile(List<Todo> Todos, int NextId);
public sealed class JsonTodoStore : ITodoStore
{
    private static readonly JsonSerializerOptions Options =
        new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private readonly string path;
    public JsonTodoStore(string path) => this.path = path;
    public (IReadOnlyList<Todo>, int) Load()
    {
        if (!File.Exists(path)) return (Array.Empty<Todo>(), 1);      // graceful first run
        var json = File.ReadAllText(path);
        if (string.IsNullOrWhiteSpace(json)) return (Array.Empty<Todo>(), 1);
        var saved = JsonSerializer.Deserialize<TodoFile>(json, Options);
        return saved is null ? (Array.Empty<Todo>(), 1) : (saved.Todos, saved.NextId);
    }
    public void Save(IReadOnlyList<Todo> todos, int nextId)
    {
        var tmp = path + ".tmp";                                       // write beside, then swap
        File.WriteAllText(tmp, JsonSerializer.Serialize(new TodoFile(todos.ToList(), nextId), Options));
        File.Move(tmp, path, overwrite: true);                         // atomic-ish: no half files
    }
}
// TodoService.cs — the only changes
private readonly ITodoStore store;
public TodoService() : this(new NullTodoStore()) { }
public TodoService(ITodoStore store)
{
    this.store = store;
    var (loaded, id) = store.Load();
    todos.AddRange(loaded);
    nextId = id;
}
private void Persist() => store.Save(todos, nextId);
// ...then call Persist() at the end of Add, Toggle, Update and ClearDone,
// and inside Remove only when something was actually removed.
// Program.cs — DI picks the ITodoStore constructor
builder.Services.AddSingleton<ITodoStore>(
    new JsonTodoStore(Path.Combine(AppContext.BaseDirectory, "todos.json")));
builder.Services.AddSingleton<TodoService>();
```

WHY: this is project 21's seam dropped into project 25 without either one bending — `TodoService` keeps every rule and gains one collaborator, and the endpoints never learn that a file exists. Saving `nextId` alongside the list is the detail that separates working persistence from a bug that only appears after a restart: ids are identity here, and re-issuing a live one would make a `PUT` edit the wrong todo. The write-to-temp-then-move dance is the same reason: `File.WriteAllText` straight onto the real path can be interrupted, and a truncated JSON file is worse than no file. The parameterless constructor is not clutter — it keeps 30 existing assertions running in microseconds against a `NullTodoStore` while the real app writes to disk, which is the whole argument for the interface. (Saving the entire list on every keystroke is fine at this size; when it stops being fine, the seam is already where you would put a database.)
