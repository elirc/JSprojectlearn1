# 📘 Learning Guide: Capstone Kanban API

Read this before or alongside the README — the capstone introduces almost nothing new, so this guide is about recognizing everything you already know when it all shows up at once.

## 1. What are we building?

A kanban board — columns like *todo / doing / done* holding cards you can add and move around, like js#64 but fullstack: an ASP.NET Core API owns the board, and a vanilla-JS page renders columns side by side with ◀ ▶ buttons to move cards between them (buttons, not drag & drop, on purpose — the *move* is the interesting part, and js#64 already taught you the gesture is just glue).

Two versions, as always:

- The **original**: the whole board as nested `Dictionary<string, object>` blobs, logic inline in endpoints, no validation — and a real bug: moving a card within its own column *duplicates* it.
- The **refactor**: a proper domain (`Card`, `Column`, `Board`) that makes that bug impossible, `Result`-style errors, a repository, DI, ProblemDetails, and a full test suite for the move logic.

This is the graduation exercise: every section below names the project that taught the piece.

## 2. Concepts you need first

Mostly recaps — each with where you learned it, and the one sentence that matters here.

### Why `Dictionary<string, object>` is giving up (cs#03, cs#11)
`object` means "could be anything"; every read needs a cast telling the compiler *trust me*:

```csharp
var cards = (List<Dictionary<string, object>>)col["cards"];   // trust me
var title = (string)card["title"];                            // trust me again
```

Misspell `"tilte"` or cast to the wrong shape and it *compiles* — you find out at runtime, maybe. C#'s entire value over JS is that the compiler checks shapes; blob-dictionaries switch that off. Compare: `card.Title` on a `record Card(Guid Id, string Title)` cannot be misspelled, cannot be the wrong type, cannot half-exist.

### Invariants and encapsulation (cs#09)
An **invariant** is a fact that must stay true no matter what: here, *a card id appears at most once per column*. The bank account project taught the technique: make the data `private`, and let every public door defend the rule. `Column` keeps its `List<Card>` private and its `Insert` throws on a duplicate id — so the original's bug isn't "fixed", it's **unrepresentable**.

### `Guid` — ids nobody has to coordinate
`Guid.NewGuid()` makes a globally unique id (`b206b08b-de56-...`). Unlike the int counters of projects 25/26, Guids don't need a shared "next id" — handy once data might merge from several places. JSON-wise it's just a string; route-wise `{id:guid}` parses and rejects garbage before your code runs.

### `Result<T>` — expected failures as values (cs#08)
"Column doesn't exist" isn't exceptional; it's a Tuesday. So `Board` methods return:

```csharp
Result<Card> result = board.MoveCard(id, "doing", 0);
if (!result.Ok) ... result.Error.Code ...   // "card_not_found"
else            ... result.Value ...        // the moved card
```

Machine-readable codes (`card_not_found`) instead of prose, so callers can *act* on failures. Exceptions stay reserved for genuine "this should never happen" (Column's duplicate guard).

### ProblemDetails (cs#20)
The web-standard JSON shape for HTTP errors, built into ASP.NET Core:

```json
{ "title": "card_not_found", "status": 404, "detail": "No card with id ..." }
```

One `Problem(error)` helper maps domain codes to statuses — `*_not_found` → 404, `duplicate_column` → 409, everything else → 400. Every endpoint fails the same way; clients parse one shape.

### Repository + DI (cs#21, cs#18)
Endpoints never say where the board lives — they ask `IBoardRepository` for it. Today's implementation holds it in a field (`Load`/`Save`); a JSON-file or database version slots behind the same interface with zero endpoint changes. DI (`AddSingleton<IBoardRepository>(...)`) wires the choice in exactly one line, at the composition root.

### Position clamping
When a client says "insert at position 999" in a 3-card column, you can crash (the original), reject, or **clamp** — `Math.Clamp(position, 0, cards.Count)` snaps wild values into range. Clamping makes the API forgiving and the frontend simpler: "send a big number" reliably means "the end".

## 3. Walking through the original code

The board:

```csharp
var board = new List<Dictionary<string, object>>();
board.Add(new Dictionary<string, object> {
    ["name"] = name,
    ["cards"] = new List<Dictionary<string, object>>(),
});
```

Shapes exist only in the author's head. Every endpoint re-discovers them by casting.

Now the crime scene, `/move-card`. Step 1 — find the card, in a cast-happy double loop. Step 2 — find the destination list. Step 3:

```csharp
toCards!.Insert(pos, card!);        // unknown column? NullReference → 500
                                    // pos too big? ArgumentOutOfRange → 500
if (toCards != fromCards)           // same column: it's already in there,
    fromCards!.Remove(card!);       // so no need to remove... right?
```

**The bug in slow motion.** Moving a card from *todo* position 0 to *todo* position 2: `Insert` puts the card into the list a *second* time (same object, two slots). Then the guard says "same list — skip the removal". Two copies, forever — and each render happily draws both, because nothing anywhere checks. The author even reasoned it out loud in the comment. It's a *plausible* wrong: insert-then-remove within one list is genuinely tricky (remove first and indexes shift — js#64's exact off-by-one), which is why this logic belongs in a tested function, not inline in an endpoint between two casts.

