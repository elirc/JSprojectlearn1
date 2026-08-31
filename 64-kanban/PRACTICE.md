# 🏋️ Practice: Kanban Board

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Count the cards (warm-up)

Write a pure function `countCards(board)` that returns the total number of cards on the board, in the style of `board.js`. Count via the columns' `cardIds` arrays, not the `cards` map — after `deserialize` cleans dangling ids, the columns are what the user actually sees. For a board built with `boardWith('a', 'b', 'c')` (the helper from `board.test.js`) it must return `3`; for a fresh `createBoard(...)` it must return `0`.

What it practices: reading the normalized state shape — order lives in `cardIds`, content lives in `cards`.

Hint: `reduce` over `board.columns`, adding up each column's `cardIds.length`.

### ⭐⭐ 2. renameCard (core)

Write `renameCard(board, cardId, newText)` returning a **new** board where that one card's text has changed. It must not touch `columns` at all (renaming changes content, never order), must leave the input board unmodified, and must return the board unchanged (a no-op) for an unknown `cardId` — a user gesture, like in `moveCard`, shouldn't crash. Check: after renaming `card-1` to `'A!'`, the new board's `cards['card-1'].text` is `'A!'` and the old board still says `'a'`.

What it practices: immutable updates with spread, and why normalization makes "edit content" a one-map change.

Hint: spread three levels — the board, the `cards` map, and the one card object: `{ ...board.cards, [cardId]: { ...board.cards[cardId], text: newText } }`.

### ⭐⭐ 3. removeCard — normalization in reverse (core)

Write `removeCard(board, cardId)` that deletes a card completely: filter its id out of whichever column holds it **and** drop its entry from the `cards` map, immutably. Unknown id → no-op. Check: removing `card-1` from a two-card board leaves `cardIds: ['card-2']`, no `card-1` key in `cards`, the original board untouched — and `deserialize(serialize(after), null)` round-trips it exactly (no dangling ids for the integrity check to clean).

What it practices: keeping both halves of the normalized state consistent — the reverse of `deserialize`'s dangling-id cleanup.

Hint: copy the map with spread, then `delete copy[cardId]`; map over columns and only rebuild the one whose `cardIds.includes(cardId)`.

### ⭐⭐ 4. Test the index that's too big (core)

`board.test.js` pins the index *shift*, but never what happens when `toIndex` is past the end of the target column. Write two new `node --test` cases: dropping `card-1` from a 3-card `todo` into empty `doing` at index `99` must land it as `['card-1']`, and moving `card-1` to index `99` within its own column must produce `['card-2', 'card-3', 'card-1']`. Both pass today — the point is *pinning* the behavior so a future refactor can't silently break it.

What it practices: adding a test for an uncovered edge case; learning that `splice` clamps out-of-range indexes instead of erroring.

Hint: copy the shape of the existing tests; `arr.splice(99, 0, x)` on a short array just appends.

### ⭐⭐⭐ 5. moveColumn — THE bug, generalized (challenge)

Write `moveColumn(board, columnId, toIndex)` that reorders whole columns, immutably, no-op on unknown id. The trap from `moveCard` follows you here: remove-then-insert shifts indexes, so moving a column *down* (fromIndex < toIndex) needs `insertAt -= 1` — and since a column always moves within the one `columns` array, it's the "same container" case every time. Check with columns `[todo, doing, done]`: moving `todo` to index `3` gives `[doing, done, todo]`; moving `done` to `0` gives `[done, todo, doing]`; moving `todo` to `1` (its own slot's edge) leaves order unchanged.

What it practices: recognizing that the README's off-by-one is a *rule about remove-then-insert*, not a fact about cards.

Hint: `findIndex`, then the exact three lines of shift logic from `moveCard`, then `filter` + `splice`.

### ⭐⭐⭐ 6. Undo — the payoff of immutability (challenge)

Write `createHistory(initialBoard)` returning `{ board, canUndo, commit(next), undo() }`: `commit` pushes the current board onto a `past` array before adopting the new one; `undo` pops back one step (safe no-op when `past` is empty). Because every `board.js` function returns a fresh board, "history" is just an array of old objects — no inverse operations, no copying. Check: commit a move, commit an add, `undo()` removes only the add, a second `undo()` restores the starting board, and `canUndo` is then `false`.

