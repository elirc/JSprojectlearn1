# 🏋️ Practice: JSON File Repository

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Pinned notes first (warm-up)

Add `GET /notes/pinned` returning only pinned notes, and make `GET /notes` return pinned notes first (then the rest, each group by id). Do it **without adding anything to `INoteRepo`** — the endpoint already has `GetAll()`, and the rest is LINQ (project 04). Notice what this proves: not every feature needs a new storage method.
*Practices:* keeping presentation concerns in the endpoint instead of leaking them into the seam.
**Hint:** `repo.GetAll().OrderByDescending(n => n.Pinned).ThenBy(n => n.Id)` — `false` sorts before `true`, so *descending* puts pinned on top.
**Check offline:** start the server, then `curl -X POST http://localhost:5021/notes -H "Content-Type: application/json" -d "{\"text\":\"a\"}"`, same for `b`, then `curl -X PUT http://localhost:5021/notes/2 -H "Content-Type: application/json" -d "{\"text\":\"b\",\"pinned\":true}"`. Now `curl http://localhost:5021/notes` → note 2 first; `curl http://localhost:5021/notes/pinned` → only note 2.

### ⭐⭐ 2. Search across the seam (core)

Add `IReadOnlyList<Note> Search(string term)` to `INoteRepo` — case-insensitive substring match on `Text`, with a blank term meaning "everything". Implement it in **both** repos and add it to the shared `ContractSuite`, then expose it as `GET /notes?q=milk`. Before you write the implementations, add the method to the interface alone and build: the compiler will list every class that owes you work.
*Practices:* evolving an interface, and letting error CS0535 be your to-do list.
**Hint:** `n.Text.Contains(term.Trim(), StringComparison.OrdinalIgnoreCase)` — the comparison overload is the whole feature. Keep the whole thing inside the existing `lock`, and in the file repo call `Load()` once rather than per note.
**Check offline:** add these to `ContractSuite` (they run against BOTH repos automatically):
```csharp
Check.Equal(1, repo.Search("MILK").Count, $"[{label}] search is case-insensitive");
Check.Equal(0, repo.Search("zzz").Count, $"[{label}] no matches -> empty list, not null");
Check.Equal(2, repo.Search("   ").Count, $"[{label}] a blank term means everything");
```
Place them right after the `Find` assertions, while notes 1 ("buy milk") and 2 ("water plants") exist. Then `curl "http://localhost:5021/notes?q=milk"`.

### ⭐⭐ 3. Notes remember when they were made (core)

Add `DateTime CreatedAt` to the `Note` record (last positional parameter) and set it in both repos' `Add`. The interesting part is the file you already wrote: an existing `notes.json` has no `createdAt` field. Predict what happens on load, then look — `System.Text.Json` supplies `default` (`0001-01-01`) for the missing constructor argument, so old notes load fine and simply look ancient.
*Practices:* schema evolution on a JSON store, and records with more positional members.
**Hint:** give the parameter a default — `public record Note(int Id, string Text, bool Pinned, DateTime CreatedAt = default);` — so `new Note(id, text, Pinned: false)` in old code still compiles while you migrate.
**Check offline:** add to `ContractSuite`:
```csharp
Check.True(a.CreatedAt > DateTime.UtcNow.AddMinutes(-1), $"[{label}] Add stamps CreatedAt");
Check.True(b.CreatedAt >= a.CreatedAt, $"[{label}] later notes are stamped later");
```
And prove the migration by hand: stop the server, open `refactored/bin/Debug/net10.0/notes.json`, delete one note's `"CreatedAt"` line, restart, and `curl http://localhost:5021/notes` → that note comes back with `"createdAt":"0001-01-01T00:00:00"` and nothing crashes.

### ⭐⭐ 4. One locked read-modify-write, any edit (core)

`Update` can only set text and pinned. Rather than adding `SetPinned`, `Rename`, `Archive`… one at a time, port js#55's `update(fn)` trick: add `Note? Mutate(int id, Func<Note, Note> change)` to `INoteRepo`. The caller supplies a function from the old note to the new one; the repo runs it *inside its lock*, so arbitrary edits still get exactly one safe cycle. Then rewrite `Update` as a one-line call to `Mutate` and add `PATCH /notes/{id}/pin`.
*Practices:* passing a function into a critical section, and collapsing a family of methods into one.
**Hint:** `var updated = change(notes[index]) with { Id = id };` — re-stamping the id stops a careless lambda from renumbering a note. The endpoint is `repo.Mutate(id, n => n with { Pinned = true })`.
**Check offline:** add to `ContractSuite`:
```csharp
Check.Equal(true, repo.Mutate(1, n => n with { Pinned = true })!.Pinned, $"[{label}] Mutate applies the change");
Check.Equal(true, repo.Find(1)!.Pinned, $"[{label}] and it is actually stored");
Check.Equal(1, repo.Mutate(1, n => n with { Id = 999 })!.Id, $"[{label}] Mutate cannot renumber a note");
Check.Equal(null, repo.Mutate(404, n => n), $"[{label}] Mutate on a missing id returns null");
```
Then `curl -i -X PATCH http://localhost:5021/notes/1/pin` → `200` with `"pinned":true`.

