# 🏋️ Practice: Connect Four

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

All of these live in the pure-rules world: add functions next to `refactored/game.js` (export them from it, or make a new `practice.js` that imports from it) and tests in a new `practice.test.js`. Run everything with `node --test 16-connect-four/` — no browser, no clicking.

## Exercises

### ⭐ 1. legalMoves (warm-up)

Write `legalMoves(board)` returning an array of the column indexes that can still accept a disc. Derive it from the board — no extra bookkeeping state.

What it practices: writing a pure rules function in `game.js` style; the same top-row trick as `isBoardFull`.

Hint: a column has room exactly when its row-0 cell is `null`.

Check: empty board → `[0,1,2,3,4,5,6]`; after six drops into column 3 → `[0,1,2,4,5,6]`; `legalMoves(board).length === 0` exactly when `isBoardFull(board)` is true.

### ⭐⭐ 2. Test the untested diagonal (core)

Look closely at `game.test.js`: the diagonal test's line runs through (5,0) (4,1) (3,2) (2,3) — that's the `[1,-1]` orientation. The `[1,1]` orientation (down-right, like (2,0) (3,1) (4,2) (5,3)) has **no test at all**. Write one: build a move list where red completes exactly that line, and assert both where the last disc landed and that it wins.

What it practices: spotting coverage gaps by mapping tests back to the data (`DIRECTIONS`) they're supposed to cover, and hand-building board positions with `play`.

Hint: to put red at (2,0) you need three fillers under it in column 0. The `play` helper doesn't enforce turn order, so pile up yellows freely. Plan column heights on paper first.

Check: your test passes on the real code, and **fails** if you delete `[1, 1]` from `DIRECTIONS` (try it, then restore). None of the existing tests catch that deletion — that's the gap you just closed.

### ⭐⭐ 3. boardToString (core)

Debugging a failing board test means squinting at nested arrays. Write `boardToString(board)` that renders the board as 6 lines of 7 characters: `.` for empty, `r` for red, `y` for yellow — top row first.

What it practices: a display helper for the *terminal* — still pure (returns a string, prints nothing), still testable.

Hint: two nested `map`s and two `join`s — rows join with `'\n'`, cells with `''`. `cell[0]` turns `'red'` into `'r'`.

Check: after `play([[0,'red'],[0,'yellow'],[1,'red']])`, the bottom line is `'rr.....'`, the line above is `'y......'`, the top line is `'.......'`.

### ⭐⭐ 4. A referee: whoWins (core)

Write `whoWins(moves)` that replays a whole game from just a list of column numbers — red moves first, players alternate. Return `'red'` or `'yellow'` the instant someone wins (ignore any later moves), `null` if the moves run out with no winner, and throw an `Error` on a drop into a full column.

What it practices: composing the exported rules (`dropDisc` + `isWinningMove`) into a higher-level function — the controller's job, minus the DOM.

Hint: this is the controller loop from `index.html` with the rendering deleted; flip players with a ternary.

Check: `whoWins([0,0,1,1,2,2,3])` → `'red'` (bottom-row horizontal); `whoWins([0,1,0,1,0,1,2,1])` → `'yellow'` (vertical in column 1 — count it: yellow gets four there); `whoWins([0,1,2])` → `null`; `whoWins([0,0,0,0,0,0,0])` throws.

### ⭐⭐⭐ 5. One-move lookahead: findWinningColumn (challenge)

Write `findWinningColumn(board, player)` returning the lowest-numbered column where `player` would win **immediately** by dropping there, or `null` if none exists. Do not undo anything and do not copy the board yourself.

What it practices: the README's promise that immutability makes AI lookahead "almost free" — try a move on the copy `dropDisc` returns, judge it, and simply drop the copy.

Hint: loop over columns; `dropDisc` gives you a hypothetical `{ board, row }` (or `null` for a full column — skip those); ask `isWinningMove` about the hypothetical.

Check: with red on the bottom row at columns 0,1,2 → `findWinningColumn(board,'red')` is `3` and `findWinningColumn(board,'yellow')` is `null`; empty board → `null` for both; three yellows stacked in column 5 → `5` for yellow. Bonus check: the same function answers "which column must I block?" — just ask it about your opponent.

### ⭐⭐⭐ 6. winningLine — the cells to highlight (challenge)

A real UI highlights the four winning discs. Write `winningLine(board, row, col)` returning the winning cells as an array of `[row, col]` pairs **in line order** (5 or more if the run is longer), or `null` if the move at (row, col) didn't win. You'll need a variant of `countRun` that collects coordinates instead of counting.

What it practices: generalizing the direction-vector walk — same skeleton as `countRun`, richer return value; backward-plus-forward assembly of the full line.

Hint: walk the negated vector for the "backward" cells, `reverse()` them so the line reads start-to-end, sandwich `[row, col]` in the middle, then append the forward cells.

