# 📘 Learning Guide: Kanban Board

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **kanban board** — a task organizer like a wall of sticky notes. Three columns: **Todo**, **Doing**, **Done**. Each card is a task ("design the logo"). You drag a card with the mouse from one column to another (or reorder within a column) to show progress.

Open the page, drag "design the logo" from Todo to Doing, drop it — it moves. In the refactored version you can also add cards, columns show live counts like "Todo (2)", and if you refresh the page everything is still where you left it. Runs from a single HTML file, fully offline.

## 2. Concepts you need first

### The DOM — the browser's live copy of the page
The **DOM** (Document Object Model) is the browser's in-memory tree of everything on the page. JavaScript can create, move, and delete pieces of it (called **nodes** or **elements**):

```js
const div = document.createElement("div"); // make an element
div.textContent = "hello";                 // put text in it
document.body.appendChild(div);            // attach it → "hello" appears
```

Key fact for this project: `appendChild` on an element that's *already on the page* **moves** it — it doesn't copy.

### Events and event listeners
An **event** is the browser announcing something happened (a click, a keypress, a drag). An **event listener** is your function that runs when it does:

```js
button.addEventListener("click", () => console.log("clicked!"));
```

Some events have **default behavior** the browser does on its own. `event.preventDefault()` cancels that default — this becomes surprisingly important below.

### Drag & drop — the browser's built-in gesture
HTML has native drag support. Mark an element `draggable="true"` and the browser fires a sequence of events during a drag:

- `dragstart` — on the dragged card, when the drag begins
- `dragover` — on whatever you're hovering over, continuously
- `drop` — on the target, when you release the mouse
- `dragend` — back on the card, when it's all over

The weird rule everyone copies without understanding: **the browser's default for `dragover` is "this is NOT a drop target."** If you don't call `preventDefault()` in `dragover`, the `drop` event *never fires*. Calling it is how an element opts in to receiving drops.

`dataTransfer` is the drag's little envelope for data — put a string in at `dragstart`, read it out at `drop`:

```js
card.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", "card-7"));
zone.addEventListener("drop", (e) => console.log(e.dataTransfer.getData("text/plain")));
// → "card-7"
```

### State: "the DOM is not your database"
Your app's **state** is the data describing what's true right now: which cards exist, in which columns, in what order. There are two places it could live:
1. **In data** — a JavaScript object; the page is redrawn *from* it.
2. **In the DOM** — the divs on screen *are* the only record.

Option 2 feels free (the browser already moves the divs!) but it's a trap: to save, count, undo, or sync, you'd have to read your own UI back like a scraper. The rule: state lives in data; the DOM is just its reflection.

### Normalized data — content and order stored separately
**Normalization** (borrowed from databases) means storing each fact exactly once. Here:

```js
{
  columns: [{ id: "todo", title: "Todo", cardIds: ["card-1", "card-2"] }],
  cards: { "card-1": { id: "card-1", text: "design the logo" } }
}
```

Columns hold only **ids in order**; card content lives once, in `cards`, looked up by **id** (a unique name like `card-1`). Moving a card edits two id arrays — the card object itself is never touched. Two cards with identical text stay distinguishable, because identity is the id, not the text.

### Immutability and pure functions
A **pure function** computes a result from its inputs only — no clicking, no saving, no globals. **Immutable** updates don't modify the input; they return a *new* object (the `...` **spread syntax** copies properties/elements):

```js
const before = { items: [1, 2] };
const after = { ...before, items: [...before.items, 3] };
console.log(before.items); // → [1, 2]   — untouched!
console.log(after.items);  // → [1, 2, 3]
```

Why bother? The old value still exists. That gives you undo, and **optimistic UI**: apply a change instantly, and if a server later says "no," roll back by simply using the old object again.

### `localStorage` + JSON
**`localStorage`** is per-site browser storage that survives refreshes; it holds strings. `JSON.stringify(obj)` turns data into a string, `JSON.parse(str)` turns it back (and *throws an error* on garbage, so wrap it in `try/catch`). If your whole app state is plain data, saving is one line.

## 3. Walking through the original code

The board starts life as hand-written HTML — cards are just divs:

```html
<div class="col" id="todo"><h2>Todo</h2>
  <div class="card" draggable="true">design the logo</div>
  <div class="card" draggable="true">write the pitch</div>
</div>
```

There is no JavaScript data structure at all. The divs ARE the board.

