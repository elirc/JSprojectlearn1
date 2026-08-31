# 🏋️ Practice: Simon

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

`sleep` and async/await work exactly the same in node as in the browser, so several of these can be built and checked with `node file.js` — no browser required.

## Exercises

### ⭐ 1. Countdown with sleep (warm-up)

In a new node file, copy the one-line `sleep` helper from the refactor and write `async function countdown(n)` that prints `n`, then `n-1`, ... then `1`, then `Go!`, with 300ms between prints. Call it with `countdown(3)`.

What it practices: the sleep-in-a-loop pattern — straight-line async code where the original would need scheduled `setTimeout(i * 300)` calls.

Hint: a normal `for` loop with `await sleep(300)` inside. No timeout math anywhere.

Check: `node countdown.js` prints `3 2 1 Go!` on separate lines, visibly paced — and the numbers arrive in order every time.

### ⭐⭐ 2. Best score, remembered (core)

Track the best round ever reached. Load it from `localStorage` at startup; on game over, update it if beaten and show it: `Wrong! You reached round 6. Best: 9. Press Start.`

What it practices: a small piece of persistent state alongside the phase machine (the same localStorage idea as project 14).

Hint: `Number(localStorage.getItem('simon-best')) || 0` handles the "nothing saved yet" case, because `Number(null)` is 0.

Check: lose at round 3 → "Best: 3". Lose at round 2 → still "Best: 3". Close the tab, reopen — the best survives.

### ⭐⭐ 3. A Replay button (core)

Add a "Replay" button that re-plays the current sequence when you've forgotten it — but **only** during the player's turn. Replaying restarts your input from the beginning of the sequence (state that in the status line if you like). During `showing`, `idle`, and `gameover` the button must do nothing.

What it practices: the phase machine earning its keep — the README names "replay button" as exactly the feature that turns boolean flags into soup, yet here it's a guard plus one call.

Hint: `playSequence()` already does everything: sets phase to `showing`, replays, resets `playerIndex`, returns to `listening`. You need one `if` and one `await`.

Check: mid-turn, click Replay — the sequence re-flashes and clicks during it are ignored. Click Replay while the computer is showing — nothing happens.

### ⭐⭐ 4. Speed ramp (core)

Make the game speed up as rounds progress. Add `fastestFlash: 150` and `rampStep: 25` to `TIMING`, and write a pure function `flashMs(round)` returning the flash duration for that round: starts at `TIMING.flash`, loses `rampStep` per round, never below `fastestFlash`. Use it in `flash()` (pass the duration in, or read `sequence.length` inside).

What it practices: deriving timing from named numbers in one place — the TIMING lesson, extended from constants to a rule.

Hint: `Math.max(floor, start - step * (round - 1))`.

Check (in node, with the TIMING object pasted in): `flashMs(1)` → 400, `flashMs(2)` → 375, `flashMs(11)` → 150, `flashMs(30)` → 150. In the browser, round 8+ feels noticeably snappier.

### ⭐⭐⭐ 5. Game-over flash — all pads at once (challenge)

On a wrong click, flash **all four pads simultaneously**, twice, before showing the game-over message. All four must light together and go dark together — not one after another.

What it practices: `Promise.all` — running several awaitable things in parallel and waiting for the whole batch, versus the loop-with-await pattern that runs them one by one.

Hint: `flash(color)` already returns a promise. `COLORS.map(flash)` starts four flashes; `Promise.all(...)` waits for all four.

Check: wrong click → both blinks together take under a second total. If your version takes ~3+ seconds with pads lighting left-to-right, you awaited them sequentially.

### ⭐⭐⭐ 6. Extract the rule, test it in node (challenge)

`handlePadClick` mixes a pure rule (was that click right? did it finish the round?) with effects (flashing, status, sleeping). Extract the rule into `checkGuess(sequence, playerIndex, color)` returning exactly one of `'wrong'`, `'continue'`, `'round-complete'`. Rewrite `handlePadClick` to switch on the result, and write a node test file for `checkGuess` covering all three outcomes plus a length-1 sequence.

What it practices: separating rules from effects so game logic becomes unit-testable — the exact move project 16 builds on.

Hint: `'round-complete'` when the guess is right *and* `playerIndex + 1 === sequence.length`.

Check: your test passes with the implementation above and fails if you change `playerIndex + 1` to `playerIndex` (an off-by-one that would end rounds a click early).

## Solutions

### 1. Countdown with sleep

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function countdown(n) {
  for (let i = n; i >= 1; i--) {
    console.log(i);
    await sleep(300);
  }
  console.log('Go!');
}

countdown(3);
```

WHY: this is `playSequence` in miniature — the loop *is* the schedule. The original Simon would express this as three timeouts at 0ms, 300ms, 600ms plus one at 900ms for "Go!", with the arithmetic living in your head; here the rhythm falls out of `await` and there is no arithmetic at all.

### 2. Best score, remembered

```js
let best = Number(localStorage.getItem('simon-best')) || 0;

