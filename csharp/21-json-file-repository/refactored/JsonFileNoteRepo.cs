using System.Text.Json;

// The real repository: notes live in one JSON file. Three fixes over the
// original, all in ONE place instead of copy-pasted per endpoint:
//
//   1. The path is decided ONCE, by whoever constructs the repo — and
//      Program.cs anchors it to AppContext.BaseDirectory (the folder the
//      compiled app lives in), so it no longer depends on which directory
//      you launched from.
//   2. Missing file = empty list. First run just works; no hotfix ritual.
//   3. Every operation takes a lock around its whole read-modify-write
//      cycle, so two requests can't interleave and lose an update (js#55's
//      lost-update bug). One process only — two SERVERS on one file would
//      still race; that's the point where you graduate to a real database.

public class JsonFileNoteRepo : INoteRepo
{
    private readonly string _path;
    private readonly object _lock = new();

    public JsonFileNoteRepo(string path) => _path = path;

    public IReadOnlyList<Note> GetAll()
    {
        lock (_lock) return Load();
    }

    public Note? Find(int id)
    {
        lock (_lock) return Load().FirstOrDefault(n => n.Id == id);
    }

    public Note Add(string text)
    {
        lock (_lock)
        {
            var notes = Load();
            var id = notes.Count == 0 ? 1 : notes.Max(n => n.Id) + 1;
            var note = new Note(id, text, Pinned: false);
            notes.Add(note);
            Save(notes);
            return note;
        }
    }

    public Note? Update(int id, string text, bool pinned)
    {
        lock (_lock)
        {
            var notes = Load();
            var index = notes.FindIndex(n => n.Id == id);
            if (index < 0) return null;
            var updated = notes[index] with { Text = text, Pinned = pinned };
            notes[index] = updated;
            Save(notes);
            return updated;
        }
    }

    public bool Delete(int id)
    {
        lock (_lock)
        {
            var notes = Load();
            if (notes.RemoveAll(n => n.Id == id) == 0) return false;
            Save(notes);
            return true;
        }
    }

    // Load/Save are private: the read-modify-write cycle belongs to the repo,
    // so no caller can re-implement it wrong (js#55's update(fn) lesson).
    private List<Note> Load()
    {
        if (!File.Exists(_path)) return new List<Note>();          // graceful first run
        var json = File.ReadAllText(_path);
        if (string.IsNullOrWhiteSpace(json)) return new List<Note>();
        return JsonSerializer.Deserialize<List<Note>>(json) ?? new List<Note>();
    }

    private void Save(List<Note> notes)
    {
        var json = JsonSerializer.Serialize(notes, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(_path, json);
    }
}
