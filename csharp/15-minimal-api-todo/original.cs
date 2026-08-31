#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// original.cs — a working todo API where EVERYTHING lives in endpoint lambdas.
// It serves correctly if you run it. It is also a nightmare to change:
// the same find-by-id loop appears four times, the same title validation
// twice, and no test can reach any of the logic without booting a server.
//
// Run:   dotnet run csharp/15-minimal-api-todo/original.cs
// Then:  curl http://localhost:5015/todos

using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// The "database": a list of dictionaries. Nothing anywhere says what a todo
// looks like — every endpoint just has to *know* the keys and cast the values.
var todos = new List<Dictionary<string, object>>();

app.MapGet("/todos", (HttpRequest req) =>
{
    // filtering logic, inline in the endpoint
    string? filter = req.Query["filter"];
    var result = new List<Dictionary<string, object>>();
    foreach (var t in todos)
    {
        if (filter == "done" && !(bool)t["done"]) continue;
        if (filter == "open" && (bool)t["done"]) continue;
        result.Add(t);
    }
    return Results.Json(result);
});

app.MapGet("/todos/{id}", (int id) =>
{
    // find-by-id loop, copy #1
    Dictionary<string, object>? found = null;
    foreach (var t in todos)
        if ((int)t["id"] == id) found = t;
    if (found == null)
        return Results.Json(new Dictionary<string, object> { ["error"] = "no such todo" }, statusCode: 404);
    return Results.Json(found);
});

app.MapPost("/todos", (JsonElement body) =>
{
    // title validation, copy #1
    if (!body.TryGetProperty("title", out var titleProp) || titleProp.ValueKind != JsonValueKind.String)
        return Results.Json(new Dictionary<string, object> { ["error"] = "title is required" }, statusCode: 400);
    var title = titleProp.GetString()!;
    if (title.Trim().Length == 0)
        return Results.Json(new Dictionary<string, object> { ["error"] = "title must not be empty" }, statusCode: 400);

    // id generation, inline: scan the whole list for the biggest id
    var maxId = 0;
    foreach (var t in todos)
        if ((int)t["id"] > maxId) maxId = (int)t["id"];

    var todo = new Dictionary<string, object>
    {
        ["id"] = maxId + 1,
        ["title"] = title.Trim(),
        ["done"] = false,
    };
    todos.Add(todo);
    return Results.Json(todo, statusCode: 201);
});

app.MapPut("/todos/{id}", (int id, JsonElement body) =>
{
    // find-by-id loop, copy #2
    Dictionary<string, object>? found = null;
    foreach (var t in todos)
        if ((int)t["id"] == id) found = t;
    if (found == null)
        return Results.Json(new Dictionary<string, object> { ["error"] = "no such todo" }, statusCode: 404);

    // title validation, copy #2 — already drifting: this copy and the POST
    // copy must be kept in sync by hand, forever
    if (!body.TryGetProperty("title", out var titleProp) || titleProp.ValueKind != JsonValueKind.String)
        return Results.Json(new Dictionary<string, object> { ["error"] = "title is required" }, statusCode: 400);
    var title = titleProp.GetString()!;
    if (title.Trim().Length == 0)
        return Results.Json(new Dictionary<string, object> { ["error"] = "title must not be empty" }, statusCode: 400);

    found["title"] = title.Trim();
    if (body.TryGetProperty("done", out var doneProp))
        found["done"] = doneProp.ValueKind == JsonValueKind.True;
    return Results.Json(found);
});

app.MapPost("/todos/{id}/toggle", (int id) =>
{
    // find-by-id loop, copy #3
    Dictionary<string, object>? found = null;
    foreach (var t in todos)
        if ((int)t["id"] == id) found = t;
    if (found == null)
        return Results.Json(new Dictionary<string, object> { ["error"] = "no such todo" }, statusCode: 404);

    found["done"] = !(bool)found["done"];
    return Results.Json(found);
});

app.MapDelete("/todos/{id}", (int id) =>
{
    // find-by-id loop, copy #4
    Dictionary<string, object>? found = null;
    foreach (var t in todos)
        if ((int)t["id"] == id) found = t;
    if (found == null)
        return Results.Json(new Dictionary<string, object> { ["error"] = "no such todo" }, statusCode: 404);

    todos.Remove(found);
    return Results.Json(new Dictionary<string, object> { ["deleted"] = true });
});

app.Run("http://localhost:5015");
