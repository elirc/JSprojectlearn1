# 27 — Count Islands

You get a rectangular grid of `1`s (land) and `0`s (water). Count the
**islands**: maximal blobs of land connected side by side.

This is your first graph problem, and the graph is in disguise — nobody hands
you nodes and edges, just a grid where a cell's neighbours are the four cells
around it. The walk itself is dsa/24's DFS with one new obligation: a grid
has loops, so you must remember where you have already been.

## Signature

```js
/**
 * @param {number[][]} grid - rows of cells; 1 is land, 0 is water
 * @returns {number} how many separate islands the grid contains
 */
export function countIslands(grid) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `[[1,1,0],[1,1,0],[0,0,1]]` | `2` | the 2×2 block, and the lone corner cell |
| `[[1,0,1],[0,1,0],[1,0,1]]` | `5` | diagonal contact does **not** connect |
| `[[1,1,1],[1,0,1],[1,1,1]]` | `1` | a ring of land is one island around a lake |
| `[[0,0],[0,0]]` | `0` | all water |

The bigger example the tests use:

```
1 1 0 0 0
1 1 0 0 0      →  3 islands: the 2×2 block, the single 1
0 0 1 0 0         in the middle, and the pair at bottom right
0 0 0 1 1
```

## Constraints & edge cases

- Cells are the **numbers** `1` and `0`, not strings.
- Connectivity is **4-directional**: up, down, left, right. Diagonals do not
  connect, so a checkerboard of land is all separate islands.
- `countIslands([])` is `0`. Every row has the same length.
- **The grid must not be modified.** The tests snapshot it and compare
  afterwards, so no sinking islands in place — track visited cells separately.
- Grids can be one row tall, one column wide, or all land.
- Target complexity: O(rows × cols) time — each cell looked at a constant
  number of times — and O(rows × cols) space for the visited grid.

## Hints (take them one at a time!)

1. Two loops over every cell. Most cells you skip. What is true about a cell
   that should make the counter go up — and what has to happen *right after*
   you increment it, so that the rest of the same island doesn't get counted
   again?
2. When you find an uncounted land cell, count 1 island and then **erase the
   whole island from your future** — walk out from that cell to every land
   cell reachable through side-by-side steps and mark each one visited. Then
   carry on scanning. The outer loop counts islands; the inner walk consumes
   them.
3. Keep `visited` as a second grid of booleans the same shape as the input.
   For the walk, push `[r, c]` pairs onto an explicit stack: pop one, look at
   its four neighbours, and for each neighbour that is in bounds, is land,
   and is not yet visited — mark it visited **as you push it**, not when you
   pop it. (Marking at pop time lets the same cell be pushed several times.)

## Run it

```
node --test dsa/27-islands-count/attempt.test.js
```
