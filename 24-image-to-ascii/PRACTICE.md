# 🏋️ Practice: Image to ASCII Art

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Every exercise works on the pure half of the pipeline (brightness grids in, strings out), so you can build and check them without any image: paste code into the browser console (F12) on the refactored page, or copy `luminance` and `asciify` into a scratch `.mjs` file and run it with `node`. Then, if you like, wire them into the page and feed them a real photo.

## Exercises

### ⭐ 1. `brightnessStats` (warm-up)

Write `brightnessStats(grid)` that takes a brightness grid (2D array of numbers 0–1) and returns `{ min, max, mean }`. This is a diagnostic tool: a washed-out photo shows up as a narrow min-to-max range before you ever squint at its ASCII.

What it practices: treating the pipeline's data interface — the plain `brightness[][]` — as something any new tool can consume.

Hint: `grid.flat()` turns the 2D array into one flat list; `Math.min(...values)` spreads it.

Check: `brightnessStats([[0, 0.5, 1], [1, 0.5, 0]])` must return `{ min: 0, max: 1, mean: 0.5 }`.

### ⭐⭐ 2. Auto-contrast: `normalizeGrid` (core)

A dim photo uses only part of the ramp — say brightnesses 0.4 to 0.6 — so the art comes out murky and flat. Write `normalizeGrid(grid)` that stretches the values so the darkest becomes 0 and the brightest becomes 1 (`(b − min) / (max − min)`), returning a NEW grid. If the grid is completely flat (max equals min), return it unchanged rather than dividing by zero.

What it practices: adding an optional stage to a pipeline — possible only because stages hand off plain data.

Hint: reuse `brightnessStats` from exercise 1; the transform is a nested `map`.

Check: `normalizeGrid([[0.25, 0.5, 0.75]])` must give `[[0, 0.5, 1]]`, and with ramp `' .:#'` the grid `[[0.5, 0.6]]` must asciify to `':.'` before normalizing but `'# '` after — full contrast from a murky pair.

### ⭐⭐ 3. ASCII art from pure math: `gridFromFunction` (core)

The README claims the left half of the pipeline is swappable. Prove it with no webcam required: write `gridFromFunction(fn, columns, rows)` that builds a brightness grid by calling `fn(u, v)` at each cell, where u and v run from 0 to 1 across the grid (u = x/(columns−1), v = y/(rows−1)). Feed the result to the untouched `asciify` and you've rendered mathematics instead of a photo.

What it practices: swapping a pipeline source — `asciify` never learns its grid came from a formula, not a canvas.

Hint: two nested loops pushing `fn(u, v)` into rows; guard the division when columns or rows is 1.

Check: `asciify(gridFromFunction((u) => u, 8, 2), ' .:-=+*#')` must be exactly two identical rows of `'#*+=-:. '` — dark to light, left to right. Then try `(u, v) => Math.min(1, Math.hypot(u - 0.5, v - 0.5) * 2)` at 60×30 for a glowing orb.

### ⭐⭐ 4. Pin the ramp's edges with checks (core)

The `Math.min(ramp.length - 1, ...)` guard in `asciify` protects exactly one input: pure black. Extract the mapping into `rampChar(brightness, ramp)` and write runnable checks that pin both boundaries: brightness 1 (pure white) must give the ramp's first character, brightness 0 (pure black) the last. Then delete the `Math.min` guard and watch your black check fail.

What it practices: testing boundary values, and proving a guard earns its place by removing it.

Hint: `console.assert(condition, 'message')` prints an error only when the condition is false — a zero-setup test harness.

Check: with ramp `' .:#'`, `rampChar(1, ...)` must be `' '` and `rampChar(0, ...)` must be `'#'`; without the guard, `rampChar(0, ...)` returns `undefined` (index 4 in a 4-character string) and your assert must fire.

### ⭐⭐⭐ 5. Do the browser's job: `downscale` (challenge)

`sampleGrid` lets `drawImage` average pixels while shrinking. Implement that averaging yourself: `downscale(grid, factor)` splits the grid into `factor × factor` blocks and returns a smaller grid where each cell is its block's average. Drop leftover rows/columns that don't fill a whole block (i.e., output size is `Math.floor(size / factor)`).

What it practices: the index arithmetic behind image sampling — nested loops mapping output cells to input blocks.

Hint: output cell (x, y) averages input cells `grid[y * factor + dy][x * factor + dx]` for dy and dx from 0 to factor−1.

Check: `downscale([[0, 1], [1, 0]], 2)` must be `[[0.5]]`; `downscale([[0, 0, 1, 1], [0, 0, 1, 1]], 2)` must be `[[0, 1]]`; a 4×4 checkerboard downscaled by 2 must be all 0.5s.

