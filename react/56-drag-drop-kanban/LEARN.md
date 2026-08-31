# 📘 Learning Guide: Drag & Drop Kanban

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A kanban board: three columns — **To do**, **Doing**, **Done** — with
five cards you can drag between them. The kind of board Trello made
famous, in about a hundred lines.

Both versions look identical and both let you drag. The difference
shows up the moment you ask the app a question. Drag "Buy more coffee"
into **Done**, then press the **log state** button, which prints what
React's `board` state contains:

- Original: `To do: Write the spec, Buy more coffee, Fix the login bug`.
  The card is on screen in Done and in the data in To do. Two truths.
- Refactor: `Done: Ship 1.0, Buy more coffee`. One truth.

Then press **re-render** in the original and watch your move undo
itself. That button is the whole project in one click.

## 2. Concepts you need first

### The one React rule this project breaks

React's contract is **UI = f(state)**: you describe what the screen
should look like for a given state, and React makes the DOM match. The
corollary nobody says out loud: *anything you do to the DOM yourself is
temporary*. The next time React re-renders that part of the tree, it
rebuilds the DOM from state, and your handiwork is gone.

### HTML5 drag and drop, in five events

The browser has drag-and-drop built in. You need five pieces:

```jsx
<div
  draggable                                  // 1. this thing can be picked up
  onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}  // 2. payload
  onDragEnd={() => ...}                      // 5. always runs, drop or not
/>
<div
  onDragOver={(e) => e.preventDefault()}     // 3. "I accept drops"
  onDrop={(e) => e.dataTransfer.getData('text/plain')}           // 4. read it
/>
```

Two of these surprise everyone:

- **`preventDefault()` in `dragover` is not optional.** The browser's
  default behaviour for a drag-over is "reject this drop". Cancel the
  default and you become a drop target. Miss that one line and `drop`
  never fires, with no error anywhere.
- **`dragend` fires no matter what** — successful drop, failed drop,
  Escape key. `drop` only fires on a valid target. Any cleanup you do
  in `drop` alone is cleanup you sometimes skip.

### `dataTransfer`: the drag's suitcase

