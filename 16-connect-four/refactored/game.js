// Pure Connect Four rules. No DOM, no browser — this exact file is
// unit-tested in Node (game.test.js). The HTML embeds a copy of it
// (see the README for why file:// URLs force that).

export const ROWS = 6;
export const COLS = 7;

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/**
 * Drop a disc into a column. Returns { board, row } with a NEW board
 * (the old one is untouched), or null if the column is full.
 */
export function dropDisc(board, col, player) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      const next = board.map((r) => [...r]);
      next[row][col] = player;
      return { board: next, row };
    }
  }
  return null;
}

// The four line orientations, as direction vectors. This is what
// replaces the original's four copy-pasted loops.
const DIRECTIONS = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal down-right
  [1, -1], // diagonal down-left
];

/** Did the disc just placed at (row, col) complete a line of four? */
export function isWinningMove(board, row, col) {
  const player = board[row][col];
  return DIRECTIONS.some(([dRow, dCol]) => {
    const run = 1 // the disc itself...
      + countRun(board, row, col, dRow, dCol, player)     // ...plus one way
      + countRun(board, row, col, -dRow, -dCol, player);  // ...plus the other
    return run >= 4;
  });
}

/** Count same-player discs in a straight line from (row, col), exclusive. */
function countRun(board, row, col, dRow, dCol, player) {
  let count = 0;
  let r = row + dRow;
  let c = col + dCol;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
    count++;
    r += dRow;
    c += dCol;
  }
  return count;
}

export function isBoardFull(board) {
  return board[0].every((cell) => cell !== null);
}
