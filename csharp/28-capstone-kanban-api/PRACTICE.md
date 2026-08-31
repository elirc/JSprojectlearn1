# 🏋️ Practice: Capstone — Kanban API

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Rename a card (warm-up)

Add `Board.RenameCard(Guid cardId, string? title)` returning `Result<Card>` — `invalid_title` for blank text, `card_not_found` for an unknown id — plus `PATCH /api/cards/{id:guid}`. You write **no** status-code logic: `Problem()` already maps both codes, because they are codes the board already speaks.
*Practices:* the pure domain layer, `Result` + error codes (cs#08), and the payoff of a shared error table (cs#20).
**Hint:** `Column` hides its list, so add `internal void Replace(int index, Card card)` beside `Insert` — same visibility, same reason. `Card` is a record: `column.Cards[index] with { Title = trimmed }`.
**Check offline:** with `var card = board.AddCard("todo", "write tets").Value!;` these all pass — `Check.Equal("write tests", board.RenameCard(card.Id, "  write tests  ").Value!.Title, "renames and trims")`, `Check.Equal(card.Id, board.Columns[0].Cards[0].Id, "the id never changes")`, `Check.Equal("invalid_title", board.RenameCard(card.Id, "   ").Error!.Code, "blank is refused")` and `Check.Equal("card_not_found", board.RenameCard(Guid.NewGuid(), "x").Error!.Code, "unknown ids fail politely")`. Then PATCH a real id (from `curl http://localhost:5028/api/board`) with `{"title":"  "}` → `400`, `"title":"invalid_title"`; with a real title → `200`.

### ⭐⭐ 2. Delete a card (core)

Add `Board.RemoveCard(Guid cardId)` returning `Result<Card>` (the removed card, or `card_not_found`) and `DELETE /api/cards/{id:guid}` answering `204 No Content` or a ProblemDetails `404`. Then add a `✕` button to each card in `app.js`, next to the ◀ ▶ controls.
*Practices:* REST status codes for deletion (cs#16), and adding a frontend action to the existing fetch-and-re-render loop.
**Hint:** the search loop is `MoveCard`'s shape — walk the columns calling `column.IndexOf(cardId)`, and read the card *before* removing it. The button is `run(() => api(`/api/cards/${card.id}`, { method: 'DELETE' }))`.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var board = Sample();
var a = board.AddCard("todo", "a").Value!;  board.AddCard("todo", "b");
Check.Equal("a", board.RemoveCard(a.Id).Value!.Title, "it hands back what was removed");
Check.Equal("b", Titles(board.Columns[0]), "and the card really left the column");
Check.Equal("card_not_found", board.RemoveCard(a.Id).Error!.Code, "removing it twice is a clean error");
```
Then `curl -i -X DELETE http://localhost:5028/api/cards/<ID>` twice → `204`, then `404` with `"title":"card_not_found"`.

### ⭐⭐ 3. Delete a column — but not a full one (core)

Add `Board.RemoveColumn(string? name)` returning `Result<string>`: a **new** code `column_not_empty` when the column still holds cards, `column_not_found` for an unknown name, success otherwise. Wire `DELETE /api/columns/{name}` to it and give the new code a `409 Conflict` in `Problem()`'s switch — the request is fine, the board's *state* says no, exactly as with `duplicate_column`.
*Practices:* taking a new domain error code end to end, and picking a status code by asking whose fault the failure is.
**Hint:** the whole rule is one `if` on `column.Cards.Count > 0`; the switch arm becomes `"duplicate_column" or "column_not_empty" => StatusCodes.Status409Conflict,`.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var board = Sample();
var card = board.AddCard("todo", "stuck here").Value!;
Check.Equal("column_not_empty", board.RemoveColumn("todo").Error!.Code, "a column with cards can't be dropped");
Check.Equal(3, board.Columns.Count, "and the failed delete changed nothing");
Check.Equal("column_not_found", board.RemoveColumn("limbo").Error!.Code, "an unknown column fails politely");
board.MoveCard(card.Id, "doing", 0);   // now it is empty
Check.Equal(true, board.RemoveColumn("  TODO  ").Ok, "it goes; name matching stays loose");
```
Then `curl -i -X DELETE http://localhost:5028/api/columns/todo` on the seeded board → `409`, `"title":"column_not_empty"`.

### ⭐⭐ 4. Move a card up and down, client-side only (core)

The README claims drag-and-drop would only change `app.js`. Prove the easy half: add ▲ and ▼ buttons that reorder a card **within its column**, using the existing `POST /api/cards/{id}/move` and nothing else. Disable ▲ on the first card and ▼ on the last. Not one line of C# may change.
*Practices:* index arithmetic on the client, and feeling what a well-chosen contract — *(cardId, toColumn, position)* — buys later.
**Hint:** `renderCard` needs the card's index within its column, so pass it alongside `columnIndex`. Up is `position: index - 1`, down `index + 1`; the server clamps either way, but disable the edge buttons anyway.
**Check offline:** open http://localhost:5028 — the seeded *todo* column has two cards. Expected: ▼ on the first swaps them, ▲ on the second swaps back, the heading count never changes, and `git diff` touches only `wwwroot/`. `curl http://localhost:5028/api/board` shows each card exactly once, reordered.

### ⭐⭐⭐ 5. Two tabs, one board: optimistic concurrency (challenge)

Open the app in two tabs, move a card in each, and the second silently overwrites the first — the lost update, one last time. Fix it the way HTTP does: give `Board` a `public int Version { get; private set; }` bumped on every **successful** mutation (never a failed one), have `GET /api/board` send `ETag: "3"`, and make the mutating endpoints require a matching `If-Match` header — a mismatch, or a missing header, is a `409 Conflict` coded `stale_board` with no mutation. Then teach `app.js` to remember the ETag, send it back, and on a 409 re-fetch and ask the user to retry.
*Practices:* ETag / `If-Match` optimistic concurrency, and where "one more error code" goes in a design that has a table for them.
**Hint:** bump `Version` right where each method does `return Result<T>.Success(...)`, and compare `ctx.Request.Headers.IfMatch` with `board.Version` **before** calling the domain, so a conflict mutates nothing.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var board = new Board();
board.AddColumn("todo");
var card = board.AddCard("todo", "a").Value!;
Check.Equal(2, board.Version, "each successful mutation bumps the version once");
board.AddColumn("todo"); board.AddCard("nowhere", "x"); board.MoveCard(Guid.NewGuid(), "todo", 0);
Check.Equal(2, board.Version, "three FAILED mutations bump nothing");
board.MoveCard(card.Id, "todo", 0);
Check.Equal(3, board.Version, "a real move does");
```
Then `curl -i http://localhost:5028/api/board` and note the `ETag`. A move sent with that value in `If-Match` → `200`; the **same** value again → `409` with `"title":"stale_board"`; the header omitted → `409` too, and a re-fetch proves the board is untouched.

## Solutions

### 1. Rename a card

```csharp
// Board.cs — Column gains a sibling of Insert/Remove, same internal visibility
internal void Replace(int index, Card card) => cards[index] = card;

// Board
public Result<Card> RenameCard(Guid cardId, string? title)
{
    var trimmed = (title ?? "").Trim();
    if (trimmed.Length == 0) return Result<Card>.Fail("invalid_title", "Card title cannot be blank.");
    foreach (var column in columns)
    {
        var index = column.IndexOf(cardId);
        if (index < 0) continue;
        var renamed = column.Cards[index] with { Title = trimmed };
        column.Replace(index, renamed);
        return Result<Card>.Success(renamed);
    }
    return Result<Card>.Fail("card_not_found", $"No card with id {cardId}.");
}

// Program.cs — the same five-line shape as every other endpoint
app.MapPatch("/api/cards/{id:guid}", (Guid id, RenameCardRequest request, IBoardRepository repo) =>
{
    var board = repo.Load();
    var result = board.RenameCard(id, request.Title);
    if (!result.Ok) return Problem(result.Error!);
    repo.Save(board);
    return Results.Ok(result.Value);
});
public record RenameCardRequest(string? Title);   // cs#17: DTOs stay separate from the domain
```

WHY: the endpoint contains no HTTP thinking at all, because both failure modes were already vocabulary the board spoke — that is what a shared error table buys. `Replace` is `internal` for the reason `Insert` is: `Column` guards a no-duplicates invariant, and open writes would turn that invariant back into a hope (cs#09).

### 2. Delete a card

```csharp
// Board.cs
public Result<Card> RemoveCard(Guid cardId)
{
    foreach (var column in columns)
    {
        var index = column.IndexOf(cardId);
        if (index < 0) continue;
        var card = column.Cards[index];     // grab it BEFORE it is gone
        column.Remove(cardId);
        return Result<Card>.Success(card);
    }
    return Result<Card>.Fail("card_not_found", $"No card with id {cardId}.");
}
// Program.cs: DELETE /api/cards/{id:guid} is exercise 1's endpoint with board.RemoveCard(id)
// and Results.NoContent() in place of Results.Ok(result.Value).
```
```js
// app.js — in renderCard's controls
const remove = document.createElement('button');
remove.type = 'button';  remove.className = 'delete';  remove.textContent = '✕';
remove.setAttribute('aria-label', `Delete "${card.title}"`);
remove.addEventListener('click', () => run(() => api(`/api/cards/${card.id}`, { method: 'DELETE' })));
controls.append(left, right, remove);
```

WHY: `204` rather than `200` because the body would be empty anyway, and `404` on the second attempt rather than a cheerful `204` because "I deleted something" and "there was nothing to delete" are different facts a client may act on. Returning the removed card even though the endpoint discards it keeps the method useful to a future undo. One client-side snag: `api()` calls `res.json()` and a `204` has no body — the existing `.catch(() => null)` is what keeps this working.

### 3. Delete a column — but not a full one

```csharp
// Board.cs
public Result<string> RemoveColumn(string? name)
{
    var column = Find(name);
    if (column is null) return Result<string>.Fail("column_not_found", $"No column named '{name}'.");
    if (column.Cards.Count > 0)
        return Result<string>.Fail("column_not_empty",
            $"Column '{column.Name}' still holds {column.Cards.Count} card(s). Move or delete them first.");
    columns.Remove(column);
    return Result<string>.Success(column.Name);
}
// Program.cs: DELETE /api/columns/{name} mirrors exercise 2's endpoint. One new switch arm:
"duplicate_column" or "column_not_empty" => StatusCodes.Status409Conflict,
```

WHY: `409 Conflict` is right for the same reason it is right for a duplicate column — the request is well-formed and the client did nothing wrong; the *current state of the resource* refuses. `400` would blame the caller and `500` the server, and both send a developer looking in the wrong place. Refusing to delete a non-empty column is a policy choice, not a law — but silently destroying cards a user cannot see should never be the quiet default.

### 4. Move a card up and down, client-side only

```js
// app.js — render() now passes each card's index and its column:
//   column.cards.forEach((card, i) => section.appendChild(renderCard(card, columnIndex, i, column)));
// ...and inside renderCard(card, columnIndex, cardIndex, column):
const up = reorderButton('▲', card, column.name, cardIndex - 1);
const down = reorderButton('▼', card, column.name, cardIndex + 1);
up.disabled = cardIndex === 0;
down.disabled = cardIndex === column.cards.length - 1;
controls.append(up, down, left, right);

function reorderButton(arrow, card, columnName, position) {
  const button = document.createElement('button');
  button.type = 'button';  button.textContent = arrow;
  button.setAttribute('aria-label', `Move "${card.title}" ${arrow === '▲' ? 'up' : 'down'}`);
  button.addEventListener('click', () =>
    run(() => api(`/api/cards/${card.id}/move`, post({ toColumn: columnName, position }))));
  return button;
}
```

WHY: zero server changes, because the endpoint was designed around *(cardId, toColumn, position)* rather than around the buttons that happened to exist — the difference between an API and a remote control. The reason `position: index + 1` is correct for "move down" is the reason the refactor removes before inserting: with the card lifted out, the remaining cards close up. Reason that through against an insert-then-remove version and you will rediscover the original's duplication bug from the client side.

### 5. Two tabs, one board: optimistic concurrency

```csharp
// Board.cs
public int Version { get; private set; }
// ...then `Version++;` on the SUCCESS path of AddColumn, AddCard, MoveCard, RenameCard,
// RemoveCard and RemoveColumn — immediately before each `return Result<T>.Success(...)`.

// Program.cs — GET /api/board injects HttpContext ctx and adds one line before returning:
//   ctx.Response.Headers.ETag = $"\"{board.Version}\"";

// One guard, reused by every mutating endpoint.
static Error? StaleCheck(Board board, HttpContext ctx)
{
    var provided = ctx.Request.Headers.IfMatch.ToString().Trim('"');
    return provided == board.Version.ToString() ? null : new Error("stale_board",
        $"Your copy is out of date (sent '{provided}', current is '{board.Version}'). Reload and retry.");
}

// ...and two lines in each mutating endpoint, around the domain call:
if (StaleCheck(board, ctx) is { } stale) return Problem(stale);   // nothing has mutated yet
ctx.Response.Headers.ETag = $"\"{board.Version}\"";               // after repo.Save(board)

// ...plus one more code in the mapper:
"duplicate_column" or "column_not_empty" or "stale_board" => StatusCodes.Status409Conflict,
```
```js
// app.js — three additions to the existing api() helper, plus one line in post()
let etag = null;
// inside api(), right after the fetch:
const tag = res.headers.get('ETag');  if (tag) etag = tag;   // remember the newest version
// ...and before the generic !res.ok throw:
if (res.status === 409 && data && data.title === 'stale_board') {
  board = await (await fetch('/api/board')).json();
  render();                                  // catch up silently, then explain
  throw new Error('Someone else changed the board — it has been refreshed. Try again.');
}
// post() now sends the version with the body:
//   headers: { 'Content-Type': 'application/json', 'If-Match': etag ?? '' }
```

WHY: `Version` is a number that changes whenever the board does, which is exactly what an ETag is — and it must not increment on failure, because a rejected request changed nothing, so every client's copy is still current. Checking `If-Match` before touching the domain is what makes the conflict *safe*: the second tab's move never happens, rather than happening and then being reported as an error. This is the lost update project 21 fixed with a `lock`, one layer out — a lock cannot help when two writers are separated by minutes and a network, so the protocol carries the version instead. Notice where the new rule landed: `Board` gained one property, `Problem()` one word, each endpoint two lines. The capstone's real claim is not that the code is clever, but that a genuinely cross-cutting change still fits the seams already there.
