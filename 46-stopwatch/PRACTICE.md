# 🏋️ Practice: Stopwatch

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Predict the readout (warm-up)

`formatElapsed` is pure, so it can be tested in node with no browser at all. Before running anything, write down what it returns for `0`, `999`, `1000`, `59_999`, `60_000`, `61_500` and `3_600_000`. Then copy the function into a scratch `.mjs` file, add an `assert.equal` for each prediction, and run it. One of these answers surprises most people — find out which before you look at the solution.

What it practices: reading integer-division formatting code precisely, and noticing that a pure function is testable *anywhere*.

Hint: `Math.floor(ms / 60000)` has no upper bound, so ask yourself what an hour looks like in a `mm:ss.t` display.

### ⭐⭐ 2. Extract the state machine into pure functions (core)

The three actions mutate a module-level `state` and call `render()`, so none of them can be tested outside a browser. Extract them: write `elapsedMs(state, now)`, `toggle(state, now)` and `addLap(state, now)` as pure functions that take a state object plus a timestamp and *return a new state* — no globals, no `Date.now()` inside, no `render()`. Then reduce the button handlers to `state = toggle(state, Date.now()); render();`. Check offline in node with fake timestamps: starting at 1000 then reading at 3500 gives 2500; stopping at 3500 banks `accumulatedMs: 2500`; reading a stopped watch at *any* later time still gives 2500; resuming at 10000 and reading at 11000 gives 3500. Assert the input state object was not mutated.

What it practices: separating decisions from effects — the habit that makes browser code testable in node.

Hint: `{ ...state, running: true, startedAt: now }` builds the new state. `addLap` on a stopped watch should return the state unchanged — the same guard `lap()` has today.

### ⭐⭐ 3. Survive a reload (core)

Because the state records *when things happened* rather than a tick count, it can be saved and restored — and a running stopwatch keeps running across a page reload. Save the state to `localStorage` after every action and load it at startup. Write `restore(text)` as a pure function that returns the saved state or a fresh idle one, rejecting anything malformed. Check offline in node: `restore(serialize(state))` round-trips exactly; `restore(null)`, `restore('{{{not json')`, `restore('"a string"')` and `restore('{"running":true,"laps":[],"accumulatedMs":0}')` (running but with no `startedAt`) all return the idle state. Then check in the browser: start the watch, wait 5 seconds, press F5 — the time carries on as if nothing happened.

What it practices: validating untrusted input at the boundary — `localStorage` is a string from the outside world, no matter who wrote it.

Hint: `JSON.parse` throws on bad input, so wrap it in try/catch and check the shape afterwards. The reload only works because `startedAt` is an absolute timestamp; a tick counter could not do this.

### ⭐⭐ 4. Keyboard shortcuts (core)

Real stopwatches are operated without looking. Add `keydown` handling on `document`: Space toggles start/stop, `L` records a lap, `R` resets. Space must call `event.preventDefault()` (otherwise it also "clicks" whatever button has focus, firing the action twice) and auto-repeat from a held key must be ignored. Check in the browser: click Start with the mouse, then hold Space down for three seconds — the watch must toggle exactly once, not dozens of times; press L twice for two laps; press R to clear.

What it practices: the double-firing and key-repeat traps that make naive keyboard handlers behave strangely.

Hint: `if (event.repeat) return;` handles auto-repeat. Compare `event.key === ' '` for Space, and lowercase the key so both `l` and `L` work.

### ⭐⭐⭐ 5. The clock that goes backwards (challenge)

`Date.now()` is the *wall clock*, and wall clocks move sideways — an NTP correction, a timezone change, or a user setting the clock can shift it by seconds or hours, in either direction. Demonstrate the damage in node first: with the pure functions from exercise 2, start at timestamp 1,000,000 and read at 999,000 — you get **negative** elapsed time. Then fix the page by switching every timestamp to `performance.now()`, a monotonic clock that only ever moves forward. Check in the browser that everything still behaves; then work out what this breaks about exercise 3, and write down the trade-off.

What it practices: knowing which clock answers which question — "what time is it?" and "how much time has passed?" are different, and only one of them has a right answer here.

Hint: `performance.now()` returns milliseconds since page load, as a float — the arithmetic is identical, so only the three `Date.now()` calls change. Because it resets on every page load, saved `startedAt` values from a *previous* load become meaningless.

### ⭐⭐⭐ 6. Two stopwatches on one page (challenge)

