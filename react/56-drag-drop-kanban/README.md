# React 56 — Drag & drop kanban

**Lesson: the browser will happily move a DOM node for you. Let it, and the
DOM becomes your database again — inside the framework whose whole contract
is UI = f(state).**

## Run it

Open `original.html`, drag a card to another column, then click **log
state**: React still reports the original layout. Click **re-render** and
your move evaporates. Now drag a card onto the paragraph instead of a
column — it disappears completely. The refactor does all three without
flinching.

```
node --test react/56-drag-drop-kanban/refactored/board.test.js
```

## What's wrong with the original?

1. **`appendChild` is the move.** The drop handler physically relocates a
   div; `board` state never changes. The screen and the state now disagree,
   and only one of them can be counted, saved, undone, or sent to a server —
   the one the handler didn't touch. This is project 15's classList poke
   with higher stakes, and js#64's lesson regressed because the browser
   moves nodes "for free".
2. **The re-render button is not a gimmick, it's the deadline.** Any state
   change anywhere — a filter, a fetch resolving, a parent re-render — makes
   React rebuild the list from `board` and quietly undo every move the user
   made. The bug isn't that it breaks; it's that it works until it doesn't.
3. **The drag payload is a live DOM node in a ref**, so the "card" is a
   thing that only exists on this page, in this tab, right now.
4. **Drop outside a column and the card is gone.** `dragstart` hides the
   node and only `drop` un-hides it, so a drop on the page body leaves the
   card `display: none` — no `dragend`, no recovery. The card is still in
   state; state isn't what's on screen.
5. **Cargo-cult `preventDefault`** in `dragover`: required for `drop` to
   fire at all, copied without that knowledge, so when it goes missing
   nobody knows why nothing drops.

## What changed in the refactor

- **The gesture carries an id, nothing else**: `dataTransfer.setData(
  'text/plain', card.id)`. A string survives re-renders, `JSON.stringify`,
  and a trip to a server; a DOM node survives nothing.
- **`moveCard(board, cardId, toColumn, toIndex)` is pure and lives in
  `board.js`** — normalized board (columns hold *order*, cards hold
  *content*), returns a new board, returns the *same* board for a drop
  that makes no sense. Fourteen Node tests, zero drags.
- **It owns the off-by-one nobody can reproduce**: dragging a card *down*
  inside its own column removes it from above the target slot, shifting
  everything up by one. Three lines here; an afternoon inside a drop handler.
- **Nothing can be lost.** A drop that isn't on a column never calls
  `moveCard`, and `onDragEnd` always clears the drag styling — because the
  "lifted" look is a `className` derived from state, not a style poked onto
  a node.
- **The features come free** because the state is real: per-column counts,
  reset, the state log that now always matches the screen. Undo is "keep the
  previous board"; persistence is `JSON.stringify`.

## Key takeaway

Every drag-and-drop library, under the animations, is this pipeline:
gesture → `(cardId, target, index)` → pure state update → re-render. Keep
the browser's event soup on one side of that arrow and your data model on
the other. If you can't `JSON.stringify` what the user sees, the DOM has
become your database again.
