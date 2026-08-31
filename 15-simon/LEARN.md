# 📘 Learning Guide: Simon

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The memory game **Simon**. The page shows four colored squares (pads): green, red, yellow, blue. When you press Start:

1. The computer flashes a random pad — say, blue lights up briefly.
2. You click blue. Correct! The computer now flashes blue, then red.
3. You click blue, then red. Each round adds one more color to the sequence.
4. Click the wrong pad and it's game over: "Wrong! You reached round 5. Press Start."

The status line above the pads always tells you whose turn it is: "Watch..." while the computer plays, "Your turn!" when it's listening for your clicks.

The interesting part of this project isn't the rules — it's the *timing*. Flashing pads one after another, with pauses, is where the original code gets ugly.

## 2. Concepts you need first

### DOM basics: elements, ids, and finding them
The page is made of **elements** (`<div>`, `<button>`, `<p>`). The browser turns them into a live tree called the **DOM** that JavaScript can change. Elements with `id="green"` can be grabbed:

```js
const pad = document.getElementById("green");
pad.textContent = "hi"; // page updates immediately
```

### CSS classes, and `classList`
CSS rules style elements. A **class** is a label CSS targets: here `.pad { opacity: 0.5 }` makes pads dim, and `.pad.lit { opacity: 1 }` makes a pad with *both* classes fully bright. So "lighting up" a pad is just adding the `lit` label. Two ways to do it:

```js
pad.className = "pad lit";   // replace ALL classes (old style)
pad.classList.add("lit");    // add just one label (better)
pad.classList.remove("lit"); // remove just that one
```

### Click handlers
A **handler** is a function that runs when an event (like a click) happens:

```js
document.getElementById("startButton").onclick = () => start();
```

The original attaches handlers in the HTML itself (`onclick="padClick('green')"`); the refactor attaches them from JavaScript. Same effect, tidier.

### `setTimeout`: run code later
`setTimeout(fn, ms)` says "run this function after ms milliseconds" — and *immediately keeps going*. It does not pause:

```js
console.log("A");
setTimeout(() => console.log("B"), 1000);
console.log("C");
// prints: A, C, then (a second later) B
```

This "keep going, come back later" style is called **asynchronous** (async) code. The function you hand to setTimeout is a **callback** — a function passed to be called later.

### Callback nesting (the "pyramid")
To do things in *sequence* with setTimeout, you nest: "after 400ms do X, and inside that, after 300ms do Y..." Three steps deep, the code drifts rightward into a pyramid shape and the order of events becomes hard to read. This project exists to show you the cure.

### Promises
A **Promise** is an object that represents "a value or event that isn't here yet." It starts *pending* and later *resolves* (finishes). You can build one yourself:

```js
const wait1s = new Promise((resolve) => setTimeout(resolve, 1000));
```

This promise resolves after one second — it's a timer wearing a Promise costume. Why bother? Because of what comes next.

### `async` / `await`: pause inside a function
Mark a function `async` and it may use `await`, which means "pause *this function* here until the promise resolves, then continue." The rest of the page stays responsive — only this function waits.

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function demo() {
  console.log("A");
  await sleep(1000); // pause 1 second
  console.log("B");  // then this runs
}
demo();
```

That prints A, then B a second later — written top to bottom like normal code. `sleep` is the one-line bridge between the setTimeout world and the async world. Also: calling an async function *without* `await` starts it and moves on immediately — sometimes that's exactly what you want.

### `Math.random` and picking a random item
`Math.random()` gives a random decimal from 0 up to (not including) 1. `Math.floor` chops off the decimals. Together they pick a random array index:

```js
const colors = ["green", "red", "yellow", "blue"];
const pick = colors[Math.floor(Math.random() * colors.length)];
console.log(pick); // one of the four, at random
```

### Booleans, flags, and the `var`-in-loop trap
A **flag** is a boolean variable used as a gate: `accepting = true` means "clicks count now." Flags work — until several pieces of code all have to set them correctly.

One historical trap you'll see in the original: variables declared with `var` inside a loop are *shared* across all the loop's callbacks:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 10);
}
// prints 3, 3, 3 — not 0, 1, 2!
```

By the time the callbacks run, the loop is over and `i` is 3. The old workaround wraps the body in an immediately-called function — an **IIFE** ("immediately invoked function expression") — to copy `i`. The modern fix is simply `let i`, which gives each loop pass its own `i` and prints 0, 1, 2.

