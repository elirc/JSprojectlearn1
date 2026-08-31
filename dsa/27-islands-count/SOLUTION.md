# Solution walkthrough — Count Islands

## The naive approach and its cost

The instinct people usually have first is to count *land cells* and then try
to subtract the joins: "there are 9 ones, and 7 of them touch another one, so…"
This never survives contact with a real grid. Blobs merge, rings close on
themselves, and there is no arithmetic that turns "how much land" into "how
many pieces of land."

The second instinct is closer and still wrong: for every pair of land cells,
decide whether they're connected, then group. That's genuinely a valid
algorithm — it's what a union-find structure does efficiently — but written
naively it's O(cells²) reachability tests, each of which is itself a search.
On a 60×60 grid that's 12 million searches to answer a question that needs
3,600 cell visits.

The insight both attempts are missing: you don't have to *compare* anything.

## The insight

**Count the islands by destroying them.**

Walk the grid cell by cell. When you meet a land cell that no previous walk
has reached, you have just discovered a new island — because if it belonged
to an island you'd already counted, you would have reached it while counting
that one. So:

1. add 1 to the counter, then
2. immediately mark **every** cell of that island as visited, by walking
   outward from where you're standing.

After the flood fill, the rest of that island is invisible to the scan. The
outer loop can only ever discover *first* cells, and there is exactly one
first cell per island. That's why the count comes out right without any
merging logic at all.

The walk itself is dsa/24's depth-first search with two adjustments:

- **Neighbours are computed, not stored.** A tree node hands you `left` and
  `right`. A grid cell hands you nothing — you derive `(r±1, c)` and
  `(r, c±1)` and check they're in bounds.
- **You must remember where you've been.** A tree has no cycles, so DFS can't
  revisit anything. A grid is full of cycles — step right, then left, and
  you're home. Without a `visited` grid, the walk never terminates.

## The approach, step by step

1. **Guard the empty grid.** `if (grid.length === 0) return 0;` — otherwise
   `grid[0].length` throws.
2. **Build `visited`**, the same shape as `grid`, all `false`.
   `Array.from({ length: rows }, () => new Array(cols).fill(false))`. Note
   the arrow function: `new Array(rows).fill(new Array(cols).fill(false))`
   gives every row *the same array object*, and marking one cell appears to
   mark a whole column. That bug is a rite of passage.
3. **Name the four moves once**, as a `DIRECTIONS` array of `[dr, dc]` pairs.
   Writing the four branches by hand invites a typo you'll never find; the
   loop over pairs is shorter and self-documenting. And the absence of the
   four diagonal pairs is the spec, made visible.
4. **Scan every cell.** `if (grid[r][c] !== 1 || visited[r][c]) continue;`
5. **On a fresh land cell: count it, then consume the island.** Increment,
   mark the starting cell visited, seed a stack with `[r, c]`.
6. **The fill loop.** While the stack is non-empty: pop a cell, and for each
   of the four neighbours — reject out-of-bounds, reject water, reject
   already-visited — **mark it visited and push it**.
7. **Return the counter.**

The one subtle line is step 6's ordering: mark at push time, not at pop time.
If you mark when popping, a cell with three land neighbours gets pushed three
times before anyone processes it. The count still comes out right, but the
stack can balloon and you re-examine cells for no reason.

## Complexity

- **Time O(rows × cols).** The outer scan touches each cell once. Each cell
  is pushed onto a stack at most once, because pushing is guarded by the
  `visited` check that is set in the same breath. Each pop looks at four
  neighbours — a constant. So the total is a constant number of operations
  per cell. On a 60 × 60 grid: about 3,600 cell visits plus 14,400 neighbour
  checks. Instant.
- **Space O(rows × cols).** The `visited` grid is the honest cost. The stack
  adds more: in the worst case (one solid island shaped like a snake) it can
  hold a large fraction of the cells at once, which is still O(rows × cols).
- **Why an explicit stack rather than recursion?** Same complexity, different
  failure mode. A recursive fill on a 1000 × 1000 grid of solid land needs a
  million nested frames and throws `RangeError: Maximum call stack size
  exceeded`. Your own array on the heap has no such limit.

## Common mistakes

- **Sinking the island in place** — setting `grid[r][c] = 0` instead of using
  a `visited` grid. It is shorter, it is what half the internet does, and it
  silently vandalises the caller's data. The "grid is not modified" test
  catches it. (If you own the grid and don't mind, it's a legitimate O(1)-
  extra-space trick — just never do it to someone else's array.)
- **`new Array(rows).fill(new Array(cols).fill(false))`.** All rows are the
  same array. Use `Array.from({ length: rows }, () => ...)`.
- **Forgetting the visited check inside the fill.** The walk then bounces
  between two adjacent cells forever.
- **Marking visited at pop time instead of push time.** Correct answer,
  bloated stack, wasted work.
- **Including diagonals.** Eight directions makes the checkerboard test
  report 1 island instead of 13. Re-read the spec, not the code.
- **Bounds checks after the array access.** `grid[nextRow][nextCol]` with
  `nextRow === rows` throws before your `if` ever runs — in JS `grid[rows]`
  is `undefined` and indexing it is a `TypeError`. Check bounds first.
- **Counting inside the fill.** The counter belongs to the *discovery*, not
  the walk; incrementing per cell gives you the land area instead.
