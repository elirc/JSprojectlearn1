import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, addCard, moveCard, serialize, deserialize } from './board.js';

function boardWith(...texts) {
  let b = createBoard([
    { id: 'todo', title: 'Todo' },
    { id: 'doing', title: 'Doing' },
    { id: 'done', title: 'Done' },
  ]);
  for (const t of texts) b = addCard(b, 'todo', t);
  return b;
}

const idsIn = (board, colId) => board.columns.find((c) => c.id === colId).cardIds;

test('addCard: normalized — content in cards, order in cardIds', () => {
  const b = boardWith('design', 'pitch');
  assert.deepEqual(idsIn(b, 'todo'), ['card-1', 'card-2']);
  assert.equal(b.cards['card-1'].text, 'design');
  assert.deepEqual(idsIn(b, 'doing'), []);
});

test('moveCard across columns, at a position', () => {
  let b = boardWith('a', 'b');
  b = addCard(b, 'doing', 'x'); // card-3
  b = moveCard(b, 'card-1', 'doing', 0); // drop "a" above "x"
  assert.deepEqual(idsIn(b, 'todo'), ['card-2']);
  assert.deepEqual(idsIn(b, 'doing'), ['card-1', 'card-3']);
});

test('THE INDEX SHIFT: moving DOWN within a column lands where the user dropped', () => {
  let b = boardWith('a', 'b', 'c', 'd'); // card-1..4
  // drag "a" (index 0) to just after "c" — the drop zone reports index 3
  b = moveCard(b, 'card-1', 'todo', 3);
  assert.deepEqual(idsIn(b, 'todo'), ['card-2', 'card-3', 'card-1', 'card-4']);
});

test('moving UP within a column needs no shift', () => {
  let b = boardWith('a', 'b', 'c', 'd');
  b = moveCard(b, 'card-4', 'todo', 1);
  assert.deepEqual(idsIn(b, 'todo'), ['card-1', 'card-4', 'card-2', 'card-3']);
});

test('moveCard is immutable — the old board still exists (optimistic-UI rollback)', () => {
  const before = boardWith('a', 'b');
  const after = moveCard(before, 'card-1', 'done', 0);
  assert.deepEqual(idsIn(before, 'todo'), ['card-1', 'card-2']); // untouched
  assert.deepEqual(idsIn(after, 'done'), ['card-1']);
  // rollback = just use `before` again. No inverse operation needed.
});

test('unknown card or column: no-op, not a crash', () => {
  const b = boardWith('a');
  assert.equal(moveCard(b, 'card-99', 'done', 0), b);
  assert.equal(moveCard(b, 'card-1', 'nope', 0), b);
});

test('serialize/deserialize round-trips', () => {
  const b = moveCard(boardWith('a', 'b'), 'card-2', 'doing', 0);
  const restored = deserialize(serialize(b), null);
  assert.deepEqual(restored, b);
});

test('deserialize: corrupt text falls back; dangling card ids are dropped', () => {
  const fallback = boardWith('fresh');
  assert.equal(deserialize('{oops', fallback), fallback);
  assert.equal(deserialize('null', fallback), fallback);

  const damaged = JSON.stringify({
    columns: [{ id: 'todo', title: 'Todo', cardIds: ['card-1', 'card-ghost'] }],
    cards: { 'card-1': { id: 'card-1', text: 'a' } },
    nextId: 2,
  });
  assert.deepEqual(deserialize(damaged, fallback).columns[0].cardIds, ['card-1']);
});
