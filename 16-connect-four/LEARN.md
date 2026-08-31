# 📘 Learning Guide: Connect Four

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The classic game **Connect Four**, in a web page. The board is a grid of 6 rows and 7 columns of circular cells. Two players — red and yellow — take turns clicking a column. A disc "drops" to the lowest empty cell in that column (like gravity). First player to line up **four in a row** — horizontally, vertically, or diagonally — wins. If the board fills with no winner, it's a draw.

When you open the page you see the empty grid and "Red's turn". Click column 4: the bottom cell of column 4 turns red, status changes to "yellow's turn". Play until someone lines up four, and the status says "red wins!" (and further clicks do nothing).

The special thing about the refactored version: the game's *rules* live in a separate file (`game.js`) with no web-page code in it at all — so they can be tested automatically with Node.

## 2. Concepts you need first

### 2D arrays (a grid as an array of arrays)
An **array** is a list. A grid is a list *of lists* — each inner array is one row:

```js
const grid = [
  ["", "", ""],
  ["", "x", ""],
];
console.log(grid[1][1]); // "x" — row 1, column 1
grid[0][2] = "o";        // top-right cell
```

Convention here: `board[row][col]`, row 0 at the top, row 5 at the bottom.

### Building the board: `Array.from` and `fill`
```js
const row = Array(3).fill(null);       // [null, null, null]
const grid = Array.from({ length: 2 }, () => Array(3).fill(null));
// [[null,null,null],[null,null,null]] — 2 rows, each its OWN array
```

`Array.from({length: n}, fn)` calls fn once per slot. That "own array" part matters: `Array(2).fill(row)` would put the *same* row object in both slots, so editing one row would edit "both."

### `null` vs `""`
Both mean "nothing here," but `null` is the deliberate "empty" value in JavaScript. The original uses `""` (empty string); the refactor uses `null`. Either works — the refactor's choice just reads as "no disc" rather than "a disc whose color is blank."

### DOM: tables, ids, clicks
The board is an HTML `<table>`: rows are `<tr>`, cells are `<td>`. JavaScript builds them:

```js
const td = document.createElement("td");
td.id = "cell-2-3";                 // name it after its coordinates
td.onclick = () => console.log(3); // run this when clicked
tr.appendChild(td);
```

Coloring a cell is done with **CSS classes**: the stylesheet says `td.red { background: #c33; }`, so `td.className = "red"` paints it red, and `td.className = ""` clears it.

### Copying arrays: mutation vs immutability
To **mutate** means to change an existing thing in place. The opposite style — **immutability** — makes a changed *copy* and leaves the original alone:

```js
const board = [[null, null], [null, null]];
const copy = board.map((row) => [...row]); // new outer array, new rows
copy[0][0] = "red";
console.log(board[0][0]); // still null — the original is untouched
```

`[...row]` is the **spread** syntax: it copies a row's items into a new array. Why copy? If moves return new boards, you can keep old boards around — for undo, or for an AI that "tries" moves without wrecking the real game.

### Destructuring
Pulling values out of arrays/objects by shape:

```js
const [dRow, dCol] = [1, -1];      // dRow=1, dCol=-1
const { phase, winner } = state;    // grab two properties by name
```

### Useful array methods: `some`, `every`, `map`
```js
[1, 5, 9].some((n) => n > 8);   // true — at least one passes
[1, 5, 9].every((n) => n > 0);  // true — all pass
[1, 2].map((n) => n * 10);      // [10, 20] — transformed copy
```

### Direction vectors
A **vector** here is just a pair of numbers meaning "step this much": `[0, 1]` = "same row, next column" (move right); `[1, 1]` = "down one, right one" (diagonal). Add a vector to a position repeatedly and you walk in a straight line:

```js
let r = 2, c = 3;
const [dR, dC] = [1, 1];
r += dR; c += dC; // now at (3, 4) — one step down-right
```

Negating the vector (`[-1, -1]`) walks the *opposite* way. This one idea replaces four copy-pasted loops.