Everything is global — one `state`, and `render` reaching for fixed ids — so a second stopwatch is impossible. Refactor into `createStopwatch(rootElement)`: it builds its own display, buttons and lap list inside the given element, keeps its own state in a closure, and returns nothing the caller needs. Then put two `<div class="stopwatch">`s on the page and construct one for each. Check in the browser: start A, wait, start B, lap each — the two run completely independently, and resetting A leaves B untouched. Check in node that the *state* half is independent: two instances started at 0 and 500 read 1000 and 500 at timestamp 1000.

What it practices: replacing globals with a closure — the same encapsulation a class gives, without needing `this`.

Hint: build the DOM with `document.createElement` inside the factory and keep the elements in local variables, so `render` closes over them and never calls `getElementById`. One shared `setInterval` in the factory per instance is fine.

## Solutions

### 1. Predict the readout

```js
import assert from 'node:assert/strict';

function formatElapsed(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${tenths}`;
}

assert.equal(formatElapsed(0), '00:00.0');
assert.equal(formatElapsed(999), '00:00.9');
assert.equal(formatElapsed(1000), '00:01.0');
assert.equal(formatElapsed(59_999), '00:59.9');
assert.equal(formatElapsed(60_000), '01:00.0');
assert.equal(formatElapsed(61_500), '01:01.5');
assert.equal(formatElapsed(3_600_000), '60:00.0'); // an hour reads as 60 minutes
```

WHY: the surprise is the last one — there is no hours field, so an hour displays as `60:00.0` and two hours as `120:00.0`. That's a deliberate, defensible choice for a stopwatch (most sessions are minutes), but it is a choice, and now it's written down instead of being discovered by a confused user. Note `Math.floor` here versus project 53's `Math.ceil`: a stopwatch counts *up* from zero so it should show the tenth already completed, while a countdown shows the second you are still inside. Verified by running: all seven pass.

### 2. Pure state transitions

```js
const IDLE = { running: false, startedAt: null, accumulatedMs: 0, laps: [] };

function elapsedMs(state, now) {
  return state.accumulatedMs + (state.running ? now - state.startedAt : 0);
}

function toggle(state, now) {
  if (state.running) {
    return {
      ...state,
      running: false,
      startedAt: null,
      accumulatedMs: state.accumulatedMs + (now - state.startedAt), // bank the segment
    };
  }
  return { ...state, running: true, startedAt: now };
}

function addLap(state, now) {
  if (!state.running) return state;
  return { ...state, laps: [...state.laps, elapsedMs(state, now)] };
}

// the handlers become pure wiring:
document.getElementById('startStop').onclick = () => { state = toggle(state, Date.now()); render(); };
```

```js
// scratch test, run with node:
const started = toggle(IDLE, 1000);
assert.equal(elapsedMs(started, 3500), 2500);
const stopped = toggle(started, 3500);
assert.equal(stopped.accumulatedMs, 2500);
assert.equal(elapsedMs(stopped, 999_999), 2500); // paused time is frozen
assert.equal(elapsedMs(toggle(stopped, 10_000), 11_000), 3500); // resume loses nothing
assert.deepEqual(IDLE, { running: false, startedAt: null, accumulatedMs: 0, laps: [] }); // unmutated
```

WHY: passing `now` in as a parameter is the whole trick — time becomes an *input*, so a test can place the clock anywhere and check behavior that would take real minutes to reproduce by hand. It also lets you assert the README's headline claim directly: ten rapid stop/start cycles of 137ms each accumulate to exactly 1370ms, whereas the original's tick counter loses a fraction on every pause. Returning new objects rather than mutating means old states stay valid, which is what makes project 39's undo, and any state-snapshot debugging, possible later. Verified by running: all five assertions plus the ten-cycle property.

### 3. Survive a reload

```js
const KEY = 'stopwatch-state';

function serialize(state) { return JSON.stringify(state); }

function restore(text, fallback = IDLE) {
  if (!text) return fallback;
  try {
    const saved = JSON.parse(text);
    if (typeof saved !== 'object' || saved === null) return fallback;
    if (typeof saved.accumulatedMs !== 'number' || !Array.isArray(saved.laps)) return fallback;
    if (saved.running && typeof saved.startedAt !== 'number') return fallback; // impossible state
    return {
      running: !!saved.running,
      startedAt: saved.startedAt ?? null,
      accumulatedMs: saved.accumulatedMs,
      laps: saved.laps,
    };
  } catch {
    return fallback;
  }
}

