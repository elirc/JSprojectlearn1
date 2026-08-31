# 📘 Learning Guide: JSON File Repository

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A notes API — create, read, update, delete little text notes — where the notes must *survive a restart*. No database installed, so the notes live in a JSON file: read the file, change the list, write the file back. You built exactly this in JavaScript in js#55 (the JSON "database"); this is the C# web-server edition, and it steps on all the same rakes before fixing them properly.

Both versions run on `http://localhost:5021`. The interesting part isn't the endpoints — it's *where the file-handling code lives*.

## 2. Concepts you need first

### Files in C#: `File.ReadAllText` / `File.WriteAllText`
The `File` class (namespace `System.IO`) does whole-file operations in one call:

```csharp
File.WriteAllText("data.txt", "hello");     // create/overwrite the file
string s = File.ReadAllText("data.txt");    // read it all back: "hello"
bool there = File.Exists("data.txt");       // true
```

JS comparison: `fs.writeFileSync` / `fs.readFileSync` from js#55. Same shape, same blocking behavior, same traps.

### JSON serialization: `System.Text.Json`
**Serialization** = turning an object into text; **deserialization** = text back into objects. C# ships `JsonSerializer` in the box:

```csharp
using System.Text.Json;

var notes = new List<Note> { new(1, "hi", false) };
string json = JsonSerializer.Serialize(notes);          // "[{\"Id\":1,...}]"
var back = JsonSerializer.Deserialize<List<Note>>(json); // List<Note> again
```

