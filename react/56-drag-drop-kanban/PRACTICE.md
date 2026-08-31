# 🏋️ Practice: Drag & Drop Kanban

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The pure-logic exercises can be checked with `node --test`; the rest are checkable by reading and reasoning about your code — run the page later when you have internet, since React loads from a CDN.)

Exercises 1 and 5 change `refactored/board.js` and `refactored/board.test.js` (and the copy of the rules inside `refactored/index.html`); the rest change `refactored/index.html`.

## Exercises

### ⭐ 1. Throw a card away (warm-up)

Add an "×" button to each card that deletes it. Write `removeCard(board, cardId)` in `board.js` — pure, immutable, returning the *same board* for an id that isn't there — and delete the card from the `cards` map too, not just from the column's `cardIds`. Add tests for both halves.

**Practices:** the shape of every board operation — a pure function on normalized state — and remembering that two places reference a card.

**Hint:** `{ ...board.cards }` then `delete copy[cardId]` gives you a new map without the card. Never `delete board.cards[cardId]`.

**Expected:** clicking × removes the card and drops the column count by one. `Object.keys(board.cards).length` goes from 5 to 4 — no orphan left behind to leak forever.

### ⭐⭐ 2. Predict the board, then predict who renders (core)

**Part A, on paper.** Starting from `initialBoard` (todo `[c1, c2, c3]`, doing `[c4]`, done `[c5]`), write down all three columns after each of these three calls, applied in order:

```js
moveCard(board, 'c1', 'doing', 0);
moveCard(board, 'c2', 'todo',  1);
moveCard(board, 'c4', 'done',  null);
```

The second one is the interesting one — think about the correction step before you write an answer.

**Part B, still on paper.** Imagine a debug button in `App` that calls `onMove('c1', 'doing', 0)` directly. List which components re-render. Then do it again for a version where `Card` is wrapped in `React.memo`, and a third time where it's wrapped in `React.memo` **and** `onMove` is wrapped in `useCallback(..., [])`.

**Practices:** reading a pure function precisely enough to run it in your head, and the two separate questions "did state change?" and "does this component have to re-render because of it?".

**Hint:** for Part B, `React.memo` skips a re-render only when *every* prop is `Object.is`-equal to last time. Go prop by prop for each of the five cards: `card`, `index`, `columnId`, `onMove`, `dragging`, `setDragging`. Which of those does a move actually change, and which one changes on *every* render no matter what?

**Expected:** in Part A, exactly one of the three calls leaves the board untouched. In Part B, the plain version and the `React.memo`-only version re-render exactly the same components, and the third version skips exactly one card.

### ⭐⭐ 3. A drop indicator that isn't a DOM poke (core)

Show a 2px blue line at the slot where the card would land, updating as you drag. The tempting implementation is `e.currentTarget.style.borderTop = '2px solid blue'` in `dragover` and clearing it in `dragleave` — which is the original's disease in a smaller costume. Do it from state instead.

**Practices:** noticing that "just a bit of visual feedback" is still state, and that the DOM reflex comes back the moment something feels too small to bother with.

**Hint:** one piece of state in `App`, `dropSlot`, holding `{ columnId, index }` or `null` — computed by exactly the same top-half/bottom-half arithmetic your `onDrop` already does. Render the line where `dropSlot` says. Clear it in `onDrop` **and** in `onDragEnd`.

**Expected:** the line follows the pointer between cards and columns, lands where the card actually lands, and disappears whether you drop, miss, or press Escape. Poking `style` instead leaves a stray blue line behind roughly every third drag — because `dragleave` fires on child elements too.

### ⭐⭐ 4. Undo the whole board (core)

Add **undo** and **redo** buttons that step through the board's history. Don't record "moves" — record boards.

**Practices:** the payoff for immutability. Every past board is still a perfectly good value; nobody has to know how to reverse a move.

**Hint:** project 39's shape — `{ past: [], present: board, future: [] }`. Every `onMove` pushes `present` onto `past` and clears `future`. Guard against recording no-ops: if `moveCard` returns the *same* board (dropped on the header), don't push anything.

