# 📘 Learning Guide: Snake

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The classic game **Snake**. Open the page and you see a square play area with a green snake (one square long at first) and a red square of food. The snake moves on its own, one cell at a time, several times per second. You steer with the arrow keys.

- Eat the red food: the snake grows by one square and your score goes up.
- Hit a wall or run into your own body: "GAME OVER! Score: 7".
- In the refactored version: Space pauses, R restarts.

You never click anything — the game runs on a repeating timer, and your keys just change the direction for the *next* movement.

## 2. Concepts you need first

### The `<canvas>` element
Most HTML elements hold text. **`<canvas>`** is different: it's a blank rectangle of pixels that JavaScript draws on, like a tiny paint program.

```js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d"); // the "drawing pen" object
ctx.fillStyle = "#2a2";              // pick a color (greenish)
ctx.fillRect(40, 40, 20, 20);        // filled 20x20 square at x=40, y=40
```

`ctx` (the **context**) is the object with all the drawing methods. Coordinates start at the top-left corner: x grows rightward, y grows *downward*. Colors like `"#c33"` are hex color codes (red-green-blue).

There's no "move" or "erase one shape" — to animate, you repaint the whole canvas every frame: fill the background, then redraw everything in its new place. Done fast enough, it looks like motion.

### `setInterval`: the heartbeat
`setInterval(fn, ms)` runs a function over and over, every ms milliseconds:

```js
let n = 0;
setInterval(() => console.log(n++), 1000); // prints 0, 1, 2... forever
```

A game built on this is said to have a **game loop**: every "tick" (one timer firing), the game advances one step and repaints. Here a tick is 120ms, so the snake moves about 8 times per second.

### Keyboard events
`document.addEventListener("keydown", handler)` runs your handler on every key press. The event object's `.key` says which key: `"ArrowUp"`, `"a"`, `" "` (space).

```js
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") console.log("up!");
});
```

Important timing fact: key presses arrive *between* ticks, whenever the user types. That mismatch — user acts anytime, game advances on a schedule — causes the original's classic bug.

### Representing the snake as data
The snake is an array of `{x, y}` cell coordinates, head first:

```js
const snake = [{ x: 5, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 3 }];
```

The board is a 20×20 grid of cells; a cell is drawn as a 20×20 pixel square, so cell (5, 3) is painted at pixel (100, 60). The direction is a pair like `{x: 1, y: 0}` (moving right): next head = head + direction.

Moving = add a new head at the front, remove the tail. Growing = add a new head, *keep* the tail. That's the whole game.

### Array mutation vs copies
`unshift` and `pop` **mutate** (change the array in place):

```js
const a = [2, 3];
a.unshift(1); // a is now [1, 2, 3]
a.pop();      // a is now [1, 2]
```

The copy-style alternatives build a *new* array and leave the old one alone:

```js
const grown = [head, ...a];          // new head added in front
const moved = [head, ...a.slice(0, -1)]; // new head, tail dropped
```

`...a` (**spread**) pours a's items into the new array; `slice(0, -1)` means "everything except the last item." Objects have spread too: `{ ...state, score: 9 }` copies state but with a new score.

### One state object
Instead of ten separate variables, bundle the whole world into one object:

```js
const state = { snake: [...], direction: {x:1,y:0}, food: {x:15,y:10}, score: 0, status: "running" };
```

Then write one function — call it `step` — that takes the current state and returns the *next* state. The pattern **next = step(current, input)** is how simulations, game engines, and libraries like Redux all work. Once your world is one value, saving it, restoring it, or ignoring a tick (pause) become trivial.

### Small syntax used here
- Destructuring in parameters: `({ x, y }) => x < 0` unpacks the object right in the argument list.
- `key in obj`: true if obj has that property name — used to check "is this key one of the four arrows?"
- `obj[key]`: look up a property by variable — `DIRECTIONS["ArrowUp"]` gives `{x:0, y:-1}`.
- `some`: `snake.some((seg) => ...)` — true if any segment passes the test.
- `Math.floor(Math.random() * 20)`: random whole number 0–19.
- `while (true) { ... return ... }`: loop forever until a `return` breaks out.

## 3. Walking through the original code

**Ten globals.**

```js
var snake = [{ x: 10, y: 10 }];
var dx = 1;  var dy = 0;
var foodX = 15;  var foodY = 10;
var score = 0;  var dead = false;
var changedThisTick = false;
```

The snake, the direction split into two numbers, the food split into two numbers, the score, a death flag, and a mysterious `changedThisTick` (explained below). All of these get written from different places.

**The keyboard handler.**

