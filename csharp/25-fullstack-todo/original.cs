#:sdk Microsoft.NET.Sdk.Web
// Fullstack todo — the version where every click reloads the world.
//
// Run from the repo root:
//   dotnet run csharp/25-fullstack-todo/original.cs
// then open http://localhost:5025 in a browser.
//
// It works: you can add, toggle and delete todos, and there's even a JSON
// API "for the mobile app we'll build someday". But watch the browser tab
// spin on every single click, and read closely: the todo rules are written
// TWICE — once for the HTML page, once for the API — and the two copies
// already disagree about what counts as a valid todo.

var todos = new List<Todo>();
var nextId = 1;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// ---- the web page (the app, HTML flavor) --------------------------------

app.MapGet("/", () =>
{
    // The whole page is one big string. The counting logic lives here...
    var total = 0;
    var done = 0;
    var items = "";
    foreach (var t in todos)
    {
        total++;
        if (t.Done) done++;
        items += "<li>"
            + "<form method='post' action='/toggle' style='display:inline'>"
            + $"<input type='hidden' name='id' value='{t.Id}'>"
            + $"<button>{(t.Done ? "[x]" : "[&nbsp;]")}</button></form> "
            + (t.Done ? $"<s>{t.Text}</s>" : t.Text)   // user text pasted straight into HTML
            + " <form method='post' action='/delete' style='display:inline'>"
            + $"<input type='hidden' name='id' value='{t.Id}'>"
            + "<button>delete</button></form>"
            + "</li>";
    }
    var html = $$"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Todos (original)</title></head>
        <body>
          <h1>Todos</h1>
          <form method="post" action="/add">
            <input name="text" placeholder="What needs doing?">
            <button>Add</button>
          </form>
          <ul>{{items}}</ul>
          <p>{{total}} total, {{done}} done, {{total - done}} left</p>
        </body>
        </html>
        """;
    return Results.Content(html, "text/html");
});

app.MapPost("/add", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var text = form["text"].ToString();
    if (text != "")                        // "validation", copy #1: blocks "", lets "   " in
    {
        todos.Add(new Todo { Id = nextId, Text = text });
        nextId++;
    }
    ctx.Response.Redirect("/");            // full page reload, every single time
});

app.MapPost("/toggle", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var id = int.Parse(form["id"].ToString());
    foreach (var t in todos)               // find-by-id, copy #1
        if (t.Id == id) t.Done = !t.Done;
    ctx.Response.Redirect("/");
});

app.MapPost("/delete", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var id = int.Parse(form["id"].ToString());
    todos.RemoveAll(t => t.Id == id);
    ctx.Response.Redirect("/");
});

// ---- the JSON API (the same app again, in a different trench coat) ------

app.MapGet("/api/todos", () => todos);

app.MapPost("/api/todos", async (HttpContext ctx) =>
{
    var todo = await ctx.Request.ReadFromJsonAsync<Todo>();
    if (todo == null || todo.Text.Trim() == "")   // "validation", copy #2: this one trims!
        return Results.BadRequest("bad todo");
    todo.Id = nextId;                      // whatever Done the client sent stays as-is
    nextId++;
    todos.Add(todo);
    return Results.Ok(todo);               // 200 for a create (should be 201)
});

app.MapPost("/api/todos/{id}/toggle", (int id) =>
{
    foreach (var t in todos)               // find-by-id, copy #2
        if (t.Id == id) t.Done = !t.Done;
    return Results.Ok();                   // says OK even when the id didn't exist
});

app.MapDelete("/api/todos/{id}", (int id) =>
{
    todos.RemoveAll(t => t.Id == id);
    return Results.Ok();                   // same: deleting nothing is also "OK"
});

app.Run("http://localhost:5025");

class Todo
{
    public int Id { get; set; }
    public string Text { get; set; } = "";
    public bool Done { get; set; }
}
