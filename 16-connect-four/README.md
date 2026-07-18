# 16 — Connect Four

**Lesson: game state, win logic, and rendering as three separate modules — and
direction vectors instead of four copy-pasted win loops.**

## Run it

```
open original.html and refactored/index.html in a browser
node --test 16-connect-four/        # the rules are unit-tested in Node!
```

## What's wrong with the original?

1. **One 80-line click handler does everything**: find the row, mutate the board,
   patch the DOM, check wins, check draw, flip turns, write status. There is no way
   to reason about — or test — any one of those jobs in isolation.
2. **Four hand-written win loops**, one per direction, each a wall of `board[r+1][c+1]`
   index arithmetic. Read the comment planted in the original: can you *personally*
   certify all four loops correct by inspection? Neither could the author. And the only
   test harness available is clicking circles for five minutes per case.
3. **The win check scans the whole board** after every move, even though only lines
   through the disc just played could possibly have changed.

## What changed in the refactor

- **Three labeled modules in one file** — RULES / RENDERING / CONTROLLER:
  - `game.js` (the rules) contains **zero DOM code**, which is what makes
    `game.test.js` possible. The tests replay real games and assert on wins —
    including the nasty case where the winning disc lands in the *middle* of the line.
  - `render(state)` only displays; it never decides. Same "screen = f(state)" pattern
    as project 14.
  - The controller owns the state and the turn/phase flow, ~20 lines.
- **`DIRECTIONS = [[0,1],[1,0],[1,1],[1,-1]]`** — the four loops collapse into data
  plus one `countRun` helper walked in both directions (`run = 1 + forward + backward`).
  The four orientations stopped being four *code paths* and became four *values*, so
  they can't each have their own bug.
- **`dropDisc` returns a new board** instead of mutating — which the tests verify.
  Immutable updates make "undo" and AI look-ahead (try a move, evaluate, discard)
  almost free. Project 17 leans into this harder.
- The HTML embeds a copy of `game.js` because browsers refuse `import` on `file://`
  pages — the banner comment explains it. (With any dev server, e.g. `npx serve`,
  you'd delete the copy and use `<script type="module">`. This is the actual reason
  dev servers exist.)

## Key takeaway

When code has N parallel copies that differ only by "which direction," turn direction
into *data* (vectors) and keep one copy of the logic. And keep game rules out of the
DOM's reach — the proof it worked is sitting in `game.test.js`.
