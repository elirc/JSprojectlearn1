# 64 — Kanban board

**Lesson: drag & drop tempts you to let the DOM be the database. Resist —
the gesture is browser glue; the move is a pure function on serializable
state.**

## Run it

Open both HTML files; drag cards around, then **refresh each page**.
Then:

```
node --test 64-kanban/
```

## What's wrong with the original?

1. **The DOM is the database.** Cards exist only as divs; `appendChild`
   moving a node *is* the record of the move. Refresh: everything's gone.
   Saving, undo, or a per-column counter would require scraping your own
   UI. (Project 14's rule — state lives in data — regressed, because the
   browser moves nodes "for free".)
2. **The drag payload is a live DOM node in a global**, and cards have no
   ids — two cards with the same text are indistinguishable.
3. **Cargo-cult event code**: `preventDefault()` in `dragover` is required
   for `drop` to fire at all, but it was copied without that knowledge, so
   when it breaks nobody knows why.
4. **Drops always land at the bottom** — no insert position, and the index
   math needed for one is exactly the kind of logic you can't debug inside
   a drop handler.

## What changed in the refactor

- **Normalized board state**, like a tiny database and for the same
  reason: `columns[].cardIds` holds *order*, `cards{}` holds *content*,
  referenced by id. Moving a card touches two id arrays, never the card.
- **`moveCard(board, cardId, toColumnId, toIndex)` is pure and owns THE
  bug**: moving a card *down* within its own column shifts the target
  index by one (you removed it from above the target first). Wrong = drops
  land one slot off, *sometimes* — the worst kind of bug to chase through
  a drop handler, and a three-line test here.
- **Immutability = free rollback**: `moveCard` returns a new board, so
  optimistic UI is "apply now, keep the old board, restore it if the
  server says no." The test demonstrates rollback with zero extra code.
- **The DnD glue decides nothing.** `dragstart` puts the card *id* in
  `dataTransfer`; `drop` computes an index from the pointer position and
  calls `moveCard`. And `dragover`'s `preventDefault` is commented for
  what it is: the opt-in to being a drop target.
- **Serialization is trivial because state is plain data** — plus
  referential-integrity checks on load (dangling card ids are dropped;
  project 63's "stored data is input").

## Key takeaway

Every drag-and-drop library is this split: gesture → *(cardId, target,
index)* → pure state update → re-render. Keep the browser's event soup on
one side and your data model on the other, and complex interactions stay
debuggable, testable, and persistable. If you can't `JSON.stringify` your
app's state, the DOM has quietly become your database again.