Dragging stores the live DOM node in a global variable:

```js
var dragged = null;
card.addEventListener("dragstart", function () {
  dragged = card;
});
```

Note what's *not* here: no id, no data — just "whatever div we grabbed."

Each column enables dropping and handles the drop:

```js
col.addEventListener("dragover", function (e) { e.preventDefault(); });
col.addEventListener("drop", function () {
  col.appendChild(dragged);
});
```

The `preventDefault` line is required for `drop` to fire at all — but nothing in the code says so; it was copied from the internet. And the entire "move" is `appendChild`: the browser relocates the div, and that relocation is the *only record* the move ever happened. `appendChild` always adds at the end, so every drop lands at the bottom of the column.

That's the whole app. No save, no add, no render function.

## 4. What's wrong with it (in beginner terms)

**1. The DOM is the database.** Story: you spend Friday sorting twenty cards into the perfect plan. Monday you open the laptop, the page reloads — factory settings. Every move you made existed only as div positions, and refreshed divs are rebuilt from the original HTML. Want a "cards per column" counter? You'd have to *count divs on screen*. Want to save? Walk the DOM and scrape text out of your own UI. Every feature fights the architecture.

**2. The drag payload is a live node in a global.** No ids means two cards that both say "fix bug" are literally indistinguishable to the code. And a global mutable variable means any mis-sequenced event leaves stale state lying around.

**3. Cargo-cult `preventDefault`.** ("Cargo cult" = copying ritual without understanding.) Story: a teammate tidies up, sees a `dragover` listener that "does nothing," deletes it. Drops silently stop working everywhere. Nobody connects the two events for a day and a half, because the line never said *why* it existed.

**4. Drops always land at the bottom.** `appendChild` has no concept of position. Real insert-at-index math involves a genuinely tricky edge case (see below) — and a drop handler firing mid-gesture is the worst possible place to debug it.

## 5. Try it yourself first!

1. Design first, code later: what JavaScript object could describe the whole board, such that `JSON.stringify` of it captures everything?
2. Separate two concerns: which structure holds *order*, and which holds *content*? Ids are the glue.
3. Write `moveCard(board, cardId, toColumnId, toIndex)` as a pure function returning a NEW board. Pattern: find the source column, remove the id, insert it in the target's array at `toIndex` (look up `splice`).
4. The classic bug: with column `[a, b, c, d]`, drag `a` to sit after `c`. The drop zone says "index 3." Remove `a` first and the array is `[b, c, d]` — inserting at 3 puts `a` after `d`. Off by one! When exactly must you subtract 1 from the index? (Only same-column, only when moving *down*.)
5. In `drop`, how do you turn a mouse Y coordinate into an index? Hint: for each card in the column, is the pointer above that card's vertical midpoint? The first such card's index is where you insert; if none, insert at the end.
6. Once state is data: `localStorage.setItem(key, JSON.stringify(board))` after every change, `JSON.parse` (in a try/catch, with checks) on load.

## 6. Understanding the refactored solution

