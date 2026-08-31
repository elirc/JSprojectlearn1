# 📘 Learning Guide: Count Islands

Counting groups by walking through them and switching the lights off behind you.

## 1. The problem in plain words

A grid of `1`s and `0`s. `1` is land, `0` is water. Land cells that sit
directly next to each other — up, down, left, or right — belong to the same
island. Diagonal touching doesn't count. How many islands are there?

```
1 1 0 0 0
1 1 0 0 0      three islands
0 0 1 0 0
0 0 0 1 1
```

You are not counting land. You are counting *connected groups* of land, which
is a very different question and needs a very different tool.

## 2. Concepts you need first

**A graph.** Up to now the track has given you arrays (dsa/01–12), stacks and
queues (dsa/13–15), linked lists (dsa/16–18) and trees (dsa/24–26). A
**graph** is the general case containing all of them: a **vertex** is a
thing, an **edge** is a connection between two things, two vertices joined by
an edge are **neighbours**, and a **connected component** is a maximal group
you can travel between using edges.

"How many islands?" is literally "how many connected components does this
graph have?" — the same question as "how many friend groups are in this
social network."

**A grid is a graph in disguise.** The clever bit is that nobody stores the
edges. A tree node hands you `left` and `right`; a grid cell hands you
nothing, and you *compute* its neighbours from its coordinates:

```
neighbours of (r, c) = (r-1, c), (r+1, c), (r, c-1), (r, c+1)
                        up        down      left      right
```

…minus any that fall off the edge. An implicit graph, built on demand.

**Trees have no cycles; graphs do.** This is the one genuinely new
obligation. In dsa/24 you walked a tree with no bookkeeping at all, because
every node has one parent and one route to it. In a grid you can step right
then left and be back where you started — so a walk with no memory runs
forever. Hence a **`visited`** structure, and hence the rule that follows you
through every graph problem: *check whether you've been here before you go.*

**Stack vs queue, again (dsa/13, dsa/15).** The fill needs a to-do list of
cells. Take from the **back** for depth-first (charge down one arm, then come
back); take from the **front** for breadth-first (spread outwards in rings).
For *counting* islands it makes no difference — either way you visit exactly
the cells of one island. This solution uses a stack.

## 3. How to think about it

Here's the move, and it's worth saying out loud before you code: **when you
find a piece of a new island, count it once and then erase the whole island.**

Not erase from the grid — erase from *your future*, by marking every cell of
it as visited. Then keep scanning. The outer scan can only ever bump into
land it has never reached, and there is exactly one such "first cell" per
island. No merging, no comparing, no arithmetic.

Watch it on a small grid. `.` is water, `1` is unvisited land, `*` is land
you have already absorbed:

```
scan starts at (0,0)                 (0,0) is fresh land
1 1 . .    →  count = 1, flood fill from (0,0)
1 . . .
. . 1 1

* * . .    the fill took (0,0), (0,1), (1,0)
* . . .    the scan continues along row 0, row 1 — all water or already *
. . 1 1

* * . .    scan reaches (2,2): fresh land!
* . . .    →  count = 2, flood fill takes (2,2) and (2,3)
. . * *

count = 2, scan finishes with nothing left to find
```

Now trace the flood fill itself from `(0,0)` with a stack:

```
stack: [(0,0)]                       visited: (0,0)
pop (0,0) → neighbours (1,0) land, (0,1) land       push both
stack: [(1,0), (0,1)]                visited: (0,0)(1,0)(0,1)
pop (0,1) → neighbours (0,0) visited, (1,1) water, (0,2) water
stack: [(1,0)]
pop (1,0) → neighbours (0,0) visited, (2,0) water, (1,1) water
stack: []                            done — island fully consumed
```

Notice how much work the `visited` check does. Popping `(0,1)` looks straight
back at `(0,0)` and, without that check, would push it again — and `(0,0)`
would push `(0,1)` again, forever.

## 4. Common wrong turns

- **Counting land instead of islands.** If your counter lives inside the
  fill loop, you're measuring area. Increment it exactly once per discovery,
  in the outer scan.
- **No `visited` check → infinite loop.** The classic. Two adjacent land
  cells will happily pass each other back and forth until the stack eats all
  your memory.
- **Modifying the input to mark visited.** `grid[r][c] = 0` is the shortest
  possible fix and it destroys the caller's grid. The spec here forbids it
  and a test enforces it. Keep a separate `visited` grid.