The rest: `/add-card` accepts empty titles (and burns an id even if the column doesn't exist), the page is server-glued HTML with reload-forms (project 25's original, unrepentant), and `/api/board` ships the raw dictionaries out the door as the public contract.

## 4. What's wrong with it (in beginner terms)

**1. The compiler was fired.** With `object` blobs, C# catches nothing: wrong key, wrong cast, wrong shape — all compile, all explode later. You're writing JavaScript with extra ceremony and none of the safety you switched languages for.

**2. The bug is structural, not a typo.** Same-column duplication happens because *nothing owns the rule* "a card lives in exactly one place". The move logic is 25 inline lines that no test can reach; the invariant exists only as hope.

**3. Errors are crashes.** Unknown column, wild position — a library user's ordinary mistakes — return 500 stack traces. A client can't distinguish "I sent a bad id" from "the server is broken", so it can't react sensibly to either.

**4. Nothing has a seam.** No domain to test, no repository to swap, no DTOs to validate. Every future feature (persistence! undo! multiple boards!) starts with archaeology.

## 5. Try it yourself first!

The full refactor is big; climb it in the order the track taught it:

1. 🌱 **Types first** (cs#07): `record Card(Guid Id, string Title)`, a `Column` class, a `Board` class. Delete every cast. Feel the compiler come back online.
2. 🌿 **The move, as one function** (cs#08 + js#64): `MoveCard(cardId, toColumn, position)` returning a `Result`. Decide the insert/remove order carefully — write the same-column test *first* and make it pass.
3. 🌳 **Guard the doors** (cs#09, cs#17): blank titles/names rejected, positions clamped, duplicate ids impossible (make `Column.Insert` throw). Map every failure to an error code, then to ProblemDetails in one helper.
4. 🍎 **Wire the seams** (cs#18, cs#21, cs#24/25): `IBoardRepository` + in-memory impl via DI, thin endpoints, and a `wwwroot` page that fetches `/api/board`, renders columns, and POSTs add/move. Then shuffle cards hard and audit ids — your test suite should already be doing exactly that.

## 6. Understanding the refactored solution

**The domain** (`Board.cs`) is three types, each defending one idea:

- `Card` — a record: id + title, immutable, done (cs#07).
- `Column` — name + private ordered list. Its `Insert` clamps the position **and throws on a duplicate id**: the invariant's last line of defense, placed *inside* the type so no caller — present or future — can bypass it (cs#09).
- `Board` — the public door. `AddColumn` (trim, non-blank, case-insensitive uniqueness), `AddCard` (column must exist, title non-blank), and the star:

```csharp
// Remove FIRST, then insert — the order the original got backwards.
from.Remove(cardId);
to.Insert(position, card);   // Insert clamps wild positions for us
```

Two lines that carry js#64's entire hard-won lesson. Remove-first means the position always refers to a list the card is *not* in — no shifted indexes, no same-column special case at all. The tests then shuffle a card around and audit: total count unchanged, every id exactly once (`NoDuplicatesEver`). Failures come back as `Result`s with codes; the board is never left half-modified (validations all happen before the first mutation).

**The HTTP layer** (`Program.cs`) is translation, nothing else. Each endpoint: bind DTO → call `Board` → `repo.Save` → `Results.Created/Ok`, or hand the error to the one `Problem()` helper that owns the code→status table. Notice what's *absent*: no try/catch (expected failures are values), no casts, no logic. If an endpoint fits in six lines, bugs have nowhere to sit.

**The seam** (`BoardRepository.cs`): endpoints call `Load()`/`Save()`. The in-memory `Save` is a one-line field write — deliberately trivial, because the *interface* is the point: it's the socket a JSON-file version (cs#21 showed you how) screws into later, and it's why tests could fake storage if they needed to.

**The frontend** (`wwwroot/app.js`) is project 25's loop wearing kanban clothes: fetch `/api/board` → render columns → any action POSTs → re-fetch → re-render. The client-side `board` variable is explicitly a *mirror*, never the master (js#64's "the DOM is not the database"). Move buttons send `{toColumn, position: to.cards.length}` — "the end" — and lean on server clamping. Errors surface the ProblemDetails `title: detail` in a banner; try moving with a stale board (two tabs open) and you'll see `card_not_found` handled like a grown-up instead of a 500.

**How it composes** — the point of the whole track: the frontend can't corrupt the board because the API validates; the API can't corrupt it because only `Board` mutates; `Board` can't because `Column` enforces the invariant; and the tests prove the stack from the inside. Four layers, each easy to change *because* it only touches its neighbors through a narrow, named contract.

## 7. Words you learned (glossary)

- **Capstone** — the final project that combines every prior pattern instead of adding one.
- **Blob data** — shapeless nested dictionaries/`object`s; code the compiler can't check.
- **Invariant** — a fact that must always hold (one card id per column, at most once).
- **Unrepresentable** — designed so the bad state can't be constructed at all, vs merely checked for.
- **`Guid`** — a globally unique id; no counter to coordinate.
- **`Result<T>` / error code** — expected failure as a value with a machine-readable name.
- **ProblemDetails** — the standard JSON error body (`title`, `status`, `detail`).
- **Clamping** — snapping an out-of-range number into range instead of crashing.
- **Repository** — the interface between "what the app does" and "where data lives".
- **Composition root** — the one place (DI registration) where implementations are chosen.
- **Seam** — a boundary (interface, DTO, endpoint) where one layer can change without the others noticing.
- **Mirror state** — the client's copy of server data: rendered from, never trusted as truth.

## 8. Experiments to try on the plane (no internet needed)

Run the refactor (`dotnet run --project csharp/28-capstone-kanban-api/refactored`), open http://localhost:5028.

1. **Hunt the original's bug, fail in the refactor.** In the original: put a card alone in *todo* with another below it, move it to *todo* pos 1, refresh — twins. In the refactor there's no same-column button, so hit the API directly from DevTools: `await (await fetch('/api/board')).json()` to grab a card id, then POST a move to its **own** column at another position via `fetch('/api/cards/ID/move', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{"toColumn":"todo","position":1}'})`. Re-fetch the board: moved, once. The tests (`MoveWithinColumn`) do this exact dance.
2. **Watch a 404 behave.** POST a move for id `00000000-0000-0000-0000-000000000000`. Expected: status 404 and a ProblemDetails body with `"title":"card_not_found"` — then compare with the original, where an unknown *column* nets you a 500 stack trace.
3. **Wild positions.** Move a real card with `"position": 999` and then `-5` (own column via fetch, or read `PositionClamping` in Tests.cs). Expected: end of list, then top of list — never a crash.
4. **Break the invariant, meet the guard.** In `Board.MoveCard`, swap the two lines (insert before remove). Run `-- test`. Expected: same-column tests fail — some by order, and the own-position no-op *throws* `InvalidOperationException`, because `Column.Insert` refuses the duplicate the reordering just tried to create. That throw is cs#09's promise: even buggy Board code can't corrupt a Column.
5. **Swap storage without touching endpoints.** Write `JsonFileBoardRepository` — cs#21 style, only sketch it: `Save` serializes `board.Columns` names/titles to a file (note you'll want DTOs to rebuild from — domain objects with private state don't round-trip by accident, which is itself the encapsulation lesson). Register it in the one `AddSingleton` line. Every endpoint keeps working, unread.
6. **Add a rule the track's way.** Requirement: a column holds at most 5 cards. Decide where it lives (Board? Column?), pick an error code (`column_full`?), write the failing test first, make it pass, then map the code in `Problem()` (409?). Count the files you touched — then imagine the same change in `original.cs`. That difference is the whole track in one exercise.