The refactor splits into `board.js` — pure data logic, tested in Node with no browser — and `index.html`, which copies those functions (plain `file://` pages can't `import`) and adds glue.

**The state shape** is the normalized structure from section 2, plus `nextId` — a counter so every new card gets a fresh unique id (`card-1`, `card-2`, ...).

**`addCard`** returns a new board via spreads: a new `cards` map with the new card added, and only the target column's `cardIds` extended. Unknown column? It throws — that's a programmer error, worth crashing loudly in development.

**`moveCard` owns THE bug:**

```js
const fromIndex = from.cardIds.indexOf(cardId);
let insertAt = toIndex;
if (from === to && fromIndex < toIndex) insertAt -= 1; // the shift

const withoutCard = from.cardIds.filter((id) => id !== cardId);
```

Removing the card first shifts everything after it up by one — so when moving *down within the same column*, the target index shifts down by one too. Get it wrong and drops land one slot off *sometimes* — a nightmare in a drop handler, a three-line unit test here. Unknown card or column returns the board unchanged (a no-op, not a crash — user gestures shouldn't explode). The function then rebuilds only the affected columns; note the careful `c === from && c === to` case for same-column moves.

**Immutability pays off in the tests:** `moveCard(before, ...)` produces `after`, and the test asserts `before` is *untouched*. Rollback for optimistic UI is literally "use `before` again" — no inverse operation needed.

**`serialize` / `deserialize`:** saving is one `JSON.stringify` because state is plain data. Loading checks shape (columns an array? cards an object?), falls back on corrupt text, and enforces **referential integrity** — any `cardId` pointing at a card that doesn't exist in `cards` (a "dangling id") is filtered out. Stored data is input; validate it.

**The page glue decides nothing.** One `commit` funnel does state → save → render. `render()` rebuilds all columns from the board object — which makes the `(2)` card-count in each header free and never stale. The drag wiring:

```js
cardEl.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', cardId);  // the ID — data, not a node
```

And the drop handler converts the pointer position into an index (first card whose midpoint is below the mouse), then delegates:

```js
commit(moveCard(board, cardId, col.id, toIndex));
```

The `dragover` `preventDefault` is still there — but now with a comment explaining it's the opt-in to being a drop target. Same line, no longer folklore.

**The tests** (`board.test.js`, run with `node --test`) build boards with a helper, then pin behaviors: normalized adds, cross-column moves at a position, the index shift moving down, no shift moving up, immutability (rollback), no-op on unknown ids, round-trip serialization, and dangling-id cleanup. The trickiest interaction logic in the app runs in plain Node — no mouse required.

## 7. Words you learned (glossary)

- **Kanban board** — columns of task cards moved left-to-right as work progresses.
- **DOM** — the browser's live tree of page elements, editable from JavaScript.
- **Node / element** — one item in the DOM tree (a div, a heading...).
- **`appendChild`** — attach an element as the last child; *moves* it if already on the page.
- **Event / event listener** — a browser notification / your function that reacts to it.
- **`preventDefault()`** — cancel the browser's built-in reaction to an event.
- **`dragover` / `drop` / `dragstart` / `dragend`** — the native drag-and-drop event sequence.
- **`dataTransfer`** — the drag gesture's envelope for carrying data (strings).
- **State** — the data describing what's true in your app right now.
- **Normalization** — store each fact once: content in a map by id, order as id lists.
- **Id** — a unique name (`card-1`) giving a thing identity beyond its display text.
- **Pure function** — result depends only on arguments; no side effects.
- **Immutable update** — return a changed *copy*; the original stays intact.
- **Spread (`...`)** — syntax that copies an object's properties or array's elements into a new one.
- **`splice`** — array method to insert/remove at an index: `arr.splice(2, 0, x)` inserts `x` at index 2.
- **Optimistic UI** — apply a change instantly, roll back if it's later rejected.
- **Serialization / `JSON.stringify` / `JSON.parse`** — data→string and back.
- **`localStorage`** — per-site browser storage that survives refresh.
- **Referential integrity** — every id reference points at something that exists.
- **Dangling id** — a reference to a thing that's gone; must be cleaned on load.
- **No-op** — an operation that deliberately does nothing.
- **Cargo-cult code** — code copied ritually without understanding why it's needed.

## 8. Experiments to try on the plane (no internet needed)

Both HTML files open straight from disk — everything works offline.

1. **The refresh test.** In `original.html`: drag cards around, refresh — all moves lost. In `refactored/index.html`: drag, add a card, refresh — everything survives (it's in `localStorage`).
2. **Break `preventDefault` on purpose.** In the refactored file, comment out the `e.preventDefault()` line inside the `dragover` listener. Expected: drops stop firing entirely — cards spring back. Now you *know* what that line does. Restore it.
3. **Recreate the off-by-one.** In the inline `moveCard`, delete the line `if (from === to && fromIndex < toIndex) insertAt -= 1;`. Drag the top card of a 3+ card column to sit just above the last card. Expected: it lands one slot lower than where you aimed — but dragging *up* still works. That "only sometimes" is why this bug is evil. Restore the line.
4. **Add a "clear column" button.** Write a pure function `clearColumn(board, columnId)` in the inline script that returns a new board whose column has `cardIds: []` (leave `cards` alone — or also delete them: what does `deserialize`'s integrity check do about leftovers either way?). Wire a button through `commit(...)`. Expected: one click empties the column, survives refresh.
5. **Watch rollback work.** In the drop handler, replace the `commit` line with: `const prev = board; commit(moveCard(board, cardId, col.id, toIndex)); setTimeout(() => commit(prev), 1500);` Expected: the card moves, then 1.5 seconds later snaps back — you just simulated a server rejecting an optimistic update, using nothing but the old object.