**Expected:** ten drags then ten undos returns you to the starting board exactly. Undo, undo, then a new drag: redo goes dead, which is what every editor does. And notice you never wrote a single line of "un-move" logic.

### ⭐⭐⭐ 5. Move a whole selection (challenge)

Let a click select cards (multi-select), then drag the selection as one. Write `moveCards(board, cardIds, toColumnId, toIndex)` in `board.js`, keep `moveCard` working (it should become a special case — one card is a selection of one), and test it.

Two rules make this harder than it looks: the moved cards must land in **board reading order**, not click order (select bottom-then-top and they must not come out upside down); and when some of the selection was *above* the target slot in the target column, the slot shifts by *that many* positions — your one-card correction generalized.

**Practices:** generalizing a pure function without breaking its existing tests, and discovering that the off-by-one you fixed once was a special case of counting.

**Hint:** reading order is `board.columns.flatMap((col) => col.cardIds).filter((id) => moving.includes(id))`. The shift is `to.cardIds.slice(0, wanted).filter((id) => moving.includes(id)).length` — count them *before* you remove anything.

**Expected:** select "Write the spec" and "Fix the login bug", drag onto the top of Done: `Done` becomes `[c1, c3, c5]` in that order however you clicked them, and `To do` keeps only `c2`. Select all three To do cards and drop them into Doing below `c4`: `[c4, c1, c2, c3]`, and `To do` is empty. Every existing `moveCard` test still passes.

## Solutions

### 1. Throw a card away

```js
export function removeCard(board, cardId) {
  if (!board.cards[cardId]) return board;      // no-op contract, again
  const cards = { ...board.cards };
  delete cards[cardId];                        // on the COPY
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.cardIds.includes(cardId)
        ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
        : col),
    cards,
  };
}
```

```js
test('removing a card clears it from the column AND the card map', () => {
  const next = removeCard(initialBoard, 'c2');
  assert.deepEqual(next.columns[0].cardIds, ['c1', 'c3']);
  assert.equal(next.cards.c2, undefined);
  assert.equal(Object.keys(next.cards).length, 4);
});

test('removing an unknown card is a no-op', () => {
  assert.equal(removeCard(initialBoard, 'ghost'), initialBoard);
});
```

**Why:** normalized state means every card is referenced from two places — the id array that gives it a position, and the map that gives it content. Clearing only the id array leaves an orphan in `cards` that nothing renders and nothing collects, which is a memory leak that survives a save/load round trip. The `{ ...board.cards }` copy matters as much: `delete board.cards[cardId]` would reach into the *old* board, and the old board is what your undo stack is holding. Untouched columns come out of `map` as the very same objects, so a `React.memo`'d `Column` for a column that didn't change can still bail out.

### 2. Predict the board, then predict who renders

**Part A:**

```
start                 todo [c1, c2, c3]   doing [c4]       done [c5]
moveCard c1 → doing 0 todo [c2, c3]       doing [c1, c4]   done [c5]
moveCard c2 → todo 1  todo [c2, c3]       doing [c1, c4]   done [c5]   ← unchanged
moveCard c4 → done ø  todo [c2, c3]       doing [c1]       done [c5, c4]
```

The second call is the correction in action. `c2` is at index 0 of `[c2, c3]` and slot 1 means "where `c3` sits". Because `0 < 1` in the *same* column, `wanted` drops to `0` — and inserting `c2` at 0 rebuilds the array it came from. Correct: dragging a card onto the slot immediately below itself means "stay". Without the correction you'd get `[c3, c2]`, a card that moves when the user asked for nothing.

**Part B:** in the plain version, `setBoard` changes `App`'s state, so `App` re-renders, so all three `Column`s re-render, so all five `Card`s re-render. Eight components.

With `React.memo(Card)` and nothing else: **exactly the same eight**. `onMove` is an arrow function defined in `App`'s body, so it's a brand-new function on every render; `Object.is(oldOnMove, newOnMove)` is `false` for every card, and memo gives up before it looks at anything else. This is project 28 in its natural habitat.