// in handlePadClick, replace the gameover branch:
if (color !== sequence[playerIndex]) {
  phase = 'gameover';
  best = Math.max(best, sequence.length);
  localStorage.setItem('simon-best', best);
  setStatus(`Wrong! You reached round ${sequence.length}. Best: ${best}. Press Start.`);
  return;
}
```

WHY: `best` is one more piece of state with a single writer — the gameover transition — so it can't drift. Saving at the moment the phase changes to `gameover` means every path that ends a game records the score, because there is only one such path in a state machine.

### 3. A Replay button

```html
<p><button id="replayButton">Replay</button></p>
```

```js
document.getElementById('replayButton').onclick = async () => {
  if (phase !== 'listening') return; // the whole feature's safety, in one line
  await playSequence();              // shows again, resets your progress
};
```

WHY: this is the README's "each new feature adds more places to forget the flag" scenario — solved with one guard, because `playSequence` already moves the machine through `showing` and back to `listening`, resetting `playerIndex` on the way. In the flag version you'd juggle `accepting` off, replay, back on, but-not-if-game-over; the phase variable makes the nonsense states unreachable instead of merely avoided.

### 4. Speed ramp

```js
const TIMING = {
  flash: 400,
  gap: 300,
  beforeInput: 250,
  betweenRounds: 900,
  fastestFlash: 150,
  rampStep: 25,
};

function flashMs(round) {
  return Math.max(TIMING.fastestFlash, TIMING.flash - TIMING.rampStep * (round - 1));
}

async function flash(color) {
  const pad = document.getElementById(color);
  pad.classList.add('lit');
  await sleep(flashMs(sequence.length));
  pad.classList.remove('lit');
}
```

WHY: the schedule was already *derived* (the loop just awaits whatever `flash` takes), so making duration a function of the round touches exactly one line of timing code — nothing overlaps, no `700`-style constant to re-derive. In the original, a per-round speed would mean recomputing every `i * 700` start time with a running sum. `Math.max` is the clamp that keeps late rounds humanly possible.

### 5. Game-over flash — all pads at once

```js
async function gameOverFlash() {
  for (let i = 0; i < 2; i++) {
    await Promise.all(COLORS.map(flash)); // four flashes, together
    await sleep(TIMING.gap);
  }
}

// in handlePadClick's wrong branch, before setStatus:
phase = 'gameover';
await gameOverFlash();
setStatus(`Wrong! You reached round ${sequence.length}. Press Start.`);
```

WHY: `for...of` with `await` means "one at a time"; `Promise.all` over an array of already-started promises means "all together, wait for the slowest." Both are one line — async gives you the choice, just like the deliberately-un-awaited feedback flash. Setting `phase = 'gameover'` *before* the animation keeps mad clicking during the blink harmless. (Verified in node: four parallel 100ms sleeps finish in ~one flash-time; awaited in a loop they take ~four.)

### 6. Extract the rule, test it in node

```js
// rules.js — pure, no DOM
export function checkGuess(sequence, playerIndex, color) {
  if (color !== sequence[playerIndex]) return 'wrong';
  if (playerIndex + 1 === sequence.length) return 'round-complete';
  return 'continue';
}
```

```js
// in index.html, handlePadClick becomes a dispatcher on the result:
async function handlePadClick(color) {
  if (phase !== 'listening') return;
  flash(color);
  const result = checkGuess(sequence, playerIndex, color); // (paste checkGuess above it)
  if (result === 'wrong') {
    phase = 'gameover';
    setStatus(`Wrong! You reached round ${sequence.length}. Press Start.`);
  } else if (result === 'round-complete') {
    phase = 'showing';
    setStatus('Good!');
    await sleep(TIMING.betweenRounds);
    await nextRound();
  } else {
    playerIndex++;
  }
}
```

Wait — spot the subtle change: in the original code `playerIndex++` ran on *every* correct guess. Keep that behavior by incrementing for `'round-complete'` too, or (cleaner, as above) don't bother: `playSequence` resets it anyway. The node test:

```js
import assert from 'node:assert/strict';
import { checkGuess } from './rules.js';
const seq = ['green', 'red', 'blue'];
assert.equal(checkGuess(seq, 0, 'yellow'), 'wrong');
assert.equal(checkGuess(seq, 0, 'green'), 'continue');
assert.equal(checkGuess(seq, 2, 'blue'), 'round-complete');
assert.equal(checkGuess(seq, 2, 'green'), 'wrong');
assert.equal(checkGuess(['red'], 0, 'red'), 'round-complete');
console.log('checkGuess: all cases pass');
```

WHY: the decision ("was that right?") is timeless data-in, data-out; the reaction (flash, status, next round) is effects. Split them and the decision becomes testable in milliseconds — including the round-1 edge where a single-color sequence must complete immediately, a case you'd otherwise only hit by playing. This rules/effects split is precisely how project 16 gets its whole test file.
