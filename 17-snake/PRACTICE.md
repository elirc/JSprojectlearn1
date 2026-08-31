# 🏋️ Practice: Snake

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

**Setup for all exercises:** create a new file `snake-practice.mjs` in this folder. Copy the CONFIG and GAME LOGIC sections out of `refactored/index.html` into it — everything from `const GRID` down to the end of `placeFood`, no canvas or DOM code. Add your checks at the bottom with `import assert from 'node:assert/strict';` and run `node snake-practice.mjs`. Leave `refactored/index.html` untouched; your `.mjs` copy is your playground.

## Exercises

### ⭐ 1. Prove the brain runs without a browser (warm-up)
LEARN.md claims the game logic could run in Node because it never touches the DOM. Prove it: build a state object by hand (a 1-long snake at (10,10) moving right, food parked at (0,0) so nothing gets eaten), call `step` once, and assert two things — the new head is at (11,10), and the **old** state object still has its snake at (10,10).
What it practices: state as plain data, and checking that `step` really is non-mutating.
Hint: don't use `newGame()` here — its food placement is random. Write the state literal yourself so every field is known.

### ⭐⭐ 2. Wrap-around walls (core)
Make a variant `stepWrap` where the snake never dies at a wall — it comes out the opposite side, like classic arcade snake. Off the right edge at x=19 means reappearing at x=0; going up from y=0 means reappearing at y=19. Self-collision should still kill. Check: a snake at `{x:19, y:5}` moving right steps to `{x:0, y:5}` with status still `'running'`, and one at `{x:4, y:0}` moving up steps to `{x:4, y:19}`.
What it practices: the double-modulo wrap idiom (from projects 04 and 19) applied inside a transition function.
Hint: `((n % GRID) + GRID) % GRID` handles both `20 → 0` and `-1 → 19`. Wrap the head's coordinates, then delete the wall check.

### ⭐⭐ 3. Test `placeFood` with a rigged random (core)
`placeFood` can't be tested — `Math.random` gives different food every run. Fix that with dependency injection: change it to `placeFood(snake, random = Math.random)` so normal callers change nothing, but a test can pass a fake. Then write the test: with a snake occupying `{x:0, y:0}` and a fake random that returns `0, 0, 0.5, 0.5` (one value per call), the first candidate cell (0,0) collides, so the result must be `{x:10, y:10}`.
What it practices: making randomness injectable so "loops until it finds a free cell" becomes a provable fact instead of a hope.
Hint: `const seq = [0, 0, 0.5, 0.5]; const fakeRandom = () => seq.shift();`

### ⭐⭐ 4. A best score that survives restarts (core)
Add a `bestScore` field to the state. When the snake dies, `step` should record `Math.max` of the old best and the final score; `newGame(bestScore = 0)` should carry it into the next round while `score` resets to 0. Check: a snake at `{x:19, y:10}` moving right with `score: 3, bestScore: 0` dies on the next step with `bestScore: 3`, and `newGame(3)` starts with `score: 0, bestScore: 3`.
What it practices: growing the single state object — one new field, changed in exactly one place, instead of an eleventh global.
Hint: only two lines change: the death branch's return object, and `newGame`'s signature.

### ⭐⭐⭐ 5. Winning the game (challenge)
Nobody has ever asked: what happens when the snake fills the *entire board*? Trace it: the snake eats, `placeFood` runs, and the `while (true)` loop spins forever — every cell is snake. Fix it by adding a `'won'` status: if a bite makes the snake cover every cell, return a won state and never call `placeFood`. To test it offline, let the board size come from the state (`const grid = state.grid ?? GRID;` and pass `grid` into the wall check and `placeFood`), then check on a 2×2 board: snake `[{x:0,y:1},{x:1,y:1},{x:1,y:0}]` moving up onto food at `{x:0,y:0}` must return `status: 'won'` and `score` one higher — and the test must finish instantly (without the fix, it hangs forever).
What it practices: hunting an uncovered edge case (an infinite loop, not a crash) and making a config value testable by moving it into state.
Hint: do the win check *after* building the new snake but *before* the return that calls `placeFood`. Full board means `snake.length === grid * grid`.

## Solutions

### 1. Prove the brain runs without a browser
```js
const state = {
  snake: [{ x: 10, y: 10 }], direction: { x: 1, y: 0 },
  food: { x: 0, y: 0 }, score: 0, status: 'running',
};
const next = step(state, state.direction);
assert.deepEqual(next.snake, [{ x: 11, y: 10 }]);
assert.deepEqual(state.snake, [{ x: 10, y: 10 }]); // old world untouched
console.log('ok');
```
**Why:** this is the project's core promise made executable — `step` is a pure data transformation, so it runs anywhere, and the old state survives because spread/slice build copies. If someone later sneaks an `unshift` back in, the second assert fails.