With `React.memo(Card)` *and* `useCallback(onMove, [])`: four cards re-render, and `c5` skips. Card by card — `c1` (its `columnId` went `todo` → `doing`), `c2` and `c3` (their `index` shifted from 1, 2 to 0, 1), `c4` (its `index` went 0 → 1). `c5` is alone in Done: same `card` object (moves never touch the `cards` map), same `index` 0, same `columnId`, same `dragging` false, and now a stable `onMove` and `setDragging`. Every prop identical, so it bails out.

**Why:** the two questions are independent and beginners fuse them. "Did the state change?" is answered by the pure function, on paper, with no React in the room. "Who re-renders?" is answered by React's rules — parent re-rendered, or a subscribed context/state changed — and `React.memo` only enters the conversation when *every* prop is reference-equal, which inline callbacks and inline objects quietly prevent. Worth saying plainly: for a five-card board, the plain version is the right code. Memoizing this would be work in exchange for nothing measurable.

### 3. A drop indicator that isn't a DOM poke

```jsx
const [dropSlot, setDropSlot] = useState(null);   // { columnId, index } | null

const slotFromCardEvent = (e, columnId, index) => {
  const box = e.currentTarget.getBoundingClientRect();
  const below = e.clientY > box.top + box.height / 2;
  return { columnId, index: index + (below ? 1 : 0) };
};

// in Card:
onDragOver={(e) => {
  e.preventDefault();
  e.stopPropagation();
  setDropSlot(slotFromCardEvent(e, columnId, index));
}}
onDrop={(e) => {
  e.preventDefault();
  e.stopPropagation();
  const slot = slotFromCardEvent(e, columnId, index);
  setDropSlot(null);
  onMove(e.dataTransfer.getData('text/plain'), slot.columnId, slot.index);
}}
onDragEnd={() => { setDragging(null); setDropSlot(null); }}   // the safety net

// in Column, rendering the line between cards:
<div className="cards">
  {column.cardIds.map((id, i) => (
    <React.Fragment key={id}>
      {dropSlot && dropSlot.columnId === column.id && dropSlot.index === i && <Line />}
      <Card ... />
    </React.Fragment>
  ))}
  {dropSlot && dropSlot.columnId === column.id
    && dropSlot.index === column.cardIds.length && <Line />}
</div>
```

with `const Line = () => <div style={{ height: 2, background: '#2b6cb0', margin: '2px 0' }} />;`

**Why:** the indicator is *derived* from `dropSlot` exactly the way the move is derived from the same arithmetic — one function, `slotFromCardEvent`, feeds both, so the line physically cannot lie about where the card will land. The style-poking version breaks for a reason worth knowing: `dragleave` fires when the pointer crosses into a *child* element, so moving over a card inside a column fires `dragleave` on the column, your cleanup runs, and then it doesn't run again when you actually leave — stray lines, intermittently. Fixing that with the DOM means counting enter/leave pairs. Fixing it with state means "the newest `dragover` wins and `dragend` always clears", which is three lines and no counting.

### 4. Undo the whole board

```jsx
const [history, setHistory] = useState({ past: [], present: initialBoard, future: [] });
const board = history.present;

const onMove = (cardId, toColumnId, toIndex) =>
  setHistory((h) => {
    const next = moveCard(h.present, cardId, toColumnId, toIndex);
    if (next === h.present) return h;                 // no-op: don't record it
    return { past: [...h.past, h.present], present: next, future: [] };
  });

const undo = () => setHistory((h) => h.past.length === 0 ? h : {
  past: h.past.slice(0, -1),
  present: h.past[h.past.length - 1],
  future: [h.present, ...h.future],
});

const redo = () => setHistory((h) => h.future.length === 0 ? h : {
  past: [...h.past, h.present],
  present: h.future[0],
  future: h.future.slice(1),
});
```

```jsx
<button onClick={undo} disabled={history.past.length === 0}>undo</button>
<button onClick={redo} disabled={history.future.length === 0}>redo</button>
```

**Why:** this is js#39's History class and project 40's reducer, and it costs nothing here because every board is an immutable whole value — `past` is a list of boards that were never edited and never will be. Notice what you did *not* write: an "un-move". There is no `moveCardBack`, no inverse of the index correction, no bookkeeping about where a card came from. Recording states instead of actions trades memory for the entire class of "my undo is subtly wrong" bugs. The `next === h.present` guard is the no-op contract earning its keep a second time: without it, dropping a card on the page header would push an identical board onto `past` and give the user an undo that appears to do nothing. Clearing `future` on a new move is the standard editor rule — once you've branched, the old redo path is a road not taken.

