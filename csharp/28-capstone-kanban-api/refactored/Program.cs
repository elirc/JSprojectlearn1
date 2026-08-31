if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IBoardRepository>(_ => new InMemoryBoardRepository(SeedBoard()));   // cs#18
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Thin endpoints: bind the DTO, call the domain, translate the Result.
// Failures come back as ProblemDetails (cs#20) with honest status codes —
// the original answered the same situations with 500s and stack traces.

app.MapGet("/api/board", (IBoardRepository repo) => Results.Ok(repo.Load()));

app.MapPost("/api/columns", (AddColumnRequest request, IBoardRepository repo) =>
{
    var board = repo.Load();
    var result = board.AddColumn(request.Name);
    if (!result.Ok) return Problem(result.Error!);
    repo.Save(board);
    return Results.Created("/api/board", new ColumnCreated(result.Value!.Name));
});

app.MapPost("/api/cards", (AddCardRequest request, IBoardRepository repo) =>
{
    var board = repo.Load();
    var result = board.AddCard(request.Column, request.Title);
    if (!result.Ok) return Problem(result.Error!);
    repo.Save(board);
    return Results.Created("/api/board", result.Value);
});

app.MapPost("/api/cards/{id:guid}/move", (Guid id, MoveCardRequest request, IBoardRepository repo) =>
{
    var board = repo.Load();
    var result = board.MoveCard(id, request.ToColumn, request.Position);
    if (!result.Ok) return Problem(result.Error!);
    repo.Save(board);
    return Results.Ok(result.Value);
});

app.Run("http://localhost:5028");

// One place decides how domain errors become HTTP — every endpoint above
// just says Problem(error) and stays out of the status-code business.
static IResult Problem(Error error) => Results.Problem(
    title: error.Code,
    detail: error.Message,
    statusCode: error.Code switch
    {
        "card_not_found" or "column_not_found" => StatusCodes.Status404NotFound,
        "duplicate_column" => StatusCodes.Status409Conflict,
        _ => StatusCodes.Status400BadRequest,
    });

static Board SeedBoard()
{
    var board = new Board();
    board.AddColumn("todo");
    board.AddColumn("doing");
    board.AddColumn("done");
    board.AddCard("todo", "Read the LEARN.md");
    board.AddCard("todo", "Run the tests");
    board.AddCard("done", "Install the .NET SDK");
    return board;
}

// DTOs: the request shapes HTTP speaks (cs#17).
public record AddColumnRequest(string? Name);
public record AddCardRequest(string? Column, string? Title);
public record MoveCardRequest(string? ToColumn, int Position);
public record ColumnCreated(string Name);