The `<List<Note>>` part tells the deserializer what type to build (C# needs to know the shape at compile time — unlike `JSON.parse`, which just returns "whatever"). `Deserialize` returns `null` for the JSON text `"null"`, so its return type is nullable — you'll see `?? new List<Note>()` to cover that.

### Working directory vs. the app's own folder
Every running program has a **current working directory** (cwd) — the folder it was launched *from*. A **relative path** like `"notes.json"` means "notes.json in the cwd". That's a landmine for servers: launch the app from the repo root, the file lands in the repo root; launch it from your desktop, it lands on your desktop, and the app "loses" all your notes.

The fix: build an **absolute path** from a stable anchor. `AppContext.BaseDirectory` is the folder containing the compiled app itself — the same no matter where you launched from:

```csharp
var path = Path.Combine(AppContext.BaseDirectory, "notes.json");
```

`Path.Combine` joins path pieces with the right slash for the OS (like Node's `path.join`; js#50 used `import.meta.url` tricks for the same reason).

### Race conditions and `lock`
A web server handles requests **concurrently** — two can be in flight at once (project 14's async lesson). Now picture both running this sequence: *read file → add note → write file*. Both read the same 3-note list; request A writes 4 notes (with A's note); request B then writes 4 notes (with B's note) — **overwriting A's write**. A's note is gone, no error anywhere. That's a **race condition** (specifically the *lost update*; js#55 hit it too).

C#'s `lock` statement makes a block of code single-file:

```csharp
private readonly object _lock = new();

lock (_lock)
{
    // only ONE thread can be in here at a time;
    // others queue up at the door and wait
}
```

If the *entire* read-modify-write cycle happens inside `lock`, requests take turns and no update is lost. (js#55 solved the same problem with a promise chain — single-threaded JS queues differently, but the principle is identical: serialize the writes.)

### The repository pattern
A **repository** is an object that stands between your app and its storage, exposing intention-level methods (`Add`, `Find`, `Delete`) and hiding the mechanics (files? memory? SQL?). The app says *what*, the repository decides *how*.

### Interfaces as seams (recap from project 10 and 18)
An **interface** lists method signatures with no bodies; classes **implement** it:

```csharp
public interface INoteRepo { Note Add(string text); /* ... */ }

public class JsonFileNoteRepo : INoteRepo { /* real: file I/O */ }
public class InMemoryNoteRepo : INoteRepo { /* fake: a List   */ }
```

Code written against `INoteRepo` cannot tell the implementations apart — which is the point. A **fake** is a working, simplified implementation used in tests (you built one for js#55's tests, too). The place where you can swap implementations is called a **seam** — and this repo's whole thesis is that good code puts seams where change will happen. Storage *will* change (file → database), so storage gets a seam.

### Dependency injection recap (project 18)
Registering the choice once:

```csharp
builder.Services.AddSingleton<INoteRepo>(new JsonFileNoteRepo(path));
```

Any endpoint that declares an `INoteRepo` parameter gets handed that instance. `AddSingleton` = one shared instance for the whole app — exactly right here, because the lock inside it must be shared to do its job.

### Temp files in tests
Tests for the *real* repo need a real file — but not `notes.json`! `Path.GetTempFileName()` creates a unique empty file in the OS temp folder and returns its path. Tests point the repo at it, do their thing, and delete it in a `finally` block (code that runs whether or not the test crashed). No leftovers, no shared state between test runs.

## 3. Walking through the original code

Every endpoint is the same movie. Take POST:

```csharp
app.MapPost("/notes", (string? text) =>
{
    if (string.IsNullOrWhiteSpace(text)) return Results.BadRequest("text is required");
    if (!File.Exists("notes.json")) File.WriteAllText("notes.json", "[]");   // hotfix #142

    var notes = JsonSerializer.Deserialize<List<Note>>(File.ReadAllText("notes.json"))!;
    var note = new Note { Id = notes.Count == 0 ? 1 : notes.Max(n => n.Id) + 1, Text = text };
    notes.Add(note);
    File.WriteAllText("notes.json", JsonSerializer.Serialize(notes));
    return Results.Created($"/notes/{note.Id}", note);
});
```

Line by line: check the input; the "hotfix #142" ritual (create the file if this is the first run — copy-pasted into all five endpoints because the app used to crash on first run); read and parse the whole file; compute the next id (`Max + 1`); append; serialize and rewrite the whole file. The `!` after `Deserialize` is the null-forgiving operator from project 05 — "trust me, it's not null" — which is exactly the kind of trust that ages badly.

GET, PUT, and DELETE repeat the ritual with small variations. Five endpoints, five copies of the storage code, zero copies of any concurrency protection.

## 4. What's wrong with it (in beginner terms)

**1. The database moves around.** `"notes.json"` is relative, so the *launch directory* decides where your data is. Run `dotnet run csharp/21-json-file-repository/original.cs` from the repo root: file appears in the repo root. `cd csharp` and run it again: a fresh empty `notes.json` appears there, and the API happily reports you have no notes. Nothing crashed — your data is just... elsewhere. Bugs that depend on *how the program was started* are miserable to reproduce.

**2. First-run handling is a ritual, not a guarantee.** The `if (!File.Exists...)` line works — where someone remembered to paste it. The next endpoint anyone adds starts from a blank editor line, and the FileNotFoundException returns. Correctness by copy-paste discipline always loses eventually.

**3. The lost update.** No lock around read-modify-write means two simultaneous POSTs can each read `[A]`, one writes `[A,B]`, the other writes `[A,C]` — B is gone, silently. On your laptop with one curl at a time you'll never see it; under real traffic it's guaranteed. The worst bugs are the ones that pass every manual test.

**4. Untestable endpoints.** How do you test POST without writing to the real `notes.json`? You can't — the filename is hard-coded *inside* the endpoint. So there are no tests. Notice the chain: hard-coded dependency → untestable → untested → scary to change. Project 01's question ("how would I test this?") diagnoses the design in one move.

**5. Five copies of the cycle.** When you decide to add caching, or atomic writes, or switch to a database — that's five edits, kept in sync by hope.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Every endpoint does read-parse-mutate-serialize-write. Could that live in ONE place the endpoints just call?
2. 🌿 Design the interface first: what five methods do the endpoints actually need? (`GetAll`, `Find`, `Add`, `Update`, `Delete`.) Write `INoteRepo`, then move all the file code into a `JsonFileNoteRepo` that implements it.
3. 🌳 In the repo class: take the path as a constructor parameter (the caller decides where!), return an empty list when the file's missing, and wrap each method's body in `lock (_lock) { ... }`.
4. 🍎 Write `InMemoryNoteRepo` (a `List<Note>` behind the same interface), register the file version with `AddSingleton<INoteRepo>(...)`, and write one test function that takes *any* `INoteRepo` and runs the same assertions — call it twice, once per implementation, using `Path.GetTempFileName()` for the real one.

## 6. Understanding the refactored solution

**`INoteRepo.cs`** — the contract, five methods, plus the `Note` record itself. Read the comment block in that file: it names the three implementations this seam supports, including the one that doesn't exist yet (EF Core + a real database — that's the upgrade path, and it will cost one DI line).

**`JsonFileNoteRepo.cs`** — all the original's storage code, gathered into one class and fixed once:

```csharp
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
```

The whole read-modify-write cycle sits inside one `lock`, so concurrent requests take turns — the lost update is structurally impossible (within this one process; two separate *server processes* sharing a file would still race, which is precisely when you graduate to a real database). `Load()` returns `[]` for a missing or empty file — first-run handling exists exactly once. And note that `Load`/`Save` are **private**: endpoints *can't* rebuild the cycle wrong, because they can't reach the pieces. That's js#55's `update(fn)` insight wearing C# clothes.

**`InMemoryNoteRepo.cs`** — fifteen lines of honest fake. It deliberately copies the real repo's little behaviors (ids are `max + 1`, `Delete` returns whether anything was removed) because a fake that drifts from the real thing makes tests lie.

**`Program.cs`** — the punchline:

```csharp
builder.Services.AddSingleton<INoteRepo>(
    new JsonFileNoteRepo(Path.Combine(AppContext.BaseDirectory, "notes.json")));
```

One line decides where data lives, with the path anchored to the app's own folder. Every endpoint shrank to translation work:

```csharp
app.MapGet("/notes/{id}", (int id, INoteRepo repo) =>
    repo.Find(id) is { } note ? Results.Ok(note) : Results.NotFound());
```

(`is { } note` is a pattern meaning "is not null — and call it `note`".) No `File`, no `JsonSerializer`, no hotfix ritual. The refactored API also switched to JSON bodies (`NewNote`/`EditNote` records) per project 17's model-binding lesson.

**`Tests.cs`** — the structure is the star: `ContractSuite(INoteRepo repo, string label)` runs ~20 assertions against *whatever you hand it*, and `Run()` hands it the fake, then the real repo pointed at a `Path.GetTempFileName()` file (deleted in `finally`). Then come the file-only tests: a repo on a nonexistent path reads as empty without creating the file, and — the persistence payoff — a *second* repo instance on the same path still sees the first one's note. That second instance *is* a simulated app restart.

## 7. Words you learned (glossary)

- **Persistence** — data surviving after the program stops (here: a JSON file).
- **Serialization / deserialization** — object → text / text → object (`JsonSerializer.Serialize` / `.Deserialize<T>`).
- **Current working directory (cwd)** — the folder a program was launched from; what relative paths resolve against.
- **Relative vs absolute path** — "notes.json" (depends on cwd) vs "C:\\...\\notes.json" (doesn't).
- **`AppContext.BaseDirectory`** — the folder the compiled app lives in; a stable anchor for paths.
- **`Path.Combine`** — joins path segments with the correct separator.
- **Race condition** — outcome depends on the timing of concurrent operations.
- **Lost update** — two read-modify-write cycles interleave; the second write erases the first.
- **`lock`** — C# statement ensuring one thread at a time runs a block.
- **Repository pattern** — an object exposing `Add/Find/...` and hiding storage mechanics.
- **Interface / implementation** — the contract vs a class fulfilling it (`INoteRepo` / `JsonFileNoteRepo`).
- **Fake** — a simplified real implementation used for tests (`InMemoryNoteRepo`).
- **Seam** — a designed point where implementations can be swapped without touching callers.
- **Contract tests** — one test suite run against every implementation of an interface.
- **`Path.GetTempFileName()`** — creates a unique temp file; tests use it and delete it in `finally`.
- **EF Core** — .NET's database toolkit (`Microsoft.EntityFrameworkCore`, a NuGet package); the future occupant of this seam.

## 8. Experiments to try on the plane (no internet needed)

All of this is localhost + local files — fully offline.

1. **Reproduce the wandering database.** From the repo root: `dotnet run csharp/21-json-file-repository/original.cs`, POST a note (`curl -X POST "http://localhost:5021/notes?text=hello"`), stop it (Ctrl+C). Now `cd csharp` and run `dotnet run 21-json-file-repository/original.cs` — GET `/notes` returns `[]`. Your note isn't gone — it's in a `notes.json` sitting in the repo root. Find both files, then delete them. The refactored server, started from those same two folders, sees the same notes both times.
2. **Find the refactored data file.** Start the refactored server, add a note, then look in `csharp/21-json-file-repository/refactored/bin/Debug/net10.0/` — there's `notes.json`, pretty-printed, next to the app binary. That's `AppContext.BaseDirectory` in the flesh.
3. **Break the fake on purpose.** In `InMemoryNoteRepo.Add`, change the id rule to `_notes.Count + 1` and run `-- test`. Expected: memory-suite failures after deletes (delete note 1 of 2, add again → duplicate id 2), while the `[file]` suite stays green. That divergence is exactly what contract tests exist to catch.
4. **Simulate the crash the hotfix was for.** In the original, delete one of the `if (!File.Exists...)` lines from GET `/notes`, delete any stray `notes.json`, run, and curl it: FileNotFoundException, 500. Now try to make the *refactored* app fail the same way — you can't, because first-run handling lives in `Load()`, once.
5. **Add an atomic save (js#55's best trick).** In `JsonFileNoteRepo.Save`, write to `_path + ".tmp"` first, then `File.Move(tmp, _path, overwrite: true);`. Run `-- test` — still green, because you changed one private method and the contract never knew. That's the seam doing its job; a crash mid-write now can't leave a half-written notes.json.
6. **Preview the future.** Sketch (on paper or in a scratch file) `class SqliteNoteRepo : INoteRepo` — just the method signatures. Count how many endpoint lines would change when it becomes real. (Zero. One registration line in Program.cs.)