### Modules and tests
`export` marks values a file shares; `import` pulls them in. Node's built-in test runner runs files ending in `.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('math works', () => assert.equal(1 + 1, 2));
```

`assert.ok(x)` fails unless x is truthy; `assert.deepEqual(a, b)` compares objects/arrays by content. Run with `node --test 16-connect-four/`. A test that checks one function in isolation is a **unit test** — only possible when the function doesn't need a browser.

## 3. Walking through the original code

**Setup.** One loop builds both the data (`board`, 6 rows of 7 empty strings) and the HTML table, giving each `<td>` an id like `cell-2-3` and a click handler for its column.

**The giant handler.** `makeHandler(c)` returns the function that runs when any cell in column c is clicked. It does *everything*:

```js
var row = -1;
for (var r = 5; r >= 0; r--) {
  if (board[r][c] == "") { row = r; break; }
}
if (row == -1) return; // column full
board[row][c] = current;
document.getElementById("cell-" + row + "-" + c).className = current;
```

Scan the column bottom-up for the first empty cell (gravity). Write the current player's color into the array *and* paint the matching `<td>` — data change and screen change interleaved in one breath.

**Four win loops.** Then come four nearly identical blocks. Horizontal:

```js
for (var start = 0; start <= 3; start++) {
  if (board[row][start] == current && board[row][start + 1] == current &&
      board[row][start + 2] == current && board[row][start + 3] == current) {
    won = true;
  }
}
```

This slides a 4-cell "window" across the row. Then the same again for vertical, then two more (with double loops over the whole board) for the two diagonals — each a wall of `board[r2 + 3][c2 + 3]`-style index arithmetic. The comment planted at the end is the honest part: "would YOU bet money on all four loops being right? Neither would we."

**Endgame.** If `won`, set `gameOver`, write the status, stop. Otherwise check for a draw by seeing if the top row is full, otherwise flip `current` between `"red"` and `"yellow"` using a ternary, and update the status text.

## 4. What's wrong with it (in beginner terms)

**1. One handler does six jobs.** Find the row, change the data, patch the screen, check win, check draw, flip turns. Suppose the win detection seems flaky. Where do you look? Inside an 80-line function where rules code and screen code alternate line by line. You can't examine "just the win logic" because it isn't a separate thing — it's paragraphs in the middle of something else. And you can't *test* it without a browser and a mouse.

**2. Four copies of the same idea.** Horizontal, vertical, and two diagonals are the *same* concept — "four equal cells in a straight line" — written out four times with different index arithmetic. Copies drift: imagine you decide to make the board 8 columns wide. You update the horizontal loop's `start <= 3` to `start <= 4`... but forget the down-left diagonal's `c3 <= 6`. Now one specific diagonal win near the new edge silently goes undetected — and you might not hit that case in months of play. Four code paths means four places for a bug to hide.

**3. Testing means clicking.** To verify "diagonal down-left win detected in row 2," you must physically click out that whole game, every time you touch the code. Five minutes per case, no record, no repeatability. That's why the refactor's headline feature is a test file.

**4. Whole-board scans.** After each move it rechecks every window on the board — even though only lines *through the disc just played* could have changed. Harmless at this size, but a sign of the missing question "what actually changed?"

## 5. Try it yourself first!

1. Vague: could the game's *rules* be functions that never mention `document`?
2. Split three ways: rules (board math), rendering (paint a given state), controller (glue clicks to both). Try moving code into those piles.
3. For the win check: instead of scanning windows, start *from the just-played disc* and count identical discs outward. What directions must you check?
4. There are only four line orientations. Write them as data: `[[0,1],[1,0],[1,1],[1,-1]]`. Write ONE function `countRun(board, row, col, dRow, dCol, player)` that steps in a direction while it keeps seeing `player`'s discs.
5. Careful — the winning disc can land in the *middle* of a line (two discs on one side, one on the other). So for each direction: `1 + count(forward) + count(backward) >= 4`.
6. Make `dropDisc` return a fresh copied board instead of writing into the given one. Then write a Node test: play a few drops, assert where the discs landed.

## 6. Understanding the refactored solution

**`game.js` — pure rules.** "Pure" here means: no DOM, no `document`, no side effects beyond returning values. That's what makes it runnable (and testable) in Node.

- `createBoard()` builds 6 fresh rows of 7 `null`s with `Array.from`.
- `dropDisc(board, col, player)` scans the column bottom-up. On the first `null`, it makes a copy (`board.map((r) => [...r])`), writes the disc into the copy, and returns `{ board: next, row }`. The old board is untouched — a test verifies this exact promise. A full column returns `null`, which the caller must handle.
- The four win loops became four *values*:

```js
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
```

  and one logic path. `isWinningMove` asks, for each direction: how long is the run through the just-played disc? `1` (the disc itself) `+ countRun(...)` going one way `+ countRun(...)` going the exact opposite way (the negated vector). If any direction reaches 4, `some` returns true. `countRun` is a small while-loop that steps `r += dRow; c += dCol` while it stays on the board and keeps matching the player. Because there's only one copy of the walking logic, the four orientations *can't* each have their own bug.

  Note this also fixes the whole-board-scan gripe: it only examines lines through the new disc.

- `isBoardFull` checks just the top row with `every` — if row 0 has no `null`, no column has space.

**`game.test.js` — the payoff.** A helper `play(moves)` replays a list of `[column, player]` drops and returns the final board plus where the last disc landed. Then each test replays a real situation:

- stacking works (second disc lands on top of the first);
- `dropDisc` really doesn't mutate (drop into a board, then check the *original* is still empty);
- a full column returns `null`;
- horizontal, vertical, and — the nasty one — a **diagonal completed in the middle**: red builds a diagonal but places the second cell of it *last*. A naive "count outward in one direction only" would count 1 + 2 and miss the win; counting both directions catches it. The test pins that case down forever;
- three in a row is *not* a win (tests should check negatives too);
- `isBoardFull` flips to true only when all 42 cells are filled.

Every one of these runs in milliseconds with `node --test` — versus five minutes of clicking each.

**`index.html` — three labeled modules in one file.**

1. *GAME RULES*: a pasted copy of `game.js`. Why a copy? Browsers refuse `import` when you open a file directly from disk (a `file://` page) for security reasons; with a local dev server you'd delete the copy and write `<script type="module">` with an import. The banner comment documents the compromise.
2. *RENDERING*: `render(state)` repaints every cell's class from `state.board` (`?? ''` turns `null` into "no class") and sets the status line via `statusText`, which reads `phase`/`current`/`winner` from the state. It never decides anything — same "screen is a function of state" pattern as project 14.
3. *CONTROLLER*: owns one `state` object `{ board, current, phase, winner }`. `handleColumnClick` is the whole game flow in ~15 readable lines: guard on phase, try the drop, update board, ask the rules about win/draw, flip the turn, render. `phase` (`'playing' | 'won' | 'draw'`) replaces the `gameOver` boolean — same state-machine idea as project 15. A "New game" button just rebuilds the state and renders.

