// Drag and drop, tested without dragging anything. The gesture is
// browser glue; the MOVE is a pure function — and only pure functions
// can be checked like this.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveCard, columnOf, initialBoard, describeBoard } from './board.js';

const ids = (board, colId) =>
  board.columns.find((col) => col.id === colId).cardIds;

test('moves a card across columns at the requested index', () => {
  const next = moveCard(initialBoard, 'c1', 'doing', 0);
  assert.deepEqual(ids(next, 'todo'), ['c2', 'c3']);
  assert.deepEqual(ids(next, 'doing'), ['c1', 'c4']);
});

test('a missing index appends to the end of the column', () => {
  const next = moveCard(initialBoard, 'c1', 'doing');
  assert.deepEqual(ids(next, 'doing'), ['c4', 'c1']);
});

test('moving DOWN inside a column accounts for the removal (the classic off-by-one)', () => {
  // todo is [c1, c2, c3]. "Drop c1 where c3 sits" = index 2.
  // Naive: remove c1 -> [c2, c3], insert at 2 -> [c2, c3, c1]. One too far.
  const next = moveCard(initialBoard, 'c1', 'todo', 2);
  assert.deepEqual(ids(next, 'todo'), ['c2', 'c1', 'c3']);
});

test('moving UP inside a column needs no correction', () => {
  const next = moveCard(initialBoard, 'c3', 'todo', 0);
  assert.deepEqual(ids(next, 'todo'), ['c3', 'c1', 'c2']);
});

test('dropping a card on its own slot changes nothing', () => {
  assert.deepEqual(ids(moveCard(initialBoard, 'c1', 'todo', 0), 'todo'), ['c1', 'c2', 'c3']);
  assert.deepEqual(ids(moveCard(initialBoard, 'c1', 'todo', 1), 'todo'), ['c1', 'c2', 'c3']);
});

test('indexes are clamped to the destination, above and below', () => {
  const high = moveCard(initialBoard, 'c1', 'done', 99);
  assert.deepEqual(ids(high, 'done'), ['c5', 'c1']);
  const low = moveCard(initialBoard, 'c1', 'done', -4);
  assert.deepEqual(ids(low, 'done'), ['c1', 'c5']);
});

test('the last slot of a column is reachable by index', () => {
  const next = moveCard(initialBoard, 'c4', 'todo', 3);
  assert.deepEqual(ids(next, 'todo'), ['c1', 'c2', 'c3', 'c4']);
  assert.deepEqual(ids(next, 'doing'), []);
});

test('an unknown card id is a no-op — same board reference back', () => {
  assert.equal(moveCard(initialBoard, 'nope', 'doing', 0), initialBoard);
});

test('an unknown column id is a no-op — dropping on the page loses nothing', () => {
  assert.equal(moveCard(initialBoard, 'c1', 'the-header', 0), initialBoard);
});

test('the move never mutates the board it was given', () => {
  const before = JSON.stringify(initialBoard);
  moveCard(initialBoard, 'c1', 'done', 0);
  moveCard(initialBoard, 'c4', 'todo', 1);
  assert.equal(JSON.stringify(initialBoard), before);
});

test('immutability buys free rollback (keep the old board, restore it)', () => {
  const optimistic = moveCard(initialBoard, 'c1', 'done', 0);
  assert.deepEqual(ids(optimistic, 'done'), ['c1', 'c5']);
  const rolledBack = initialBoard; // the server said no; nothing to undo
  assert.deepEqual(ids(rolledBack, 'done'), ['c5']);
});

test('cards are never touched, only id order', () => {
  const next = moveCard(initialBoard, 'c1', 'done', 0);
  assert.equal(next.cards, initialBoard.cards);
});

test('columnOf finds the holder, or null', () => {
  assert.equal(columnOf(initialBoard, 'c4').id, 'doing');
  assert.equal(columnOf(initialBoard, 'ghost'), null);
});

test('the board survives a JSON round trip (it is plain data)', () => {
  const next = moveCard(initialBoard, 'c2', 'done', 0);
  const revived = JSON.parse(JSON.stringify(next));
  assert.equal(describeBoard(revived), describeBoard(next));
});
