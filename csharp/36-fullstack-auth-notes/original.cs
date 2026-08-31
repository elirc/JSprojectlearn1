#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// (That second line just silences native-AOT trimming warnings that
// file-based web apps emit for reflection-based JSON — ignore it.)
//
// 36 — fullstack auth + notes (ORIGINAL, flawed on purpose)
//
// A notes app "with accounts". There is a `?user=` parameter on every
// endpoint, which the team calls "login". It is not login. It is a text box
// labelled "who would you like to be today?".
//
// And underneath it, a second problem that survives even if you fix the first:
// there is ONE global notes list. Every user sees every note. The `?user=`
// parameter is recorded on each note and then never checked again.
//
// Run:   dotnet run csharp/36-fullstack-auth-notes/original.cs
// Try:
//   curl -X POST "http://localhost:5036/notes?user=alice&text=my+diary+password+is+hunter2"
//   curl -X POST "http://localhost:5036/notes?user=bob&text=bob+bought+milk"
//
//   THE IMPERSONATION — no registration, no password, no login:
//   curl "http://localhost:5036/me?user=admin"
//        -> "you are admin". Type a name, be that person. That is the
//           entire authentication system.
//
//   THE LEAK — one global list, so everyone reads everyone:
//   curl "http://localhost:5036/notes?user=mallory"
//        -> alice's diary password AND bob's shopping. Mallory has no
//           account and did not need one.
//
//   THE TAMPERING — ownership is recorded but never enforced:
//   curl -X PUT "http://localhost:5036/notes/1?user=mallory&text=deleted+lol"
//   curl -X DELETE "http://localhost:5036/notes/2?user=mallory"
//        -> both succeed. Mallory just edited alice's note and deleted bob's.
//
// Note the shape of the third bug, because it is the one people ship in
// otherwise-serious apps: the note KNOWS who owns it. The field is right
// there. Nobody looks at it. Authentication ("who are you?") and
// AUTHORIZATION ("are you allowed to touch this?") are different questions,
// and getting the first one right does nothing at all for the second.

var app = WebApplication.CreateBuilder(args).Build();

// ONE list. Not one per user. This is the whole data model, and it is the
// reason every note in the system is one query string away from anybody.
var notes = new List<Note>();
var nextId = 1;

app.MapGet("/me", (string user) =>
{
    // No cookie, no token, no password, no lookup of any kind. The server is
    // told who the caller is by the caller.
    return Results.Ok(new { you = user });
});

app.MapGet("/notes", (string user) =>
{
    // `user` is accepted, and then... not used. The filter that should be
    // here — .Where(n => n.Owner == user) — was never written, because in the
    // demo there was only ever one user and it "worked fine".
    return Results.Ok(notes);
});

app.MapPost("/notes", (string user, string text) =>
{
    if (string.IsNullOrWhiteSpace(text)) return Results.BadRequest("text is required");

    // The owner IS recorded. That is what makes this so frustrating: the data
    // needed to do the right thing is present, and no code ever consults it.
    var note = new Note { Id = nextId++, Owner = user, Text = text };
    notes.Add(note);
    return Results.Ok(note);
});

app.MapPut("/notes/{id}", (int id, string user, string text) =>
{
    var note = notes.FirstOrDefault(n => n.Id == id);
    if (note is null) return Results.NotFound();

    // The missing line, in full:
    //     if (note.Owner != user) return Results.Forbid();
    // Without it, `user` is decoration. Anyone can edit anything.
    note.Text = text;
    return Results.Ok(note);
});

app.MapDelete("/notes/{id}", (int id, string user) =>
{
    // Same hole, one verb worse: this one destroys data rather than changing
    // it, and it does not even bother to look the owner up.
    var removed = notes.RemoveAll(n => n.Id == id);
    return removed == 0 ? Results.NotFound() : Results.Ok(new { deleted = id });
});

// There is no register endpoint, no password anywhere, and no session. There
// is nothing to log out OF. "Accounts" here means "a string you type".
app.Run("http://localhost:5036");

class Note
{
    public int Id { get; set; }
    public string Owner { get; set; } = "";
    public string Text { get; set; } = "";
}