## 7. Words you learned (glossary)

- **2D array**: an array of arrays, used as a grid — `board[row][col]`.
- **`null`**: the deliberate "no value here" value.
- **Mutation**: changing an existing object/array in place.
- **Immutable update**: building a changed copy and leaving the original alone.
- **Spread (`...`)**: copies an array's items into a new array: `[...row]`.
- **Destructuring**: unpacking values by shape: `const [a, b] = pair`.
- **Direction vector**: a `[rowStep, colStep]` pair; adding it repeatedly walks a straight line.
- **Run**: consecutive same-player discs in a line.
- **`some` / `every`**: does at least one / do all items pass a test.
- **Pure function**: output depends only on inputs; touches nothing outside itself.
- **Module**: a file that `export`s values for others to `import`.
- **Unit test**: an automated check of one piece of logic in isolation.
- **`assert`**: fail the test loudly if a condition doesn't hold.
- **Controller**: the glue code that owns state and connects events → rules → render.
- **Render**: draw the screen from the state; decide nothing.
- **Phase**: one variable holding exactly one named game state (`playing`/`won`/`draw`).
- **Ternary (`?:`)**: inline if/else: `x === 'red' ? 'yellow' : 'red'`.
- **`??`**: use the right side when the left is `null`/`undefined`.
- **`file://` page**: an HTML file opened straight from disk; browsers restrict module imports there.
- **Dev server**: a small local web server used during development so imports and such work.

## 8. Experiments to try on the plane (no internet needed)

1. **Make it Connect FIVE**: in the refactored `index.html`, change `run >= 4` to `run >= 5`. Expected: four in a row no longer wins; five does. One number, one place. Find how many numbers you'd have to change in the original's four loops (count the `+ 3`s, `<= 3`s, and `<= 2`s).
2. **Widen the board**: in the refactored file set `COLS = 9`. Expected: a 9-wide board that just works, because nothing else hardcodes 7. (The original hardcodes 7 and 6 in at least five places.)
3. **Break a direction on purpose**: in `game.js`, change `[1, -1]` to `[1, -2]`, then run `node --test 16-connect-four/`. Expected: the "diagonal win, completed in the MIDDLE" test fails, naming exactly what broke. Fix it back and watch the suite go green — that loop is your five minutes of clicking, automated.
4. **Add a move counter**: in the controller, add `moves: 0` to the state, `state.moves++` in `handleColumnClick`, and show it in `statusText`. Expected: because all display flows through `render(state)`, the count appears and can never go stale.
5. **Prove immutability buys undo**: in the controller, before each drop push the old board onto a `history` array; wire a button that pops it back into `state.board` and renders. Expected: working undo in ~6 lines — possible *only* because `dropDisc` never destroys the old board.