Check: after the horizontal-win game from the existing test, `winningLine(board, 5, 3)` → `[[5,0],[5,1],[5,2],[5,3]]`; for the middle-completion diagonal game it returns the four cells (5,0) (4,1) (3,2) (2,3) in line order; for a three-in-a-row board it returns `null`.

## Solutions

### 1. legalMoves

```js
export function legalMoves(board) {
  const cols = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) cols.push(col);
  }
  return cols;
}
```

WHY: like `isBoardFull`, it reads only the top row — gravity guarantees a column with an empty top has room. It's derived from the board on demand, so it can never disagree with reality; keeping a separate "heights" tally would be a second source of truth to keep in sync.

### 2. Test the untested diagonal

```js
test('diagonal win in the [1,1] (down-right) direction', () => {
  // red: (5,3) (4,2) (3,1) (2,0) — fillers raise each column first
  const { board, last } = play([
    [3, 'red'],                                    // (5,3)
    [2, 'yellow'], [2, 'red'],                     // (4,2)
    [1, 'yellow'], [1, 'yellow'], [1, 'red'],      // (3,1)
    [0, 'yellow'], [0, 'yellow'], [0, 'yellow'], [0, 'red'], // (2,0)
  ]);
  assert.deepEqual(last, { row: 2, col: 0 });
  assert.ok(isWinningMove(board, last.row, last.col));
});
```

WHY: `DIRECTIONS` has four entries, so full coverage needs a winning test per entry — the suite had three. The refactor's one-`countRun` design means all four *share* the walking logic, but the `DIRECTIONS` data itself can still lose an entry, and only a test aimed at that exact orientation notices. (Verified: this test passes as-is and fails when `[1, 1]` is removed.)

### 3. boardToString

```js
export function boardToString(board) {
  return board
    .map((row) => row.map((cell) => (cell === null ? '.' : cell[0])).join(''))
    .join('\n');
}
```

WHY: it's rendering, but to a string — pure and returnable, so tests can assert on it and a debugging session can `console.log` it. Printing *inside* the function would make it useless in tests; returning the string keeps the decide/display separation even for a debug tool.

### 4. A referee: whoWins

```js
import { createBoard, dropDisc, isWinningMove } from './game.js';

export function whoWins(moves) {
  let board = createBoard();
  let current = 'red';
  for (const col of moves) {
    const result = dropDisc(board, col, current);
    if (result === null) throw new Error(`Column ${col} is full`);
    board = result.board;
    if (isWinningMove(board, result.row, col)) return current;
    current = current === 'red' ? 'yellow' : 'red';
  }
  return null;
}
```

WHY: this is the controller from `index.html` with the DOM amputated — proof that the flow (drop, check, flip) was never really about the screen. Note the two rule functions compose without any shared mutable state: each iteration's board is a fresh value from `dropDisc`, so returning early leaves nothing to clean up.

### 5. One-move lookahead: findWinningColumn

```js
import { dropDisc, isWinningMove, COLS } from './game.js';

export function findWinningColumn(board, player) {
  for (let col = 0; col < COLS; col++) {
    const result = dropDisc(board, col, player);
    if (result !== null && isWinningMove(result.board, result.row, col)) {
      return col;
    }
  }
  return null;
}
```

WHY: the whole "try a move, evaluate, discard" cycle is three lines *because* `dropDisc` returns a new board — the real board is never touched, so "discard" is doing nothing at all. With a mutating `dropDisc` this function would need to un-place discs (and un-place them correctly on every early return), which is exactly the bug farm immutability closes. Point it at the opponent and it doubles as block-detection — one function, two AI behaviors.

### 6. winningLine — the cells to highlight

```js
import { ROWS, COLS } from './game.js';

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function cellsInDirection(board, row, col, dRow, dCol, player) {
  const cells = [];
  let r = row + dRow;
  let c = col + dCol;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
    cells.push([r, c]);
    r += dRow;
    c += dCol;
  }
  return cells;
}

export function winningLine(board, row, col) {
  const player = board[row][col];
  for (const [dRow, dCol] of DIRECTIONS) {
    const line = [
      ...cellsInDirection(board, row, col, -dRow, -dCol, player).reverse(),
      [row, col],
      ...cellsInDirection(board, row, col, dRow, dCol, player),
    ];
    if (line.length >= 4) return line;
  }
  return null;
}
```

WHY: `cellsInDirection` is `countRun` upgraded from "how many" to "which ones" — same while-loop skeleton, same vector stepping, so the four orientations still share one code path. The backward walk comes out nearest-first, hence the `reverse()`; sandwiching `[row, col]` between backward and forward cells is the list form of the `1 + forward + backward` sum in `isWinningMove`, which is also why it handles the completed-in-the-middle case for free. Feed the result to the renderer (add a CSS class per cell) and the UI feature costs nothing more.
