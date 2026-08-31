// AUTHORIZATION, in one class.
//
// Authentication answered "who are you?" (SessionStore). This answers the
// second, entirely separate question: "are you allowed to touch THIS?" The
// original got the first one wrong AND never asked the second — and note that
// fixing only the first would have left every note readable by every account.
//
// The design rule here is worth stating on its own:
//
//     EVERY method takes the owner as its FIRST parameter.
//
// There is no `Get(int id)` overload, no `AllNotes()`, no way to reach a note
// without saying who is asking. The ownership check is not something a caller
// must remember to do — it is impossible to skip, because there is no code
// path that skips it. That is the difference between a rule and a habit.
//
// The class is pure domain: no HTTP, no cookies, no sessions. It takes a
// username string and returns a result. Every ownership test in Tests.cs runs
// against it directly, in microseconds, with no server.

public record Note(int Id, string Owner, string Text, DateTime CreatedAt);

/// Why an enum and not exceptions: "you may not touch this" is an expected
/// outcome of a normal request, not an exceptional one (cs#08). Endpoints
/// translate these three cases into 200 / 404 / 403 and nothing else.
public enum Access { Ok, NotFound, Forbidden }

public record NoteResult(Access Access, Note? Note)
{
    public static NoteResult Found(Note note) => new(Access.Ok, note);
    public static readonly NoteResult Missing = new(Access.NotFound, null);
    public static readonly NoteResult Denied = new(Access.Forbidden, null);
}

public class NoteService
{
    public const int MaxLength = 2000;

    private readonly List<Note> _notes = new();
    private readonly object _lock = new();
    private int _nextId = 1;

    /// A user's own notes, newest first. There is deliberately no method that
    /// returns everybody's — the original's whole disaster was that such a
    /// list existed and an endpoint returned it.
    public IReadOnlyList<Note> ListFor(string owner)
    {
        var name = UserStore.Normalize(owner);
        lock (_lock)
            return _notes.Where(n => n.Owner == name).OrderByDescending(n => n.Id).ToList();
    }

    public Note Create(string owner, string text)
    {
        var name = UserStore.Normalize(owner);
        lock (_lock)
        {
            var note = new Note(_nextId++, name, text.Trim(), DateTime.UtcNow);
            _notes.Add(note);
            return note;
        }
    }

    public NoteResult Get(string owner, int id)
    {
        lock (_lock)
        {
            var index = IndexOf(id);
            if (index < 0) return NoteResult.Missing;
            if (!Owns(owner, _notes[index])) return NoteResult.Denied;
            return NoteResult.Found(_notes[index]);
        }
    }

    public NoteResult Update(string owner, int id, string text)
    {
        lock (_lock)
        {
            var index = IndexOf(id);
            if (index < 0) return NoteResult.Missing;
            if (!Owns(owner, _notes[index])) return NoteResult.Denied;

            // `with` on a record: the Owner and CreatedAt are carried over
            // untouched, so an edit can never re-home a note or forge its age.
            var updated = _notes[index] with { Text = text.Trim() };
            _notes[index] = updated;
            return NoteResult.Found(updated);
        }
    }

    public NoteResult Delete(string owner, int id)
    {
        lock (_lock)
        {
            var index = IndexOf(id);
            if (index < 0) return NoteResult.Missing;
            if (!Owns(owner, _notes[index])) return NoteResult.Denied;

            var removed = _notes[index];
            _notes.RemoveAt(index);
            return NoteResult.Found(removed);
        }
    }

    public int CountFor(string owner) => ListFor(owner).Count;

    /// Validation for the note text itself — pure, and tested without HTTP.
    public static IReadOnlyList<string> Validate(string? text)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(text)) errors.Add("text is required");
        else if (text.Trim().Length > MaxLength) errors.Add($"text must be at most {MaxLength} characters");
        return errors;
    }

    private int IndexOf(int id) => _notes.FindIndex(n => n.Id == id);

    /// The single comparison the entire application's privacy rests on.
    /// Ordinal, not culture-sensitive: string comparison rules that vary by
    /// the server's locale have no business deciding who reads what.
    private static bool Owns(string owner, Note note)
        => string.Equals(note.Owner, UserStore.Normalize(owner), StringComparison.Ordinal);
}
