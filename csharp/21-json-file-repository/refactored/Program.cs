if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);

// ONE line decides where notes live — anchored next to the app binary, not
// wherever you happened to launch from. Swap in `new InMemoryNoteRepo()` and
// the whole API runs without touching disk. Later, an EF Core + database
// repo plugs into this same line.
builder.Services.AddSingleton<INoteRepo>(
    new JsonFileNoteRepo(Path.Combine(AppContext.BaseDirectory, "notes.json")));

var app = builder.Build();

// Endpoints know the INTERFACE, not the file. No File.*, no JsonSerializer,
// no "hotfix #142" in sight.
app.MapGet("/notes", (INoteRepo repo) => Results.Ok(repo.GetAll()));

app.MapGet("/notes/{id}", (int id, INoteRepo repo) =>
    repo.Find(id) is { } note ? Results.Ok(note) : Results.NotFound());

app.MapPost("/notes", (NewNote dto, INoteRepo repo) =>
{
    if (string.IsNullOrWhiteSpace(dto.Text))
        return Results.BadRequest(new { error = "text is required" });
    var note = repo.Add(dto.Text.Trim());
    return Results.Created($"/notes/{note.Id}", note);
});

app.MapPut("/notes/{id}", (int id, EditNote dto, INoteRepo repo) =>
{
    if (string.IsNullOrWhiteSpace(dto.Text))
        return Results.BadRequest(new { error = "text is required" });
    return repo.Update(id, dto.Text.Trim(), dto.Pinned) is { } note
        ? Results.Ok(note)
        : Results.NotFound();
});

app.MapDelete("/notes/{id}", (int id, INoteRepo repo) =>
    repo.Delete(id) ? Results.NoContent() : Results.NotFound());

app.Run("http://localhost:5021");

public record NewNote(string? Text);
public record EditNote(string? Text, bool Pinned);
