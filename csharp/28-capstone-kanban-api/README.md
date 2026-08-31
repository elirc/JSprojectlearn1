# CS 28 — Capstone: Kanban API

**Lesson: nothing new — and that's the lesson. Records, invariants, Results,
DI, repositories, ProblemDetails, tests, and a fetch frontend compose into a
small real product without a single new trick.**

## Run it

```
dotnet run csharp/28-capstone-kanban-api/original.cs
dotnet run --project csharp/28-capstone-kanban-api/refactored
dotnet run --project csharp/28-capstone-kanban-api/refactored -- test
```

Open http://localhost:5028 (one app at a time). In the original, move a card
to a new position **in its own column** — congratulations, you now have two.

## What's wrong with the original?

1. **The board is nested `Dictionary<string, object>` blobs.** Every read is
   a cast: `(List<Dictionary<string, object>>)col["cards"]`. Typos compile,
   shapes are folklore — the compiler, C#'s whole superpower, is benched
   (cs#11's "objects and casts" disease, terminal stage).
2. **THE BUG: same-column moves duplicate the card.** `/move-card` inserts
   into the target list, then skips removal when source == target ("it's
   already in there, right?") — the same object now sits in the list twice.
   Insert/remove index arithmetic is where js#64's off-by-one lived too.
3. **No validation, so bad input = 500.** Unknown column: NullReference.
   Position past the end: ArgumentOutOfRange. Empty title: sure, have a
   blank card. Clients get stack traces instead of answers.
4. **One giant file, logic inline in endpoints** — untestable, with a
   server-built reload-forms UI on top.

## What changed in the refactor

- `record Card(Guid Id, string Title)`; **`Column` defends its invariant**
  (duplicate card ids throw) and clamps positions; **`Board.MoveCard`
  removes FIRST, then inserts** — the duplicate bug becomes unrepresentable,
  and the tests shuffle hard then audit every id exactly once.
- **Expected failures are `Result`s, not exceptions**: `card_not_found`,
  `column_not_found`, `invalid_title`, `duplicate_column` — data, not 500s.
- **Endpoints translate Results into ProblemDetails** (404/409/400) in one
  `Problem()` helper; **`IBoardRepository` + in-memory impl** behind DI keeps
  storage swappable; **wwwroot frontend** with add-card, add-column, and
  ◀ ▶ move buttons — fetch, re-fetch, re-render.

## Which earlier project taught each piece

| Piece in this capstone | Taught by |
|---|---|
| `Card` as a record, value semantics | cs#02, cs#07 |
| `Column` hiding its list + invariants | cs#09 (encapsulation-bank) |
| `Result<T>` with error codes | cs#08 (exceptions-vs-result) |
| LINQ over columns/cards | cs#04, cs#13 |
| REST resources + status codes | cs#16 |
| DTO binding + validation at the door | cs#17 |
| DI container, singleton lifetime | cs#18 |
| ProblemDetails error responses | cs#20 |
| `IBoardRepository` + in-memory impl | cs#21 (json-file-repository) |
| `wwwroot` static frontend + fetch | cs#24, cs#25 |
| Hand-rolled `Check` tests | js#45, every cs project |
| Board-as-data, moves as pure logic | js#14, js#64 |

## Key takeaway

This is what "good code is easy to change" was for. Drag & drop? Only
`app.js` changes — the API already speaks *(cardId, toColumn, position)*,
js#64's vocabulary. A database? Implement `IBoardRepository`, touch nothing
else. A new rule? One method on `Board`, one test. Every pattern in the
track was a wall socket; the capstone just plugs things in.
