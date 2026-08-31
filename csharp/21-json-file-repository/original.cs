#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// (That second line just silences native-AOT trimming warnings that
// file-based web apps emit for reflection-based JSON — ignore it.)
//
// 21 — json file "database" (ORIGINAL, flawed on purpose)
//
// A notes API where EVERY endpoint personally opens notes.json, parses it,
// mutates the list, and writes the whole file back. The same disease as
// js#55's original, now with a web server on top.
//
// Run:   dotnet run csharp/21-json-file-repository/original.cs
// Try:
//   curl http://localhost:5021/notes
//   curl -X POST "http://localhost:5021/notes?text=buy+milk"
//   curl -X PUT  "http://localhost:5021/notes/1?text=buy+oat+milk&pinned=true"
//   curl -X DELETE http://localhost:5021/notes/1
//
// FLAW #0, before you even read the code: "notes.json" is a RELATIVE path.
// It resolves against the CURRENT WORKING DIRECTORY — wherever you happened
// to be standing when you launched the app. Run from the repo root and the
// file appears in the repo root. Run from your home folder and you get a
// SECOND notes.json there — and your notes have "vanished". Same app, two
// databases, depending on how it was started. (Delete any stray notes.json
// this leaves behind; it's junk data.)

using System.Text.Json;

var app = WebApplication.CreateBuilder(args).Build();

app.MapGet("/notes", () =>
{
    // hotfix #142: crashed with FileNotFoundException on first run.
    // Copy-pasted this if into every endpoint "just in case". If a new
    // endpoint forgets the ritual, first-run crashes come back.
    if (!File.Exists("notes.json")) File.WriteAllText("notes.json", "[]");

    var notes = JsonSerializer.Deserialize<List<Note>>(File.ReadAllText("notes.json"));
    return Results.Ok(notes);
});

app.MapGet("/notes/{id}", (int id) =>
{
    if (!File.Exists("notes.json")) File.WriteAllText("notes.json", "[]");   // hotfix #142 again

    var notes = JsonSerializer.Deserialize<List<Note>>(File.ReadAllText("notes.json"));
    var note = notes!.FirstOrDefault(n => n.Id == id);
    return note is null ? Results.NotFound() : Results.Ok(note);
});

app.MapPost("/notes", (string? text) =>
{
    if (string.IsNullOrWhiteSpace(text)) return Results.BadRequest("text is required");
    if (!File.Exists("notes.json")) File.WriteAllText("notes.json", "[]");   // hotfix #142 again

    // Read-modify-write, no lock. If two requests arrive at the same time,
    // BOTH read the same list, both add THEIR note, and whoever writes last
    // overwrites the other's write — one note silently vanishes. js#55
    // called this the "lost update"; moving to C# didn't cure it.
    var notes = JsonSerializer.Deserialize<List<Note>>(File.ReadAllText("notes.json"))!;
    var note = new Note { Id = notes.Count == 0 ? 1 : notes.Max(n => n.Id) + 1, Text = text };
    notes.Add(note);
    File.WriteAllText("notes.json", JsonSerializer.Serialize(notes));
    return Results.Created($"/notes/{note.Id}", note);
});

app.MapPut("/notes/{id}", (int id, string? text, bool pinned = false) =>
{
    if (string.IsNullOrWhiteSpace(text)) return Results.BadRequest("text is required");
    if (!File.Exists("notes.json")) File.WriteAllText("notes.json", "[]");   // hotfix #142 again

    // Same read-modify-write dance, copy-pasted a third time. Every endpoint
    // re-implements "load everything, change one thing, save everything" —
    // and each copy is one more place for the ritual to go subtly wrong.
    var notes = JsonSerializer.Deserialize<List<Note>>(File.ReadAllText("notes.json"))!;
    var note = notes.FirstOrDefault(n => n.Id == id);
    if (note is null) return Results.NotFound();
    note.Text = text;
    note.Pinned = pinned;
    File.WriteAllText("notes.json", JsonSerializer.Serialize(notes));
    return Results.Ok(note);
});

app.MapDelete("/notes/{id}", (int id) =>
{
    if (!File.Exists("notes.json")) File.WriteAllText("notes.json", "[]");   // hotfix #142 again

    var notes = JsonSerializer.Deserialize<List<Note>>(File.ReadAllText("notes.json"))!;
    var removed = notes.RemoveAll(n => n.Id == id);
    if (removed == 0) return Results.NotFound();
    File.WriteAllText("notes.json", JsonSerializer.Serialize(notes));
    return Results.NoContent();
});

app.Run("http://localhost:5021");

class Note
{
    public int Id { get; set; }
    public string Text { get; set; } = "";
    public bool Pinned { get; set; }
}