- **Building `visited` with a shared row.**
  `new Array(rows).fill(new Array(cols).fill(false))` puts the *same* array
  object in every row, so marking `(0,3)` also marks `(1,3)`, `(2,3)`… Use
  `Array.from({ length: rows }, () => new Array(cols).fill(false))`.
- **Including diagonals.** Eight directions turns the 5×5 checkerboard from
  13 islands into 1.
- **Indexing before bounds-checking.** `grid[r + 1][c]` when `r + 1 === rows`
  is `undefined[c]` — a `TypeError`, not a `false`. Check the row and column
  are in range *first*.
- **Recursing on a huge grid.** A recursive flood fill on a million solid
  land cells needs a million stack frames and throws. Same complexity as the
  explicit stack, worse failure mode.

## 5. The solution, step by step

**Step 1 — guard and measure.**

```js
if (grid.length === 0) return 0;
const rows = grid.length;
const cols = grid[0].length;
```

**Step 2 — the visited grid**, one fresh row per row:

```js
const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
```

**Step 3 — name the four moves.**

```js
const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
```

Four hand-written branches invite a typo you will never spot. A loop over
pairs is shorter, and the fact that no diagonal pairs appear *is* the spec.

**Step 4 — scan.** Two nested loops over every cell, with one skip line:
`if (grid[row][col] !== 1 || visited[row][col]) continue;`

**Step 5 — on a fresh land cell: count, then consume.** `islands++`, mark the
start visited, seed `const stack = [[row, col]]`.

**Step 6 — flood fill.** While the stack has anything: pop `[r, c]`, and for
each `[dr, dc]` in `DIRECTIONS` compute the neighbour, then reject it if it's
out of bounds, if it's water, or if it's visited. Otherwise mark it visited
**and** push it — in that order, in the same breath.

**Step 7 — return `islands`.**

Run the tests: `node --test dsa/27-islands-count/attempt.test.js`.

## 6. Complexity, gently

Let `n` be the number of cells (rows × cols).

**Time O(n).** Three facts that multiply out to a constant per cell: the scan
looks at each cell exactly once; each cell is pushed at most once, because
the push is guarded by the same `visited` flag set at the moment of pushing;
and each pop examines exactly four neighbours.

So the total is roughly `n` scan steps + `n` pushes + `4n` neighbour checks —
about 6n operations. For a 1,000 × 1,000 grid that's a few million steps:
milliseconds. Compare the naive "test every pair of land cells for
connectivity" idea, which is O(n²) *searches*, each itself O(n).

**Space O(n)** for `visited`. The stack is also O(n) in the worst case: a
snaking single island can have most of its cells queued at once. You cannot
get below O(n) space without either mutating the grid (the sinking trick) or
switching to a union-find structure — both trades, not free wins.

## 7. Words you learned

- **Graph / vertex / edge / neighbour** — the general shape that arrays,
  lists, trees and grids are all special cases of.
- **Connected component** — a maximal group of vertices reachable from one
  another. "Island" is just this word wearing a hat.
- **Implicit graph** — one whose edges are computed on demand from the data
  (here, from coordinates) rather than stored anywhere.
- **Flood fill** — starting at one cell and spreading to everything reachable
  from it. The paint-bucket tool in every image editor is this algorithm.
- **Visited set** — the memory that makes a walk terminate on a graph with
  cycles. The single most-forgotten line in graph code.
- **4-connectivity vs 8-connectivity** — whether diagonals count as adjacent.
  A spec decision that silently changes every answer.
- **Cycle** — a route that returns to where it started. Trees have none;
  grids are made of them.

## 8. Variations to try

1. Swap the stack for a **queue** (take from the front with a moving head
   index, dsa/15) so the fill becomes BFS. Confirm every test still passes —
   the visiting *order* changes, the island *count* cannot.
2. Return the **area of the largest island** instead of the count. One extra
   counter inside the fill, one `Math.max` outside it.
3. Do it with **no `visited` grid**, by sinking the island in place — and
   then, to keep the contract, deep-copy the input first. Compare the memory
   costs honestly.
4. Count islands with **8-connectivity** (diagonals included). One line
   changes. Then predict, before running, what the checkerboard test becomes.
5. Read about **union-find** and re-solve: union each land cell with its
   right and down neighbours, then count distinct roots. It's the tool for
   the version where cells get *added* one at a time and you must report the
   count after each addition — something flood fill can't do cheaply.