## 3. Walking through the original code

**Setup.** Four global variables: the color list, the growing `sequence` array, `playerIndex` (which step of the sequence the player is on), and `accepting` — the flag guarding clicks. Note the author's own comment: "did we remember to flip this everywhere? hope so".

**Starting a round.**

```js
function nextRound() {
  playerIndex = 0;
  accepting = false;
  sequence.push(colors[Math.floor(Math.random() * 4)]);
```

Reset the player's progress, close the click gate, add one random color to the sequence.

**The scheduling pyramid.** This is the heart of the lesson:

```js
for (var i = 0; i < sequence.length; i++) {
  (function (i) {
    setTimeout(function () {
      pad.className = "pad lit";
      setTimeout(function () {
        pad.className = "pad";
        if (i == sequence.length - 1) {
          setTimeout(function () { accepting = true; ... }, 250);
        }
      }, 400);
    }, i * 700);
  })(i);
}
```

Instead of "flash, wait, flash, wait...", it schedules *every* flash up front: flash number i starts at `i * 700` milliseconds. Each flash turns the pad on, then a nested timeout turns it off 400ms later. And the "now it's your turn" step is buried in the deepest timeout, guarded by "am I the last flash?" The `(function (i) { ... })(i)` wrapper is the IIFE workaround for the `var` trap from section 2 — without it, every timeout would flash the same (last) pad.

**Handling clicks.**

```js
function padClick(color) {
  if (!accepting) return;
  ...
  if (color == sequence[playerIndex]) {
    playerIndex++;
    if (playerIndex == sequence.length) {
      accepting = false;
      setTimeout(nextRound, 900);
```

Ignore clicks when the gate is closed. Flash the clicked pad for feedback. Right color: advance; if that finished the sequence, close the gate and schedule the next round. Wrong color: close the gate, print the game-over message.

## 4. What's wrong with it (in beginner terms)

**1. The timing math is hand-compiled.** Where does `700` come from? It's secretly `400 (flash) + 300 (gap)` — but no code says so. Here's how it bites you: you decide flashes should last 600ms. You change `400` to `600`... and the pads now overlap, because flash i+1 starts at `i * 700`, only 100ms after flash i ends... wait, no — actually flash i is still *on*. You stare at three numbers (`700`, `400`, `250`) spread across nested callbacks, trying to re-derive their relationship. Every timing tweak means redoing arithmetic the computer should be doing.

**2. "What happens next" is buried.** After the sequence finishes, the game should accept input. That step — the *next line of the story* — lives three callbacks deep, inside a loop, behind `if (i == sequence.length - 1)`. To read the game's flow, your eyes have to jump around the pyramid. Sequential intent, scattered into fragments.

**3. Flag soup begins.** `accepting` is flipped in five places. Add a "Replay sequence" button: it must set `accepting = false`, replay, then `true` — but only if the game isn't over... so you add a `gameOver` flag too. Two booleans make four combinations, and some combinations (accepting AND gameOver?) are nonsense states your code can still accidentally reach. Each new flag doubles the ways to be wrong.

**4. The IIFE.** It's not a bug — it's a workaround for the `var` trap that modern `let` makes unnecessary. Code full of workarounds is code that's hard to trust.

## 5. Try it yourself first!

Try rewriting `nextRound`'s flashing loop before reading the solution:

1. Vague: could the code *wait* between flashes instead of pre-scheduling everything?
2. Write the helper: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));` Now any `async` function can `await sleep(300)`.
3. Write `async function flash(color)`: add the `lit` class, `await sleep(400)`, remove it.
4. Now the whole show is: `for (const color of sequence) { await flash(color); await sleep(300); }` — and the "your turn" code goes *after* the loop, on its own line.
5. For the flags: replace `accepting` with one variable `phase` that is always exactly one of `'idle'`, `'showing'`, `'listening'`, `'gameover'`. The click handler starts with `if (phase !== 'listening') return;`.
6. Gather 400, 300, 250, 900 into one object named `TIMING` so the numbers have names and live together.

## 6. Understanding the refactored solution

**`TIMING`.** All four durations in one labeled object:

```js
const TIMING = { flash: 400, gap: 300, beforeInput: 250, betweenRounds: 900 };
```

No `700` anywhere — the loop *derives* the rhythm (flash, then gap) instead of pre-computing start times. Change `flash` to 600 and everything else adjusts automatically.

**`sleep` and `flash`.** `sleep` is the promise-wrapped setTimeout from section 2. `flash` is an async function: light the pad, await the flash duration, unlight it. Because `flash` is async, callers can `await` it — or not.

**`playSequence` reads like the rules.**

```js
phase = 'showing';
for (const color of sequence) {
  await flash(color);
  await sleep(TIMING.gap);
}
await sleep(TIMING.beforeInput);
phase = 'listening';
```

Compare this to the pyramid. Same behavior, but now it's a straight line you can read aloud: "for each color, flash it, pause; then a beat; then it's your turn." The "what happens next" appears *after* the loop, exactly where the story says it should.

**The `phase` variable — a baby state machine.** A **state machine** is a design where a system is always in exactly *one* named state, and code checks or changes that state explicitly. Here `phase` is always one of `idle | showing | listening | gameover`. The click handler needs just one guard: `if (phase !== 'listening') return;`. You physically cannot be "showing" and "listening" at once, because one variable can't hold two values. That's the cure for flag soup: instead of N booleans with 2^N combinations (mostly nonsense), one variable with exactly the meaningful values.

**The subtle line.** In `handlePadClick`:

```js
flash(color); // deliberately not awaited
```

When you click, the game flashes your pad as feedback *and* checks correctness. If it awaited the flash, the check (and a possible "Wrong!") would lag 400ms behind your click. By not awaiting, the flash runs in the background while the check happens instantly. Async gives you the choice — wait or don't — and the comment records that this was a choice, not an accident.

**Wiring.** No `onclick="..."` in the HTML; a small loop attaches a handler to each pad. Notice `for (const color of COLORS)` — with `const`, each pass gets its own `color`, so no IIFE is needed. The trap the original worked around simply doesn't exist here.

## 7. Words you learned (glossary)

- **DOM**: the browser's live tree of page elements that JavaScript can modify.
- **Handler**: a function that runs in response to an event (click, keypress).
- **CSS class / `classList`**: a style label on an element / the API to add/remove one label at a time.
- **Millisecond (ms)**: 1/1000 of a second; 400ms is a bit under half a second.
- **`setTimeout`**: schedule a function to run later; does not pause the program.
- **Asynchronous (async)**: code that starts something and continues without waiting.
- **Callback**: a function you hand over to be called later.
- **Callback pyramid**: deeply nested callbacks that drift rightward and scramble reading order.
- **Promise**: an object representing a result/event that will arrive later.
- **Resolve**: what a promise does when it finishes.
- **`async function` / `await`**: a function that can pause at `await` until a promise resolves.
- **`sleep(ms)`**: a promise that resolves after ms — makes "wait" a single awaitable line.
- **Flag**: a boolean variable used as a gate ("accepting input right now?").
- **State machine**: a design where the system is always in exactly one named state.
- **Phase**: this game's state variable: idle, showing, listening, or gameover.
- **IIFE**: a function defined and called immediately, `(function(x){...})(x)` — here, an old workaround for the `var` loop trap.
- **`var` loop trap**: `var` loop variables are shared by all callbacks; `let` gives each pass its own.
- **`Math.random()` / `Math.floor()`**: random decimal in [0,1) / round down — combined, they pick a random array index.

## 8. Experiments to try on the plane (no internet needed)

1. **Speed up the game**: in the refactored `TIMING`, change `flash: 400` to `150` and `gap: 300` to `100`. Expected: a snappy, harder game — and nothing overlaps or breaks. Then try making the equivalent change in original.html (you must touch `400`, re-derive `700`, and think about `250`).
2. **Watch the phase live**: in the refactored file, add `document.title = phase;` inside `setStatus` (or right after each `phase =` line). Expected: the browser tab's title tracks idle → showing → listening as you play.
3. **See the un-awaited flash matter**: change `flash(color);` in `handlePadClick` to `await flash(color);`. Expected: after each click, the "Good!"/"Wrong!" reaction feels delayed by the flash time. Put it back and feel the difference.
4. **Prove the phase guard works**: while the computer is showing the sequence, click pads like mad. Expected: nothing happens — one `if (phase !== 'listening')` line is doing all the gatekeeping.
5. **Reproduce the `var` trap in isolation**: in the browser console (F12 opens developer tools, no internet needed), run `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 10);` then the same with `let`. Expected: `3 3 3` versus `0 1 2`.