## Solutions

### 1. `brightnessStats`

```js
function brightnessStats(grid) {
  const values = grid.flat();
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: total / values.length,
  };
}
brightnessStats([[0, 0.5, 1], [1, 0.5, 0]]); // { min: 0, max: 1, mean: 0.5 }
```

WHY: the whole tool is possible because the pipeline's middle representation is plain numbers — no canvas reads, no pixels, just arrays. Any new consumer of `brightness[][]` (stats, normalizers, histograms) plugs in without touching `sampleGrid` or `asciify`; that's what "data interface" means in practice.

### 2. `normalizeGrid`

```js
function normalizeGrid(grid) {
  const { min, max } = brightnessStats(grid);
  if (max === min) return grid;             // flat grid: nothing to stretch
  return grid.map((row) => row.map((b) => (b - min) / (max - min)));
}
normalizeGrid([[0.25, 0.5, 0.75]]);          // [[0, 0.5, 1]]
asciify([[0.5, 0.6]], ' .:#');               // ':.'  (murky middle characters)
asciify(normalizeGrid([[0.5, 0.6]]), ' .:#'); // '# ' (full-range contrast)
```

WHY: this is a new stage slotted into the middle of the pipeline — `sampleGrid → normalizeGrid → asciify` — and neither neighbor changed, because all three speak `brightness[][]`. The flat-grid guard is the divide-by-zero edge case the happy path hides; returning the input unchanged is a deliberate, documented choice rather than `NaN`s spraying through the art. To make it live, wrap the grid in `update()`: `asciify(normalizeGrid(grid), rampSelect.value)`.

### 3. `gridFromFunction`

```js
function gridFromFunction(fn, columns, rows) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < columns; x++) {
      const u = columns === 1 ? 0 : x / (columns - 1);
      const v = rows === 1 ? 0 : y / (rows - 1);
      row.push(fn(u, v));
    }
    grid.push(row);
  }
  return grid;
}
asciify(gridFromFunction((u) => u, 8, 2), ' .:-=+*#');
// '#*+=-:. '  (twice) — brightness 0 on the left renders dense, 1 on the right renders empty
```

WHY: `asciify` was written knowing "characters but not canvases", so it renders a formula's grid as happily as a photo's — the swappable-left-half claim, demonstrated in twelve lines. This is the same test-without-the-hard-dependency move as project 23's injectable clock: when the interface is plain data, you can manufacture inputs from thin air.

### 4. `rampChar` boundary checks

```js
function rampChar(brightness, ramp) {
  const index = Math.min(ramp.length - 1, Math.floor((1 - brightness) * ramp.length));
  return ramp[index];
}
console.assert(rampChar(1, ' .:#') === ' ', 'white must map to first char');
console.assert(rampChar(0, ' .:#') === '#', 'black must map to last char');

// Now the guard-free version — the black check fires:
function rampCharNoGuard(brightness, ramp) {
  return ramp[Math.floor((1 - brightness) * ramp.length)];
}
rampCharNoGuard(0, ' .:#'); // undefined — (1-0)*4 = index 4, one past the end
console.assert(rampCharNoGuard(0, ' .:#') === '#', 'FIRES: guard was load-bearing');
```

WHY: brightness 0 is the only input where `(1 − b) × ramp.length` reaches the length itself, so the bug hides until a pure-black pixel arrives — and then prints `undefined` into the art instead of crashing, classic plausible garbage. Deleting the guard to watch the check fail is the fastest way to learn what a line is *for*; a check that can't fail guards nothing.

### 5. `downscale`

```js
function downscale(grid, factor) {
  const rows = Math.floor(grid.length / factor);
  const columns = Math.floor(grid[0].length / factor);
  const result = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < columns; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          sum += grid[y * factor + dy][x * factor + dx];
        }
      }
      row.push(sum / (factor * factor));
    }
    result.push(row);
  }
  return result;
}
downscale([[0, 1], [1, 0]], 2);               // [[0.5]]
downscale([[0, 0, 1, 1], [0, 0, 1, 1]], 2);   // [[0, 1]]
```

WHY: this is the averaging `sampleGrid` outsources to `drawImage`, written by hand — every output cell's value is traceable to a block of inputs via the `y * factor + dy` arithmetic, the 2D cousin of the flat array's `(y * width + x) * 4` formula. Chain it after exercise 3 (`downscale(gridFromFunction(...), 2)`) and you have a three-stage pure pipeline where every stage was born in a different exercise — stages compose because they agreed on the data, never on each other.
