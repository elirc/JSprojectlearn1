import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, dropDisc, isWinningMove, isBoardFull, ROWS } from './game.js';

// Helper: play a sequence of (col, player) moves, return final state.
function play(moves) {
  let board = createBoard();
  let last = null;
  for (const [col, player] of moves) {
    const result = dropDisc(board, col, player);
    board = result.board;
    last = { row: result.row, col };
  }
  return { board, last };
}

test('discs stack from the bottom', () => {
  const { board } = play([[3, 'red'], [3, 'yellow']]);
  assert.equal(board[ROWS - 1][3], 'red');
  assert.equal(board[ROWS - 2][3], 'yellow');
});

test('dropDisc does not mutate the old board', () => {
  const board = createBoard();
  dropDisc(board, 0, 'red');
  assert.equal(board[ROWS - 1][0], null);
});

test('a full column rejects the drop', () => {
  let board = createBoard();
  for (let i = 0; i < ROWS; i++) board = dropDisc(board, 0, 'red').board;
  assert.equal(dropDisc(board, 0, 'yellow'), null);
});

test('horizontal win', () => {
  const { board, last } = play([
    [0, 'red'], [0, 'yellow'], [1, 'red'], [1, 'yellow'],
    [2, 'red'], [2, 'yellow'], [3, 'red'],
  ]);
  assert.ok(isWinningMove(board, last.row, last.col));
});

test('vertical win', () => {
  const { board, last } = play([
    [0, 'red'], [1, 'yellow'], [0, 'red'], [1, 'yellow'],
    [0, 'red'], [1, 'yellow'], [0, 'red'],
  ]);
  assert.ok(isWinningMove(board, last.row, last.col));
});

test('diagonal win, completed in the MIDDLE of the line', () => {
  // The original's window-scanning loops handle this; a naive
  // "count from the placed disc in one direction" does not. This is
  // exactly the bug countRun-in-both-directions prevents.
  // Red builds the diagonal (5,0) (4,1) (3,2) (2,3) but places (4,1)
  // LAST — the winning disc lands in the middle of the line.
  const moves = [
    [0, 'red'], [2, 'yellow'], [3, 'red'], [2, 'yellow'],
    [2, 'red'], [3, 'yellow'], [4, 'red'], [3, 'yellow'],
    [3, 'red'], [1, 'yellow'], [1, 'red'],
  ];
  const { board, last } = play(moves);
  assert.deepEqual(last, { row: 4, col: 1 });
  assert.ok(isWinningMove(board, last.row, last.col));
});

test('three in a row is not a win', () => {
  const { board, last } = play([[0, 'red'], [1, 'red'], [2, 'red']]);
  assert.equal(isWinningMove(board, last.row, last.col), false);
});

test('isBoardFull', () => {
  let board = createBoard();
  assert.equal(isBoardFull(board), false);
  for (let col = 0; col < 7; col++) {
    for (let i = 0; i < ROWS; i++) board = dropDisc(board, col, 'red').board;
  }
  assert.equal(isBoardFull(board), true);
});
