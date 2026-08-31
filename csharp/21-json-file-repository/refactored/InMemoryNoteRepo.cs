// The fake: same contract, no disk. Tests run against this in microseconds,
// and it deliberately mirrors JsonFileNoteRepo's behavior (ids are max+1,
// deletes report whether anything was removed, ...) — a fake that behaves
// differently from the real thing gives you green tests and a broken app.

public class InMemoryNoteRepo : INoteRepo
{
    private readonly List<Note> _notes = new();
    private readonly object _lock = new();

    public IReadOnlyList<Note> GetAll()
    {
        lock (_lock) return _notes.ToList();
    }

    public Note? Find(int id)
    {
        lock (_lock) return _notes.FirstOrDefault(n => n.Id == id);
    }

    public Note Add(string text)
    {
        lock (_lock)
        {
            var id = _notes.Count == 0 ? 1 : _notes.Max(n => n.Id) + 1;
            var note = new Note(id, text, Pinned: false);
            _notes.Add(note);
            return note;
        }
    }

    public Note? Update(int id, string text, bool pinned)
    {
        lock (_lock)
        {
            var index = _notes.FindIndex(n => n.Id == id);
            if (index < 0) return null;
            var updated = _notes[index] with { Text = text, Pinned = pinned };
            _notes[index] = updated;
            return updated;
        }
    }

    public bool Delete(int id)
    {
        lock (_lock) return _notes.RemoveAll(n => n.Id == id) > 0;
    }
}