```js
if (changedThisTick) return;
if (e.key == "ArrowUp" && dy != 1) { dx = 0; dy = -1; changedThisTick = true; }
if (e.key == "ArrowDown" && dy != -1) { dx = 0; dy = 1; changedThisTick = true; }
```

Each arrow key changes `dx`/`dy` immediately — but only if it isn't a 180° reversal (you can't turn Up while moving Down; you'd pass through your own neck). Note the guard is *duplicated per key*, and there's an extra `changedThisTick` gate. That gate is a patch over a real bug — section 4 tells the story.

**The tick.** Every 120ms:

```js
var head = { x: snake[0].x + dx, y: snake[0].y + dy };
if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
  dead = true; ...
```

Compute the next head cell. Off the board? Dead. Then a loop checks whether the head lands on any existing segment — also dead.

```js
snake.unshift(head); // MUTATES the snake...
if (head.x == foodX && head.y == foodY) {
  score = score + 1;
  foodX = Math.floor(Math.random() * 20); // might land ON the snake!
} else {
  snake.pop(); // ...from a second place
}
```

Add the new head. If it's on the food: score up, respawn food at a random cell (no check that the cell is empty!). Otherwise remove the tail — the mutate-then-maybe-unmutate dance: growing is "unshift without pop," moving is "unshift then pop."

Finally the same function draws everything: white background, red food square, green squares for each segment — with pixel math using bare `20`s and `400`s.

## 4. What's wrong with it (in beginner terms)

**1. Ten globals, three writers.** The keyboard handler writes `dx`/`dy`/`changedThisTick`. The interval writes `snake`, `score`, `dead`, `foodX`, `foodY`, `changedThisTick`. Setup writes all of them. Now debug "the snake teleported": which writer did it? Every bug is a whodunit where any line in the file could be the culprit. There is no single place you can look and know the whole state of the game.

**2. The classic two-keypress bug.** Direction changes apply *immediately*. Suppose you're moving Right and quickly press Up then Left within one 120ms tick. Press Up: guard checks "not reversing vertical" — fine, direction is now Up. Press Left: guard checks "not moving Right"... but you *already turned Up*, so Left passes the guard. Direction is now Left — a 180° reversal from your actual movement (Right) — and on the next tick the head steps back into your neck. Instant death, from keys pressed faster than the game ticks. The original patches this with `changedThisTick` ("only one turn per tick"), which works, but it's a flag someone must remember to reset every tick — a **code smell**: a sign the design is fighting itself.

**3. Food can spawn on the snake.** `Math.floor(Math.random() * 20)` twice, no check. With a long snake this happens often: the food appears "inside" the snake, invisible under the body, and the game looks broken.

**4. Rules and drawing tangled, numbers scattered.** The board size lives as `20` in the wall check, `20` in the food spawn, `20` in every draw call, and `400` in the background — all of which must silently agree with `width="400"` in the HTML. Want a 30×30 board? Find every one.

**5. Features are expensive.** Pause? You'd add another flag, checked in the interval and maybe the key handler. Restart? Reset ten globals correctly, everywhere. The README's phrase is exact: when features cost this much, the architecture is wrong.

## 5. Try it yourself first!

1. Vague: could the entire game live in *one* object, changed in *one* place?
2. Define `state = { snake, direction, food, score, status }`. `status` is `'running' | 'paused' | 'dead'` (a phase variable, like project 15).
3. Write `step(state, requestedDirection)` that returns a **new** state: compute the head, check wall/self collision, build the new snake array with spread/slice instead of unshift/pop. Growing vs moving is just "keep the tail or drop it."
4. The input bug: make the key handler do *nothing* except record `requestedDirection = ...`. Apply it (with a single reversal check) *inside* step, once per tick. Ask yourself: can the two-keypress bug even happen now?
5. Food: write `placeFood(snake)` that loops until it picks a cell not on the snake.
6. Put `20`, `20`, `120` in named constants, and make a `DIRECTIONS` object mapping key names to `{x, y}` vectors — that kills the four per-key ifs.
7. The whole loop should end up as: `state = step(state, requestedDirection); render(ctx, state);`

## 6. Understanding the refactored solution

**CONFIG.** `GRID = 20`, `CELL = 20`, `TICK_MS = 120`, and:

```js
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
};
```

Keys-to-vectors as a lookup table — the key handler becomes `if (event.key in DIRECTIONS) requestedDirection = DIRECTIONS[event.key]`. Rules as data, no per-key ifs.

**GAME LOGIC.** `newGame()` builds a fresh state object. `step(state, requestedDirection)` is the heart:

