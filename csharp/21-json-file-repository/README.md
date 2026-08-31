# CS 21 — json-file-repository

**Lesson: hide "where the data lives" behind a repository interface — endpoints
talk to `INoteRepo`, and disk vs memory vs database becomes a swappable detail.**

## Run it

```
dotnet run csharp/21-json-file-repository/original.cs
dotnet run --project csharp/21-json-file-repository/refactored
dotnet run --project csharp/21-json-file-repository/refactored -- test
```

With either server on http://localhost:5021:

```
curl http://localhost:5021/notes
curl -X POST "http://localhost:5021/notes" -H "Content-Type: application/json" -d "{\"text\":\"buy milk\"}"
curl -X PUT  "http://localhost:5021/notes/1" -H "Content-Type: application/json" -d "{\"text\":\"buy oat milk\",\"pinned\":true}"
curl -X DELETE http://localhost:5021/notes/1
```

(The original takes query strings instead: `curl -X POST "http://localhost:5021/notes?text=buy+milk"`.)

## What's wrong with the original?

This is js#55's disease with a web server on top:

1. **`"notes.json"` is a relative path** — it resolves against whatever directory
   you launched from. Start the app from two different folders and you get two
   different "databases", each missing the other's notes.
2. **First run used to crash** (no file yet) — patched by copy-pasting
   `if (!File.Exists(...)) File.WriteAllText(...)` into *every* endpoint
   ("hotfix #142"). Forget it in the next endpoint and the crash returns.
3. **Read-modify-write with no lock**: two concurrent POSTs both read the same
   list, both add their note, last writer wins — one note silently vanishes.
   The lost update, again.
4. **Every endpoint re-implements the storage ritual** (read, parse, mutate,
   serialize, write). Five copies of the cycle = five places to get it wrong,
   and zero ways to test any endpoint without touching the real file.

## What changed in the refactor

- **`INoteRepo`** — five methods (`GetAll/Find/Add/Update/Delete`). Endpoints
  depend on the interface via DI (project 18) and contain zero `File.*` calls.
- **`JsonFileNoteRepo`** — the real one. Path is injected once (anchored to
  `AppContext.BaseDirectory`, not the launch directory), missing/empty file
  reads as `[]`, and a `lock` wraps each whole read-modify-write cycle so
  updates can't be lost. Load/Save are *private* — callers can't re-implement
  the cycle wrong because they never hold it (js#55's `update(fn)` idea).
- **`InMemoryNoteRepo`** — the fake. Same contract, no disk.
- **Tests run one shared contract suite against BOTH implementations**, plus
  file-only checks: graceful first run, and notes surviving a "restart" (a new
  repo instance on the same temp file). Temp files are cleaned up after.

This interface seam is exactly where **EF Core** (`Microsoft.EntityFrameworkCore`,
a NuGet package) and a real database would plug in later: write an
`EfCoreNoteRepo`, change one DI line, touch no endpoint.

## Key takeaway

Storage is a detail; the interface is the design. When endpoints depend on
`INoteRepo` instead of on a file, you can test against a fake in microseconds,
fix path/locking/first-run problems in one class, and upgrade to a real
database by swapping one registration line. If "how we store notes" changes
and more than one file needs editing, the seam is in the wrong place.
