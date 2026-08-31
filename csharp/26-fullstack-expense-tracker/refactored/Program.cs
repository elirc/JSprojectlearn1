if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ExpenseBook>();   // one book for the whole app (cs#18)
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/expenses", (ExpenseBook book) => Results.Ok(book.All));

app.MapPost("/api/expenses", (NewExpenseRequest request, ExpenseBook book) =>
{
    if (!DateOnly.TryParseExact(request.Date, "yyyy-MM-dd", out var date))
        return Results.BadRequest(new ErrorResponse("Date must look like 2026-08-21."));
    if (request.Amount is null)
        return Results.BadRequest(new ErrorResponse("Amount is required."));
    try
    {
        var expense = book.Add(request.Description, request.Category, request.Amount.Value, date);
        return Results.Created($"/api/expenses/{expense.Id}", expense);
    }
    catch (ArgumentException ex)   // the domain guards its own rules
    {
        return Results.BadRequest(new ErrorResponse(ex.Message));
    }
});

app.MapDelete("/api/expenses/{id:int}", (int id, ExpenseBook book) =>
    book.Remove(id)
        ? Results.NoContent()
        : Results.NotFound(new ErrorResponse($"No expense with id {id}.")));

// One summary endpoint, zero summary logic: it just forwards to the domain.
// /api/summary            → everything
// /api/summary?year=2026&month=8 → that month only
app.MapGet("/api/summary", (int? year, int? month, ExpenseBook book) =>
    Results.Ok(book.Summarize(year, month)));

app.Run("http://localhost:5026");

public record NewExpenseRequest(string? Description, string? Category, decimal? Amount, string? Date);
public record ErrorResponse(string Error);
