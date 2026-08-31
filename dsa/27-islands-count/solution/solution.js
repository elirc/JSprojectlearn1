/**
 * Count islands in a grid of 1s (land) and 0s (water), 4-directionally.
 *
 * 1. Make a `visited` grid the same shape as the input, all false.
 * 2. Scan every cell. Skip water, and skip land you have already absorbed
 *    into an earlier island.
 * 3. The first time you meet a fresh land cell, that is a brand-new island:
 *    add 1 to the counter.
 * 4. Immediately flood-fill outward from it, marking every land cell
 *    reachable by side-by-side steps as visited. The rest of that island is
 *    now invisible to the scan, so it can never be counted twice.
 * 5. Keep scanning.
 *
 * The fill uses an explicit stack of [row, col] pairs rather than recursion,
 * so a 1000x1000 grid of solid land can't overflow the call stack. Swap the
 * stack for a queue (take from the front instead of the back) and it becomes
 * BFS — a different visiting order, the same island count.
 *
 * Time  O(rows * cols): every cell is examined by the scan once, pushed at
 *       most once, and popped at most once.
 * Space O(rows * cols): the visited grid, plus a stack that in the worst
 *       case (all land) holds a constant fraction of the cells.
 *
 * @param {number[][]} grid - rows of cells; 1 is land, 0 is water
 * @returns {number} how many separate islands the grid contains
 */
export function countIslands(grid) {
  if (grid.length === 0) return 0;

  const rows = grid.length;
  const cols = grid[0].length;

  // A parallel grid instead of writing into `grid` itself. Sinking the
  // island in place would be less code and would destroy the caller's data.
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // The four side-by-side moves. No diagonals: [-1,-1] and friends are
  // deliberately absent, which is the whole checkerboard test.
  const DIRECTIONS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  let islands = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Water, or land already swallowed by an island we've counted.
      if (grid[row][col] !== 1 || visited[row][col]) continue;

      // A land cell nobody has reached yet — a new island starts here.
      islands++;

      // Flood fill it away so the scan never trips over it again.
      visited[row][col] = true;
      const stack = [[row, col]];

      while (stack.length > 0) {
        const [currentRow, currentCol] = stack.pop();

        for (const [rowStep, colStep] of DIRECTIONS) {
          const nextRow = currentRow + rowStep;
          const nextCol = currentCol + colStep;

          // Off the edge of the world.
          if (nextRow < 0 || nextRow >= rows) continue;
          if (nextCol < 0 || nextCol >= cols) continue;

          // Water, or somewhere we've already been. The second check is what
          // stops the walk looping forever: unlike a tree (dsa/24), a grid
          // lets you step back where you came from.
          if (grid[nextRow][nextCol] !== 1 || visited[nextRow][nextCol]) continue;

          // Mark on the way IN, not when popped. If you only marked at pop
          // time, the same cell could be pushed once per neighbour that saw
          // it, and the stack could grow far past the number of cells.
          visited[nextRow][nextCol] = true;
          stack.push([nextRow, nextCol]);
        }
      }
    }
  }

  return islands;
}
