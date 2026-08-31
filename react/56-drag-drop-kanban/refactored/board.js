/**
 * The board's rules, with zero React and zero DOM in sight.
 *
 * The board is normalized like a tiny database (js#64's move, in React):
 *   columns[] holds ORDER  — arrays of card ids
 *   cards{}   holds CONTENT — looked up by id
 * A move therefore rewrites two small id arrays and never touches a card.
 *
 * board: { columns: [{ id, title, cardIds: [] }], cards: { [id]: { id, text } } }
 */
export const initialBoard = {
  columns: [
    { id: 'todo', title: 'To do', cardIds: ['c1', 'c2', 'c3'] },
    { id: 'doing', title: 'Doing', cardIds: ['c4'] },
    { id: 'done', title: 'Done', cardIds: ['c5'] },
  ],
  cards: {
    c1: { id: 'c1', text: 'Write the spec' },
    c2: { id: 'c2', text: 'Buy more coffee' },
    c3: { id: 'c3', text: 'Fix the login bug' },
    c4: { id: 'c4', text: 'Review the PR' },
    c5: { id: 'c5', text: 'Ship 1.0' },
  },
};

/** Which column currently holds this card? `null` if no column does. */
export function columnOf(board, cardId) {
  return board.columns.find((col) => col.cardIds.includes(cardId)) || null;
}

/**
 * Move `cardId` into `toColumnId`, landing at `toIndex`.
 *
 * THE CONTRACT: `toIndex` is a slot in the column *as it looks on screen
 * right now* — "put it where card number 2 currently sits". Pass `null`
 * or nothing for "at the end". That's what a drop handler can honestly
 * report; anything cleverer would be the UI doing arithmetic.
 *
 * Returns a NEW board, or the SAME board object when the move is a no-op
 * (unknown card, unknown column). "Same reference in, same reference out"
 * is the standard no-op contract: React re-renders nothing.
 *
 * THE BUG THIS FUNCTION OWNS: to move a card you remove it first, and if
 * it was removed from *above* the slot you aimed at in that same column,
 * every slot below shifted up by one. Ignore that and drops land one
 * position off — but only when dragging downwards inside one column,
 * which is exactly the intermittent weirdness nobody can reproduce.
 * Here it is three lines and a unit test.
 */
export function moveCard(board, cardId, toColumnId, toIndex) {
  if (!board.cards[cardId]) return board; // unknown card: nothing to move
  const to = board.columns.find((col) => col.id === toColumnId);
  if (!to) return board; // dropped somewhere that isn't a column

  const from = columnOf(board, cardId);
  const wanted = toIndex == null ? to.cardIds.length : toIndex;

  // 1. take it out wherever it was
  const columns = board.columns.map((col) =>
    col.cardIds.includes(cardId)
      ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
      : col,
  );
  const target = columns.find((col) => col.id === toColumnId);

  // 2. correct for the hole the removal left, then clamp
  const movedDownInPlace =
    from && from.id === toColumnId && from.cardIds.indexOf(cardId) < wanted;
  const index = Math.max(
    0,
    Math.min(movedDownInPlace ? wanted - 1 : wanted, target.cardIds.length),
  );

  // 3. put it back
  const cardIds = [
    ...target.cardIds.slice(0, index),
    cardId,
    ...target.cardIds.slice(index),
  ];

  return {
    ...board,
    columns: columns.map((col) => (col.id === toColumnId ? { ...col, cardIds } : col)),
  };
}

/** Human-readable snapshot — used by the page's "log state" button. */
export function describeBoard(board) {
  return board.columns
    .map(
      (col) =>
        col.title + ': ' + col.cardIds.map((id) => board.cards[id].text).join(', '),
    )
    .join('\n');
}
