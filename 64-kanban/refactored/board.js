/**
 * The kanban board as DATA — normalized, like a tiny database
 * (and for the same reason databases normalize):
 *
 *   {
 *     columns: [{ id, title, cardIds: [...] }],   // order lives here
 *     cards:   { [id]: { id, text } },            // content lives here
 *   }
 *
 * Cards are stored once and referenced by id; moving a card touches
 * two id-arrays, never the card itself. moveCard is a pure function,
 * so the trickiest logic in drag & drop — index math when reordering
 * within a column — is tested in Node, no browser involved.
 */

export function createBoard(columns) {
  return {
    columns: columns.map(({ id, title }) => ({ id, title, cardIds: [] })),
    cards: {},
    nextId: 1,
  };
}

export function addCard(board, columnId, text) {
  const column = board.columns.find((c) => c.id === columnId);
  if (!column) throw new Error(`No such column: ${columnId}`);
  const id = `card-${board.nextId}`;
  return {
    ...board,
    nextId: board.nextId + 1,
    cards: { ...board.cards, [id]: { id, text } },
    columns: board.columns.map((c) =>
      c === column ? { ...c, cardIds: [...c.cardIds, id] } : c),
  };
}

/**
 * Move a card to (toColumnId, toIndex). Immutable: returns a new
 * board (project 59's discipline — which is also what makes
 * optimistic UI possible: keep the old board, apply the new one,
 * roll back by just... using the old one again).
 *
 * THE index subtlety this function exists to own: when moving DOWN
 * within the same column, removing the card first shifts every later
 * card up by one — so the target index must shift down by one too.
 * Get this wrong and drops land one slot off, but only sometimes.
 */
export function moveCard(board, cardId, toColumnId, toIndex) {
  const from = board.columns.find((c) => c.cardIds.includes(cardId));
  const to = board.columns.find((c) => c.id === toColumnId);
  if (!from || !to) return board; // unknown card/column: a no-op, not a crash

  const fromIndex = from.cardIds.indexOf(cardId);
  let insertAt = toIndex;
  if (from === to && fromIndex < toIndex) insertAt -= 1; // the shift

  const withoutCard = from.cardIds.filter((id) => id !== cardId);

  return {
    ...board,
    columns: board.columns.map((c) => {
      if (c === from && c === to) {
        const ids = [...withoutCard];
        ids.splice(insertAt, 0, cardId);
        return { ...c, cardIds: ids };
      }
      if (c === from) return { ...c, cardIds: withoutCard };
      if (c === to) {
        const ids = [...c.cardIds];
        ids.splice(insertAt, 0, cardId);
        return { ...c, cardIds: ids };
      }
      return c;
    }),
  };
}

/** Serialization is trivial BECAUSE the state is plain data. */
export function serialize(board) {
  return JSON.stringify(board);
}

export function deserialize(text, fallback) {
  try {
    const b = JSON.parse(text);
    if (!Array.isArray(b?.columns) || typeof b?.cards !== 'object') return fallback;
    // referential integrity: drop ids pointing at cards that don't exist
    return {
      ...b,
      columns: b.columns.map((c) => ({
        ...c,
        cardIds: c.cardIds.filter((id) => id in b.cards),
      })),
    };
  } catch {
    return fallback;
  }
}