What it practices: the README's rollback idea ("keep the old board") extended into full multi-step undo — free because state is immutable plain data.

Hint: two variables (`present`, `past` array) and a getter; `undo` is `present = past.pop()` guarded by a length check.

## Solutions

### 1. countCards

```js
export function countCards(board) {
  return board.columns.reduce((n, c) => n + c.cardIds.length, 0);
}
```

WHY: State is data, so "how many cards?" is a fold over the data — the original DOM-as-database version would have had to count divs on screen. Counting `cardIds` (order) rather than `Object.keys(board.cards)` (content) means the answer matches what's rendered even if the two ever drift.

### 2. renameCard

```js
export function renameCard(board, cardId, newText) {
  if (!(cardId in board.cards)) return board; // unknown card: no-op
  return {
    ...board,
    cards: { ...board.cards, [cardId]: { ...board.cards[cardId], text: newText } },
  };
}
```

WHY: Normalization pays off — content changes touch only the `cards` map; every column's `cardIds` array is reused untouched. The nested spreads copy exactly the path that changed, which is the same discipline `addCard` uses, and the no-op-on-unknown mirrors `moveCard`'s "user gestures shouldn't crash" rule.

### 3. removeCard

```js
export function removeCard(board, cardId) {
  if (!(cardId in board.cards)) return board;
  const cards = { ...board.cards };
  delete cards[cardId];
  return {
    ...board,
    cards,
    columns: board.columns.map((c) =>
      c.cardIds.includes(cardId)
        ? { ...c, cardIds: c.cardIds.filter((id) => id !== cardId) }
        : c),
  };
}
```

WHY: Deleting must maintain referential integrity *forward* — remove the id from order AND the object from content — or you'd rely on `deserialize`'s cleanup to hide your mess on the next reload. `delete` is safe here because it mutates a fresh copy, never the input; untouched columns are returned by reference, exactly like `moveCard` does.

### 4. Index-past-the-end tests

```js
test('moveCard clamps an index past the end of the target column', () => {
  const b = boardWith('a', 'b', 'c'); // card-1..3 in todo
  const cross = moveCard(b, 'card-1', 'doing', 99);
  assert.deepEqual(idsIn(cross, 'doing'), ['card-1']);
  const same = moveCard(b, 'card-1', 'todo', 99);
  assert.deepEqual(idsIn(same, 'todo'), ['card-2', 'card-3', 'card-1']);
});
```

WHY: The drop handler computes indexes from pointer math, and "below every card's midpoint" can hand `moveCard` an index equal to (or past) the array length — this test pins that `splice`'s clamping makes it mean "append at the end". Pinning behavior that works *by accident* turns it into behavior that works *by contract*.

### 5. moveColumn

```js
export function moveColumn(board, columnId, toIndex) {
  const fromIndex = board.columns.findIndex((c) => c.id === columnId);
  if (fromIndex === -1) return board;
  let insertAt = toIndex;
  if (fromIndex < toIndex) insertAt -= 1; // moving DOWN: same shift as moveCard
  const columns = board.columns.filter((c) => c.id !== columnId);
  columns.splice(insertAt, 0, board.columns[fromIndex]);
  return { ...board, columns };
}
```

WHY: This is THE bug from the README abstracted one level: any remove-then-insert within one array shifts later indexes, so a downward move must subtract one. There's no `from !== to` case to worry about — columns always move inside the single `columns` array — which makes this a cleaner specimen of the rule than `moveCard` itself. `filter` builds a fresh array, so mutating it with `splice` before returning is still an immutable update of the board.

### 6. createHistory

```js
export function createHistory(initial) {
  let present = initial;
  const past = [];
  return {
    get board() { return present; },
    get canUndo() { return past.length > 0; },
    commit(next) { past.push(present); present = next; },
    undo() {
      if (past.length > 0) present = past.pop();
      return present;
    },
  };
}
```

WHY: Because `addCard`/`moveCard` never mutate their input, every board that ever existed is still intact — history is just an array of references, costing nothing to keep. This is the README's optimistic-rollback trick ("restore the old board if the server says no") generalized to N steps, and it's why immutable state makes undo a feature you get instead of a feature you build. Wire it into the page by calling `history.commit(...)` where `commit(...)` is called today, plus one Undo button.