### ⭐⭐⭐ 5. A caching repository (challenge)

Every `GET /notes` currently reads and parses the whole file. Write `CachingNoteRepo : INoteRepo` whose constructor takes **another `INoteRepo`**: reads come from an in-memory snapshot, and every write forwards to the inner repo and then drops the cache. Register it in `Program.cs` by wrapping the file repo — one line, zero endpoint edits. Then run the existing `ContractSuite` against it and watch a brand-new class arrive pre-tested.
*Practices:* the decorator pattern on a seam (project 10's `CompositeCipher`, applied to storage), and cache invalidation as a design problem rather than a bug.
**Hint:** `private List<Note>? _cache;` — `null` means "cold". `GetAll` fills it under the lock and returns a copy; every write method calls a private `Invalidate()` that sets it back to `null`. Build `Find` and `Search` *on top of* `GetAll` so they get the cache for free.
**Check offline:** add to `Tests.Run()` — the suite passes unchanged against the new class:
```csharp
Console.WriteLine("Contract suite vs CachingNoteRepo (a decorator over the fake)");
ContractSuite(new CachingNoteRepo(new InMemoryNoteRepo()), "cached");
```
And prove the invalidation with a counting fake: wrap `InMemoryNoteRepo`, call `GetAll()` twice (inner read count 1), `Add` once, `GetAll()` again (inner read count 2). Registration is `builder.Services.AddSingleton<INoteRepo>(new CachingNoteRepo(new JsonFileNoteRepo(Path.Combine(AppContext.BaseDirectory, "notes.json"))));`

## Solutions

### 1. Pinned notes first

```csharp
// Program.cs
app.MapGet("/notes", (INoteRepo repo) => Results.Ok(
    repo.GetAll().OrderByDescending(n => n.Pinned).ThenBy(n => n.Id)));

app.MapGet("/notes/pinned", (INoteRepo repo) => Results.Ok(
    repo.GetAll().Where(n => n.Pinned).OrderBy(n => n.Id)));
```

WHY: sort order is a *presentation* decision, and pushing it into `INoteRepo` would force every future implementation — the in-memory fake, an EF Core repo, a mock in someone's test — to reproduce it. The seam should say what data exists, not how a screen wants it arranged. `OrderByDescending` on a `bool` works because `false < true`, and `ThenBy` keeps the result deterministic, which is what makes it testable at all.

### 2. Search across the seam

```csharp
// INoteRepo.cs
IReadOnlyList<Note> Search(string term);

// InMemoryNoteRepo.cs
public IReadOnlyList<Note> Search(string term)
{
    lock (_lock)
    {
        if (string.IsNullOrWhiteSpace(term)) return _notes.ToList();
        return _notes.Where(n => n.Text.Contains(term.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
    }
}

// JsonFileNoteRepo.cs
public IReadOnlyList<Note> Search(string term)
{
    lock (_lock)
    {
        var notes = Load();                       // ONE read, not one per note
        if (string.IsNullOrWhiteSpace(term)) return notes;
        return notes.Where(n => n.Text.Contains(term.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
    }
}

// Program.cs
app.MapGet("/notes", (INoteRepo repo, string? q) => Results.Ok(
    repo.Search(q ?? "").OrderByDescending(n => n.Pinned).ThenBy(n => n.Id)));
```

WHY: the compile error you saw first is the feature — `error CS0535: 'InMemoryNoteRepo' does not implement interface member 'INoteRepo.Search'` is the interface refusing to let an implementation drift, exactly like project 10's ciphers. Note the cost, though: **every** widening of the seam is paid for by every implementation, which is why exercise 1 stayed out of it. `string? q` binds automatically from the query string, and passing `""` for a missing `q` reuses the blank-means-all rule instead of inventing a second path.

### 3. Notes remember when they were made

```csharp
// INoteRepo.cs — the default keeps old construction sites compiling
public record Note(int Id, string Text, bool Pinned, DateTime CreatedAt = default);

// both repos, inside Add
var note = new Note(id, text, Pinned: false, CreatedAt: DateTime.UtcNow);
```

WHY: `System.Text.Json` binds a record by calling its constructor, and a JSON object missing `CreatedAt` simply leaves that parameter at its default — so yesterday's `notes.json` loads without a migration script, a version field, or a crash. That is the quiet upside of a plain-JSON store, and also its trap: nothing *tells* you those notes are unstamped, they just claim the year 1. A real migration would either backfill on load or make the property `DateTime?` so "unknown" is representable — which is project 05's null-safety lesson arriving in your database.

### 4. One locked read-modify-write, any edit

```csharp
// INoteRepo.cs
Note? Mutate(int id, Func<Note, Note> change);

// JsonFileNoteRepo.cs
public Note? Mutate(int id, Func<Note, Note> change)
{
    lock (_lock)
    {
        var notes = Load();
        var index = notes.FindIndex(n => n.Id == id);
        if (index < 0) return null;
        var updated = change(notes[index]) with { Id = id };   // the id is not the caller's to change
        notes[index] = updated;
        Save(notes);
        return updated;
    }
}

// Update is now a one-liner in BOTH repos
public Note? Update(int id, string text, bool pinned)
    => Mutate(id, n => n with { Text = text, Pinned = pinned });

// InMemoryNoteRepo.Mutate is the same shape without Load/Save.

// Program.cs
app.MapPatch("/notes/{id}/pin", (int id, INoteRepo repo) =>
    repo.Mutate(id, n => n with { Pinned = true }) is { } note ? Results.Ok(note) : Results.NotFound());
```

WHY: the whole point of hiding `Load`/`Save` was that no caller could run the read-modify-write cycle incorrectly — but that also meant every new kind of edit needed a new repo method. `Mutate` restores the flexibility without giving the cycle away: the caller supplies *what* to change, the repo still owns *when and how*, and the lock still spans exactly one read-modify-write. This works so cleanly because `Note` is a record: `with` produces a new value instead of mutating the one in the list, so a lambda cannot corrupt the stored note behind the repo's back. Re-stamping `Id` afterwards closes the one hole a free-form function opens.

### 5. A caching repository

```csharp
// CachingNoteRepo.cs
public class CachingNoteRepo : INoteRepo
{
    private readonly INoteRepo _inner;
    private readonly object _lock = new();
    private List<Note>? _cache;              // null = cold

    public CachingNoteRepo(INoteRepo inner) => _inner = inner;

    public IReadOnlyList<Note> GetAll()
    {
        lock (_lock)
        {
            _cache ??= _inner.GetAll().ToList();
            return _cache.ToList();          // hand out a COPY, never the cache itself
        }
    }

    // Reads built on GetAll get the cache for free.
    public Note? Find(int id) => GetAll().FirstOrDefault(n => n.Id == id);

    public IReadOnlyList<Note> Search(string term)
        => string.IsNullOrWhiteSpace(term)
            ? GetAll()
            : GetAll().Where(n => n.Text.Contains(term.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();

    // Writes forward, then drop the cache.
    public Note Add(string text) { var n = _inner.Add(text); Invalidate(); return n; }
    public Note? Update(int id, string text, bool pinned) { var n = _inner.Update(id, text, pinned); Invalidate(); return n; }
    public Note? Mutate(int id, Func<Note, Note> change) { var n = _inner.Mutate(id, change); Invalidate(); return n; }
    public bool Delete(int id) { var ok = _inner.Delete(id); Invalidate(); return ok; }

    private void Invalidate() { lock (_lock) _cache = null; }
}

// Program.cs — one line, and no endpoint knows a cache exists
builder.Services.AddSingleton<INoteRepo>(new CachingNoteRepo(
    new JsonFileNoteRepo(Path.Combine(AppContext.BaseDirectory, "notes.json"))));
```

WHY: this class is both an `INoteRepo` and a holder of one, which is why it can slot in anywhere the interface is expected — the same trick as project 10's `CompositeCipher`, and the reason the contract suite tests it for free the moment you point it at a repo. Handing out `_cache.ToList()` rather than `_cache` matters: returning the live list would let a caller mutate your cache (project 09's whole lesson), and the copy also keeps the `IReadOnlyList<Note>` promise honest. The blunt invalidate-everything-on-write policy is deliberate — clever partial invalidation is where caches go to become bugs, and the real limit here is the one the README already named: this cache is only correct while *one* process owns the file.