`dataTransfer` carries **strings** from the dragged thing to the drop
target (it can cross windows, so it can't carry live objects). That
restriction is a gift: it forces the payload to be an **id**, and an id
is a value you can put in state, save to disk, or send to a server.

### Normalized state (a tiny database)

The board keeps *order* and *content* apart:

```js
{
  columns: [{ id: 'todo', title: 'To do', cardIds: ['c1', 'c2'] }, ...],
  cards:   { c1: { id: 'c1', text: 'Write the spec' }, ... }
}
```

Moving a card rewrites two short arrays of ids and never touches a
card. This is called **normalized** state — the same idea as a
relational database, and for the same reason: one fact stored in one
place.

### Immutable updates

`filter` and `slice` return new arrays; `{ ...col, cardIds }` returns a
new object. You never edit state in place — the new reference *is* how
React learns something happened (project 10). It also means the old
board is still intact, which is undo and rollback for free.

## 3. Walking through the original code

The render is fine. It maps state to JSX exactly the way it should:

```jsx
{col.cardIds.map((id) => (
  <div className="card" key={id} draggable onDragStart={handleDragStart}>
    {board.cards[id].text}
  </div>
))}
```

The trouble is three functions long. First, the pickup:

```js
function handleDragStart(e) {
  draggedEl.current = e.currentTarget;   // a live DOM node in a ref
  setTimeout(() => {
    if (draggedEl.current) draggedEl.current.style.display = 'none';
  }, 0);
}
```

The payload is the *element itself*, stashed in a ref. The
`setTimeout(0)` is real (hiding an element synchronously during
`dragstart` cancels the drag in most browsers) — it's a genuine
workaround, in service of a wrong idea.

Then the drop:

```js
function handleDrop(e) {
  e.preventDefault();
  const list = e.currentTarget.querySelector('.cards');
  list.appendChild(draggedEl.current);   // THE MOVE: pure DOM
  draggedEl.current.style.display = '';
}
```

`appendChild` on a node that's already in the document *moves* it —
one line, no state, instant. That's why this code gets written.

And `board`:

```js
const [board] = useState(initialBoard);   // no setter. It never changes.
```

Look at the destructuring: there is no `setBoard` in the entire file.
The state is decorative.

## 4. What's wrong with it (in beginner terms)

**The screen and the data disagree.** After one drag, "Buy more coffee"
is in Done on screen and in To do in `board`. Ask "how many cards are in
Doing?" and there are two answers. Every feature you'd want next — a
counter, a save button, undo, a filter, syncing to a server — reads the
data, and the data is wrong.

**Your move has an expiry date.** Click **re-render** (it just bumps a
counter) and React rebuilds the board from `board`, wiping every move.
In this demo you press a button; in a real app it's a fetch resolving, a
parent's state changing, a route transition. The bug's symptom is
"sometimes the board resets itself" — a bug report nobody can reproduce
because the trigger is unrelated to dragging.

**Cards can be destroyed by a bad aim.** `dragstart` hides the card and
only `drop` un-hides it. Drop on the paragraph — not a valid target, no
`drop` event — and the card stays `display: none` forever. The data
never lost it; the screen did. If the state had been the truth, a failed
drop would be a *no-op*, which is exactly what you want.

**React may eventually crash.** You moved a node React is tracking. When
React later tries to update or remove that node, it looks where it left
it and finds something else. The failure mode is a `NotFoundError` deep
in React's internals with a stack trace pointing at nothing you wrote.

**The payload can't leave the page.** A DOM node can't be serialized,
persisted, or sent anywhere. An id can do all three.

## 5. Try it yourself first!

1. **Vague:** the drop handler currently changes the *page*. What is
   the only thing a React event handler should ever change?
2. **Warmer:** `useState(initialBoard)` needs its setter back. Write a
   function `moveCard(board, cardId, toColumnId, toIndex)` that returns
   a **new** board with the card removed from wherever it was and
   inserted where it's going. No DOM anywhere in it.
3. **The payload:** replace the ref holding a DOM node with
   `e.dataTransfer.setData('text/plain', card.id)` in `dragstart` and
   `e.dataTransfer.getData('text/plain')` in `drop`.
4. **The index:** dropping on the top half of a card should put the new
   card above it; the bottom half, below. `getBoundingClientRect()`
   gives you the card's box; compare `e.clientY` to its vertical middle.
   Dropping on the column's empty space means "at the end".
5. **The trap to watch for:** drag the first card in To do down onto
   the third card. Does it land where you aimed, or one slot too far?
   Work out why on paper before fixing it.
6. **The lifted look:** you still want the dragged card to go
   translucent. Do it without touching `style` — what piece of state
   would tell every card whether it's the one being dragged?

## 6. Understanding the refactored solution

**The rules moved to `board.js`**, a file with no React and no DOM in
it, unit-tested in Node. The whole move is three steps:

```js
// 1. take it out wherever it was
const columns = board.columns.map((col) =>
  col.cardIds.includes(cardId)
    ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
    : col);

// 2. correct for the hole the removal left, then clamp
const movedDownInPlace =
  from && from.id === toColumnId && from.cardIds.indexOf(cardId) < wanted;
const index = Math.max(0,
  Math.min(movedDownInPlace ? wanted - 1 : wanted, target.cardIds.length));

// 3. put it back
const cardIds = [...target.cardIds.slice(0, index), cardId,
                 ...target.cardIds.slice(index)];
```

Step 2 is step 5 of the exercise. `toIndex` means "the slot as it looks
on screen right now" — the only thing a drop handler can honestly
report. But you remove the card *before* inserting it, so if it came
from above the target slot in that same column, every slot below it
shifted up by one. Ignore that and drops land one position too far,
*only* when dragging downwards inside one column. That's an
intermittent bug in a browser, and a two-line test here:

```js
const next = moveCard(initialBoard, 'c1', 'todo', 2);
assert.deepEqual(ids(next, 'todo'), ['c2', 'c1', 'c3']);
```

**The no-op contract.** An unknown card id or an unknown column id
returns the *same board object*. Same reference in, same reference out:
React compares and re-renders nothing. That single `return board` is
what makes "dropped on the header" harmless.

**The glue decides nothing.** The card's drop handler does one piece of
arithmetic and delegates:

```jsx
const box = e.currentTarget.getBoundingClientRect();
const below = e.clientY > box.top + box.height / 2;
onMove(e.dataTransfer.getData('text/plain'), columnId, index + (below ? 1 : 0));
```

and `onMove` is one line in `App`:

```js
const onMove = (cardId, toColumnId, toIndex) =>
  setBoard((b) => moveCard(b, cardId, toColumnId, toIndex));
```

`e.stopPropagation()` in the card's `onDrop` is what stops the column's
"append at the end" handler from also firing — the card is more
specific, so it wins.

**The lifted card is state, not style.** `dragging` holds the id being
dragged; every card computes `className={'card' + (dragging ? ' dragging' :
'')}`. `onDragEnd` clears it, and `dragend` always runs — so there is no
path through the code that leaves a card stuck invisible.

**The free features prove the point.** Column counts, the reset button,
the state log that always matches the screen: all of them just read the
same data the drop writes. Undo would be "keep the previous board".
Persistence is `JSON.stringify(board)`.

## 7. Words you learned (glossary)

- **UI = f(state):** React's contract — the screen is a function of
  state, so state is the only thing worth changing.
- **`draggable`:** the HTML attribute that makes an element draggable.
- **`dataTransfer`:** the drag's string-only payload carrier.
- **`dragover` / `preventDefault`:** cancelling the default in
  `dragover` is how an element opts in to being a drop target.
- **`dragend`:** fires after every drag, successful or not — the place
  for cleanup.
- **`appendChild` (as a move):** appending a node that's already in the
  document relocates it — the tempting one-liner this project bans.
- **Normalized state:** order (id arrays) and content (an id-keyed map)
  stored separately, each fact in one place.
- **Immutability:** producing new objects instead of editing old ones;
  the new reference is the notification.
- **No-op contract:** returning the input unchanged when an operation
  makes no sense, so callers can apply it blindly.
- **Clamping:** forcing a number into a valid range with
  `Math.max(0, Math.min(n, max))`.
- **Off-by-one:** landing one position away from where you aimed —
  here, caused by removing before inserting.
- **Optimistic move / rollback:** apply the pure update immediately,
  keep the old state, restore it if a server disagrees (project 39).
- **Serializable:** expressible as JSON — ids are, DOM nodes are not.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load.

1. **Make the original crash.** In `original.html`, drag a card to
   another column, then click **re-render** several times in a row.
   Expected: the move vanishes on the first click. Watch the console —
   moving nodes behind React's back can also produce a `NotFoundError`
   from React's own removal code, which is what "the DOM is not yours"
   looks like as a stack trace.
2. **Break the drop target on purpose.** In the refactor, delete
   `e.preventDefault()` from the column's `onDragOver`. Expected: drags
   start fine, the cursor shows "no entry", and `onDrop` never fires —
   silently. Put it back and reread the comment next to it.
3. **Reproduce the off-by-one.** In the refactor, replace the
   `movedDownInPlace` correction with plain `wanted`. Expected: dragging
   *between* columns and *upwards* still works perfectly; dragging a card
   downwards inside one column lands it one slot too low. Then run
   `node --test react/56-drag-drop-kanban/refactored/board.test.js` with
   the same change made in `board.js` and watch the test name tell you
   what you broke.
4. **Add undo in three lines.** Keep a `history` array in `App`; push
   the current board before every `setBoard`; an "undo" button pops the
   last one. Expected: it just works, because every board is a whole,
   immutable value. Now try to imagine writing undo for the original.
5. **Persist the board.** Wrap `board` in project 23's
   `usePersistentState` (or a `useEffect` writing
   `JSON.stringify(board)` to `localStorage`). Expected: your board
   survives a refresh. The original *cannot* do this at any price —
   there is nothing correct to save.
6. **Add a column.** Push `{ id: 'blocked', title: 'Blocked', cardIds: []
   }` into `initialBoard.columns`. Expected: it renders, accepts drops,
   counts its cards, and needs no new code — every column is the same
   `Column` component reading the same shape.