### 2. Wrap-around walls
```js
function stepWrap(state, requestedDirection) {
  if (state.status !== 'running') return state;
  const direction = isReversal(requestedDirection, state.direction)
    ? state.direction : requestedDirection;
  const wrap = (n) => ((n % GRID) + GRID) % GRID;
  const head = {
    x: wrap(state.snake[0].x + direction.x),
    y: wrap(state.snake[0].y + direction.y),
  };
  if (hitsSnake(head, state.snake)) return { ...state, direction, status: 'dead' };
  const ate = head.x === state.food.x && head.y === state.food.y;
  const snake = ate ? [head, ...state.snake] : [head, ...state.snake.slice(0, -1)];
  return { ...state, snake, direction,
           food: ate ? placeFood(snake) : state.food,
           score: ate ? state.score + 1 : state.score };
}

const right = { snake: [{ x: 19, y: 5 }], direction: { x: 1, y: 0 },
                food: { x: 3, y: 3 }, score: 0, status: 'running' };
assert.deepEqual(stepWrap(right, right.direction).snake, [{ x: 0, y: 5 }]);
const up = { snake: [{ x: 4, y: 0 }], direction: { x: 0, y: -1 },
             food: { x: 3, y: 3 }, score: 0, status: 'running' };
assert.deepEqual(stepWrap(up, up.direction).snake, [{ x: 4, y: 19 }]);
```
**Why:** a whole rule change ("walls kill") lives in one function, so changing the rule is local: wrap the head, drop `hitsWall`. The double-modulo handles the `-1` case that a plain `% GRID` would get wrong — the same negative-remainder trap as hue angles in project 19.

### 3. Test `placeFood` with a rigged random
```js
function placeFood(snake, random = Math.random) {
  while (true) {
    const food = {
      x: Math.floor(random() * GRID),
      y: Math.floor(random() * GRID),
    };
    if (!hitsSnake(food, snake)) return food;
  }
}

const seq = [0, 0, 0.5, 0.5];
const fakeRandom = () => seq.shift();
assert.deepEqual(placeFood([{ x: 0, y: 0 }], fakeRandom), { x: 10, y: 10 });
```
**Why:** the default parameter means the game code doesn't change at all, but tests can now *force* the collision path and prove the retry loop works. Hidden dependencies (`Math.random`, `Date.now`) are what make functions untestable; passing them in is the standard cure.

### 4. A best score that survives restarts
```js
// in newGame:
function newGame(bestScore = 0) {
  const snake = [{ x: 10, y: 10 }];
  return { snake, direction: { x: 1, y: 0 }, food: placeFood(snake),
           score: 0, status: 'running', bestScore };
}
// in step's death branch:
  if (hitsWall(head) || hitsSnake(head, state.snake)) {
    return { ...state, direction, status: 'dead',
             bestScore: Math.max(state.bestScore ?? 0, state.score) };
  }
// checks:
let s = { snake: [{ x: 19, y: 10 }], direction: { x: 1, y: 0 },
          food: { x: 0, y: 0 }, score: 3, status: 'running', bestScore: 0 };
s = step(s, s.direction);
assert.equal(s.status, 'dead');
assert.equal(s.bestScore, 3);
const fresh = newGame(s.bestScore);
assert.equal(fresh.score, 0);
assert.equal(fresh.bestScore, 3);
```
**Why:** in the original you'd need an eleventh global and a hunt through every writer; here the feature is one field in the state object, written in the one place deaths happen. In the real game the restart key would just call `newGame(Math.max(state.bestScore, state.score))` — and `render` could show it, deciding nothing.

### 5. Winning the game
```js
const hitsWall = ({ x, y }, grid) => x < 0 || x >= grid || y < 0 || y >= grid;

function step(state, requestedDirection) {
  if (state.status !== 'running') return state;
  const grid = state.grid ?? GRID;
  const direction = isReversal(requestedDirection, state.direction)
    ? state.direction : requestedDirection;
  const head = { x: state.snake[0].x + direction.x,
                 y: state.snake[0].y + direction.y };
  if (hitsWall(head, grid) || hitsSnake(head, state.snake)) {
    return { ...state, direction, status: 'dead' };
  }
  const ate = head.x === state.food.x && head.y === state.food.y;
  const snake = ate ? [head, ...state.snake] : [head, ...state.snake.slice(0, -1)];
  if (ate && snake.length === grid * grid) {   // board is full: you win
    return { ...state, snake, direction, score: state.score + 1, status: 'won' };
  }
  return { ...state, snake, direction,
           food: ate ? placeFood(snake, grid) : state.food,
           score: ate ? state.score + 1 : state.score };
}
// placeFood takes grid too: placeFood(snake, grid = GRID, random = Math.random)

const full = {
  grid: 2,
  snake: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }],
  direction: { x: 0, y: -1 }, food: { x: 0, y: 0 },
  score: 2, status: 'running',
};
const won = step(full, { x: 0, y: -1 });
assert.equal(won.status, 'won');
assert.equal(won.score, 3);
assert.equal(won.snake.length, 4);
console.log('you win — and placeFood was never called');
```
**Why:** the bug was invisible because no test (and no human player) ever filled the board — an edge case hiding inside a `while (true)`. The win check must sit *before* the `placeFood` call, which is exactly the kind of ordering fact a test pins down. Moving the board size into state is the same trick as exercise 3: turn a baked-in constant into an input, and impossible-to-reach situations become a five-line test.