### 5. Move a whole selection

```js
export function moveCards(board, cardIds, toColumnId, toIndex) {
  const moving = cardIds.filter((id) => board.cards[id]);
  const to = board.columns.find((col) => col.id === toColumnId);
  if (moving.length === 0 || !to) return board;

  // 1. board reading order, not click order
  const ordered = board.columns
    .flatMap((col) => col.cardIds)
    .filter((id) => moving.includes(id));

  // 2. how many of them are above the slot we aimed at, counted BEFORE removal
  const wanted = toIndex == null ? to.cardIds.length : toIndex;
  const removedAbove = to.cardIds
    .slice(0, Math.max(0, wanted))
    .filter((id) => moving.includes(id)).length;

  // 3. take them all out
  const columns = board.columns.map((col) => ({
    ...col,
    cardIds: col.cardIds.filter((id) => !moving.includes(id)),
  }));
  const target = columns.find((col) => col.id === toColumnId);
  const index = Math.max(0, Math.min(wanted - removedAbove, target.cardIds.length));

  // 4. put them back together
  const landed = [
    ...target.cardIds.slice(0, index),
    ...ordered,
    ...target.cardIds.slice(index),
  ];
  return {
    ...board,
    columns: columns.map((col) =>
      col.id === toColumnId ? { ...col, cardIds: landed } : col),
  };
}

export const moveCard = (board, cardId, toColumnId, toIndex) =>
  moveCards(board, [cardId], toColumnId, toIndex);
```

```js
test('a selection lands in board order, not click order', () => {
  const a = moveCards(initialBoard, ['c1', 'c3'], 'done', 0);
  const b = moveCards(initialBoard, ['c3', 'c1'], 'done', 0);
  assert.deepEqual(ids(a, 'done'), ['c1', 'c3', 'c5']);
  assert.deepEqual(a, b);                       // click order is not information
  assert.deepEqual(ids(a, 'todo'), ['c2']);
});

test('the slot shifts by however many of the selection were above it', () => {
  assert.deepEqual(ids(moveCards(initialBoard, ['c1', 'c2'], 'todo', 3), 'todo'),
    ['c3', 'c1', 'c2']);
  assert.deepEqual(ids(moveCards(initialBoard, ['c3', 'c1'], 'todo', 2), 'todo'),
    ['c2', 'c1', 'c3']);
});

test('a whole column can move at once', () => {
  const next = moveCards(initialBoard, ['c1', 'c2', 'c3'], 'doing', 1);
  assert.deepEqual(ids(next, 'doing'), ['c4', 'c1', 'c2', 'c3']);
  assert.deepEqual(ids(next, 'todo'), []);
});

test('an empty selection or a bad column is a no-op', () => {
  assert.equal(moveCards(initialBoard, [], 'done', 0), initialBoard);
  assert.equal(moveCards(initialBoard, ['c1'], 'nope', 0), initialBoard);
});
```

For the UI, keep `selected` as a `Set` of ids in `App`, toggle on click, and have `dragstart` on a selected card drag the whole set:

```jsx
const payload = selected.has(card.id) ? [...selected] : [card.id];
e.dataTransfer.setData('text/plain', JSON.stringify(payload));
```

**Why:** step 2 is the whole lesson. The one-card version subtracted 1 when the card came from above the target slot in that column; the real rule was always "subtract however many of the moving cards were above it", and one card was just the case where that count is 0 or 1. Generalizing revealed that the original correction wasn't a special hack, it was arithmetic with `n = 1` hard-coded — which is why `moveCard` can be deleted and re-expressed as `moveCards(board, [cardId], ...)` with every existing test still green. That green suite is the point of extracting the logic in the first place: you just rewrote the core of the app and found out in 40 milliseconds that you hadn't broken it. Step 1 matters for a smaller reason with the same shape — click order is an artifact of the user's mouse, and letting it leak into the data would mean the same drag produces different boards depending on which card you clicked first.
