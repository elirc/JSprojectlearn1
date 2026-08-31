// The SEAM. Endpoints depend on this interface and nothing else, so where
// notes actually live is a swappable detail:
//
//   JsonFileNoteRepo  — the real one (a JSON file on disk)
//   InMemoryNoteRepo  — the fake (a List<Note>; tests + demos)
//   EfCoreNoteRepo    — doesn't exist yet, but THIS is exactly where EF Core
//                       (Microsoft.EntityFrameworkCore, a NuGet package) and a
//                       real database would plug in later. Zero endpoint edits.
//
// Same idea as project 10's ICipher plug-ins, applied to storage.

public record Note(int Id, string Text, bool Pinned);

public interface INoteRepo
{
    IReadOnlyList<Note> GetAll();
    Note? Find(int id);
    Note Add(string text);
    Note? Update(int id, string text, bool pinned);
    bool Delete(int id);
}
