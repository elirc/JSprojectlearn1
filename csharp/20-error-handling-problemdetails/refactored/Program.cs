if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
// Register a ready-made instance (not AddSingleton<InventoryService>()): the
// service also has a test-only IEnumerable<Item> constructor, and the DI
// container would prefer it — injecting an EMPTY sequence. Constructing the
// instance ourselves keeps the seeded default.
builder.Services.AddSingleton(new InventoryService());
var app = builder.Build();

// THE error handler — the only try/catch in the whole web app. Every endpoint
// below just does its job and throws when it can't; this middleware turns the
// exception into a ProblemDetails response (the web's standard error envelope:
// application/problem+json with type/title/status/detail fields, RFC 9457).
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (Exception ex)
    {
        var (status, title, detail) = ErrorMapper.Map(ex);
        if (status == 500)
            app.Logger.LogError(ex, "Unhandled exception");   // real message goes to the log...
        await Results.Problem(title: title, detail: detail, statusCode: status)
            .ExecuteAsync(context);                            // ...generic one goes to the client
    }
});

// Look: not one try/catch below. Endpoints translate HTTP <-> domain, period.
app.MapGet("/items", (InventoryService inv) => Results.Ok(inv.GetAll()));

app.MapGet("/items/{id}", (int id, InventoryService inv) => Results.Ok(inv.Get(id)));

app.MapGet("/items/by-category/{category}", (string category, InventoryService inv)
    => Results.Ok(inv.ByCategory(category)));

app.MapPost("/items", (NewItem dto, InventoryService inv) =>
{
    var item = inv.Add(dto.Name, dto.Category, dto.Stock);
    return Results.Created($"/items/{item.Id}", item);
});

app.MapPost("/items/{id}/purchase", (int id, InventoryService inv) => Results.Ok(inv.Purchase(id)));

// A deliberately unexpected crash, so you can see what a real bug looks like
// to a client: a generic 500 ProblemDetails that leaks nothing.
app.MapGet("/boom", string () => throw new InvalidOperationException(
    "simulated bug: this message must NOT reach the client"));

app.Run("http://localhost:5020");

public record NewItem(string? Name, string? Category, int Stock);
