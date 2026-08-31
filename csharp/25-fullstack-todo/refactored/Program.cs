if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<TodoService>();   // one shared list for the app (cs#18)
var app = builder.Build();

app.UseDefaultFiles();   // "/" → wwwroot/index.html
app.UseStaticFiles();    // serves wwwroot/* as-is (cs#24)

// The endpoints only translate HTTP ⇄ TodoService. Nothing to see here —
// which is the point: nothing can hide here either.

app.MapGet("/api/todos", (TodoService todos) =>
    Results.Ok(new TodoListResponse(todos.All, todos.Counts())));

app.MapPost("/api/todos", (CreateTodoRequest request, TodoService todos) =>
{
    if (string.IsNullOrWhiteSpace(request.Text))
        return Results.BadRequest(new ErrorResponse("Todo text cannot be blank."));
    var todo = todos.Add(request.Text);
    return Results.Created($"/api/todos/{todo.Id}", todo);   // 201 + where it lives
});

app.MapPut("/api/todos/{id:int}", (int id, UpdateTodoRequest request, TodoService todos) =>
{
    if (request.Text is not null && string.IsNullOrWhiteSpace(request.Text))
        return Results.BadRequest(new ErrorResponse("Todo text cannot be blank."));
    var todo = todos.Update(id, request.Text, request.Done);
    return todo is null
        ? Results.NotFound(new ErrorResponse($"No todo with id {id}."))
        : Results.Ok(todo);
});

app.MapDelete("/api/todos/{id:int}", (int id, TodoService todos) =>
    todos.Remove(id)
        ? Results.NoContent()                                 // 204: done, nothing to say
        : Results.NotFound(new ErrorResponse($"No todo with id {id}.")));

app.Run("http://localhost:5025");

// DTOs — the shapes HTTP speaks, kept separate from the domain (cs#17).
public record CreateTodoRequest(string? Text);
public record UpdateTodoRequest(string? Text, bool? Done);
public record ErrorResponse(string Error);
public record TodoListResponse(IReadOnlyList<Todo> Todos, TodoCounts Counts);