- First line: `if (state.status !== 'running') return state;` — that *is* the pause feature. A paused world's next state is itself.
- Reversal check happens here, once: if the request is the exact opposite of the current direction (`a.x === -b.x && a.y === -b.y`), keep the old direction. Because direction is applied only here — once per tick — two fast keypresses just overwrite the *request*, and only the final one is examined against the direction actually being traveled. The bug isn't guarded against; it is **unrepresentable**. That's the structural fix.
- Collisions: `hitsWall` / `hitsSnake` are tiny named helpers; dying returns `{ ...state, status: 'dead' }` — a copy of the world with one field changed.
- Growth is a data decision, not a mutation dance:

```js
const snake = ate
  ? [head, ...state.snake]               // grow: keep the tail
  : [head, ...state.snake.slice(0, -1)]; // move: drop the tail
```

- `placeFood(snake)` loops random cells until one isn't on the snake — fixing the food-on-snake bug with the same `hitsSnake` helper reused.

Nothing in this section touches the canvas or DOM, and nothing mutates. You could copy this section into Node and unit-test it, exactly like project 16's game.js.

**RENDERING.** `render(ctx, state)` repaints from state: background, food, each segment via `drawCell` (which does the cell-to-pixel math with `CELL`, in one place — note the `CELL - 1` that draws a 1-pixel gap so segments are visible as separate squares). The score line is picked from a label lookup by `state.status`. Render decides nothing.

**GAME LOOP.** The entire mutable world is two variables — `state` and `requestedDirection` — and the loop is two lines:

```js
setInterval(() => {
  state = step(state, requestedDirection);
  render(ctx, state);
}, TICK_MS);
```

The key handler shows how cheap features became: Space flips `status` between paused/running (a 3-line ternary chain); R does `state = newGame()`. No globals to audit — a fresh world is just a fresh object.

## 7. Words you learned (glossary)

- **Canvas**: an HTML element that JavaScript draws pixels onto.
- **Context (`ctx`)**: the object holding the canvas's drawing methods.
- **`fillRect` / `fillStyle`**: draw a filled rectangle / set the current color.
- **Game loop / tick**: a timer that repeatedly advances and repaints the game; one firing is a tick.
- **`setInterval`**: run a function every N milliseconds.
- **`keydown` / `event.key`**: keyboard event / which key was pressed.
- **Global variable**: a variable every function can read and write — powerful, dangerous.
- **Mutation**: changing an array/object in place (`unshift`, `pop`).
- **Immutable update**: building a changed copy instead (`[head, ...snake]`, `{...state, score: 1}`).
- **Spread (`...`)**: pours an array's items (or object's fields) into a new one.
- **`slice(0, -1)`**: copy of an array without its last item.
- **State object**: one object holding the entire world of the program.
- **Transition function**: `step(state, input) -> newState`; the only place change happens.
- **Status / phase**: one variable, one named mode: running, paused, dead.
- **Code smell**: code that works but whose shape hints at a design problem (like `changedThisTick`).
- **Unrepresentable bug**: a bug the design makes impossible, not merely checked-for.
- **Lookup table**: an object used as a map from names to values (`DIRECTIONS`).
- **Destructuring**: unpacking `{x, y}` straight into variables, even in parameters.
- **`some`**: true if any array item passes a test.

## 8. Experiments to try on the plane (no internet needed)

1. **Resize the world**: in the refactored CONFIG, set `GRID = 10` and `CELL = 40`. Expected: a chunky 10×10 game that still fills the 400px canvas perfectly, because every pixel and wall computation derives from the two constants. Count how many `20`s you'd have to hunt down in the original.
2. **Speed ramp**: make `TICK_MS` smaller (say 70). Expected: a faster, harder game — one number. Bonus: can you see why speeding up *as you eat* would be awkward with `setInterval`? (Hint: the interval is fixed at start. A fix: `clearInterval` + new interval on each food, or a `setTimeout` chain.)
3. **Trigger the original's bug — then fail to trigger it in the refactor**: in original.html, temporarily delete the line `if (changedThisTick) return;`. Move right, then quickly tap Up, Left. Expected: instant self-collision death. Now try the same key-mashing in the refactored version: the snake just turns sensibly, because only one request per tick is ever applied.
4. **Add WASD controls**: in the refactored `DIRECTIONS` object add `w: { x: 0, y: -1 }`, `s: { x: 0, y: 1 }`, `a: { x: -1, y: 0 }`, `d: { x: 1, y: 0 }`. Expected: WASD steering works immediately — zero new ifs, because keys are data. (Keys arrive lowercase, so plain `w` works.)
5. **Instant replay (the immutability payoff)**: in the game loop, push each `state` into a `history` array. On game over (`state.status === 'dead'`), replay by rendering `history[i]` every 60ms with an interval. Expected: a working replay of your whole game in ~10 lines — possible only because every tick's state is a separate, untouched object.