// at startup:  let state = restore(localStorage.getItem(KEY));
// in render():  localStorage.setItem(KEY, serialize(state));
```

WHY: this feature is *free* only because of the design the README argues for. A tick-counting stopwatch cannot survive a reload — its "time" lives in interval callbacks that die with the page — but `startedAt` is an absolute timestamp, so a reloaded page recomputes the true elapsed time on its very first render, including the seconds spent reloading. The validation matters because `localStorage` holds a string anyone can edit in devtools: the `running && !startedAt` check rejects an impossible state that would otherwise produce `NaN` on screen forever. Verified by running: exact round-trips, and all four malformed inputs falling back to idle.

### 4. Keyboard shortcuts

```js
document.addEventListener('keydown', (event) => {
  if (event.repeat) return; // a held key fires over and over — ignore the repeats
  const key = event.key.toLowerCase();
  if (event.key === ' ') {
    event.preventDefault(); // stop Space from "clicking" the focused button too
    startStop();
  } else if (key === 'l') {
    lap();
  } else if (key === 'r') {
    reset();
  }
});
```

WHY: two browser behaviors conspire against the naive version. Space activates the focused button, so after clicking Start with the mouse, pressing Space fires both the handler and a synthetic click — the watch toggles twice and appears not to respond; `preventDefault()` stops that. And holding a key fires `keydown` repeatedly at the OS repeat rate, which would toggle the watch dozens of times a second; `event.repeat` is `true` for every fire after the first. Neither of these is a stopwatch problem — they're the two traps in *every* keyboard handler, which is why they're worth meeting here.

### 5. The clock that goes backwards

```js
// scratch test with the pure functions from exercise 2:
const running = toggle(IDLE, 1_000_000);
assert.equal(elapsedMs(running, 1_002_000), 2000);
assert.equal(elapsedMs(running, 999_000), -1000); // the clock moved BACK: negative time
```

```js
// the fix — three call sites, identical arithmetic:
function now() { return performance.now(); }
// state = toggle(state, now());  ...and so on
```

WHY: `Date.now()` answers "what is the date and time?", and that answer is allowed to change — NTP nudges it constantly, and a user or a VM suspend can move it by hours. Subtracting two wall-clock readings to get a duration therefore has no guarantees at all, and the negative result above is what a user would see as a stopwatch jumping backwards mid-run. `performance.now()` answers a different question — "how long since this page loaded?" — and is *monotonic*: it never goes backwards, never jumps, and is a float with sub-millisecond resolution. The trade-off, and this is the real lesson: it resets to zero on every page load, so a `startedAt` saved by exercise 3 is meaningless after a reload. You can have monotonic durations or persistable timestamps from one clock, not both — real apps store `Date.now()` for persistence and use `performance.now()` for the live reading. Verified by running: the backwards read gives `-1000`ms.

### 6. Two stopwatches on one page

```js
function createStopwatch(root) {
  let state = { running: false, startedAt: null, accumulatedMs: 0, laps: [] };

  const display = root.appendChild(document.createElement('div'));
  display.className = 'display';
  const startStopBtn = root.appendChild(document.createElement('button'));
  const lapBtn = root.appendChild(document.createElement('button'));
  lapBtn.textContent = 'Lap';
  const resetBtn = root.appendChild(document.createElement('button'));
  resetBtn.textContent = 'Reset';
  const lapList = root.appendChild(document.createElement('ol'));

  function render() {
    display.textContent = formatElapsed(elapsedMs(state, Date.now()));
    startStopBtn.textContent = state.running ? 'Stop' : 'Start';
    lapBtn.disabled = !state.running;
    lapList.innerHTML = '';
    for (const lapMs of state.laps) {
      const li = document.createElement('li');
      li.textContent = formatElapsed(lapMs);
      lapList.appendChild(li);
    }
  }

  startStopBtn.onclick = () => { state = toggle(state, Date.now()); render(); };
  lapBtn.onclick = () => { state = addLap(state, Date.now()); render(); };
  resetBtn.onclick = () => { state = { running: false, startedAt: null, accumulatedMs: 0, laps: [] }; render(); };

  setInterval(render, 100);
  render();
}

for (const el of document.querySelectorAll('.stopwatch')) createStopwatch(el);
```

WHY: the globals were never the *feature*, they were the shortcut — `state` and `getElementById` are both ways of saying "there is exactly one of these". A closure removes that assumption at both ends: each call gets its own `state` binding and its own element references, so `render` can never reach into a sibling's DOM. This is exactly the encapsulation project 41's `#entries` gets from a class, achieved with a function instead, and it's the boundary every component system (React, Vue, web components) formalizes. Note the pure functions from exercise 2 need no change at all — they never referred to a global in the first place. Verified by running the state half in node: two instances started at 0 and 500 read 1000 and 500 at timestamp 1000, and resetting one leaves the other's laps intact.
