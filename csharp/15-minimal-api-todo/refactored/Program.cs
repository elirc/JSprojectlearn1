// Program.cs — the thin HTTP layer. Every endpoint is one line of translation:
// HTTP in → service call → HTTP out. Nothing here is worth testing, because
// nothing here decides anything. The decisions live in TodoService.cs.

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var service = new TodoService();

// MapGroup: state the common prefix once instead of six times.
var todos = app.MapGroup("/todos");

todos.MapGet("/", (string? filter) => service.Filter(filter));

todos.MapGet("/{id:int}", (int id) =>
    service.Get(id) is Todo t ? Results.Ok(t) : Results.NotFound());

todos.MapPost("/", (CreateTodo body) =>
    service.Add(body.Title) is Todo t
        ? Results.Created($"/todos/{t.Id}", t)
        : Results.BadRequest(new { error = "title must not be empty" }));

todos.MapPut("/{id:int}", (int id, UpdateTodo body) =>
    service.Get(id) is null ? Results.NotFound()
    : service.Update(id, body.Title, body.Done) is Todo t ? Results.Ok(t)
    : Results.BadRequest(new { error = "title must not be empty" }));

todos.MapPost("/{id:int}/toggle", (int id) =>
    service.Toggle(id) is Todo t ? Results.Ok(t) : Results.NotFound());

todos.MapDelete("/{id:int}", (int id) =>
    service.Remove(id) ? Results.NoContent() : Results.NotFound());

app.Run("http://localhost:5015");
