# 🏋️ Practice: Pomodoro Timer

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Predict the clock face (warm-up)

`formatMs` uses `Math.ceil` on purpose. Before running anything, write down what it returns for: `25 * 60_000`, `0`, `1`, `59_999`, and `61_000`. Then copy the function into a scratch `.mjs` file, add `assert.equal` lines for your five predictions, and run it with node. Expected: `25:00`, `00:00`, `00:01`, `01:00`, `01:01` — if any prediction missed, work out which second the ceil claimed.

What it practices: reading rounding code precisely — the one-character decisions users actually see.
Hint: `Math.ceil(59999 / 1000)` is 60, and 60 seconds is `01:00`, not `00:60`.

### ⭐⭐ 2. Count completed pomodoros (core)

Add a line under the timer: `Completed today: N`, counting finished *work* blocks only — breaks don't score. Checkable offline: set `DURATIONS_MS` to `{ work: 5_000, break: 3_000 }`, open the page, click Start, and after 5 seconds the counter must read 1 (and the phase flips to break); after the break and another work block it reads 2. Reset must NOT clear it — abandoning a session doesn't erase finished ones.

What it practices: hooking a feature onto the single point where a phase ends — the state machine's transition, not the tick.
Hint: `phaseComplete` already knows `finished`; one counter variable, one `if`, one line in `render`.

### ⭐⭐ 3. A Skip button (core)

Add a third button, `Skip`, that ends the current phase immediately — straight into the next phase, running, with the notification firing (during a work phase it should feel like "fine, I'll take my break early"). When the timer is `idle`, Skip must do nothing at all. Checkable: click Start (background white, phase "work"), click Skip → background turns green, phase reads "break", and the countdown restarts from the break duration.

What it practices: adding a transition to a state machine without creating an impossible state.
Hint: `phaseComplete()` already *is* the transition — the button just needs a guard for `idle`.

### ⭐⭐ 4. Extract the machine (core)

The transition logic lives inside `primaryAction`, tangled with `render()` and the notification call, so it can't be tested in node. Extract it: write a pure function `nextStateOnPrimary(state, now)` that takes the current state object and a timestamp and returns the *next* state object — no DOM, no clock reads, no side effects. Verify in a scratch file: idle→running gives `endsAt = now + 25 * 60_000`; pausing one minute in gives `remainingMs = 24 * 60_000`; resuming later gives a fresh `endsAt` from the *new* now; pausing after the end clamps `remainingMs` to `0`, never negative.

What it practices: separating decisions (pure, testable) from effects (DOM, clock) — the repo's deepest habit, applied to browser code.
Hint: two branches: running→paused (derive remaining from `endsAt - now`) and everything-else→running (remaining comes from paused state or the phase duration).

### ⭐⭐⭐ 5. Durations from the URL (challenge)

Let the page be opened as `index.html?work=10&break=5` (minutes) to override the durations — great for testing, or for people who swear by 50/10. Write a pure helper `parseDurations(search)` that takes `location.search` and returns `{ work, break }` in milliseconds: missing, non-numeric, zero, or negative values fall back to the defaults (25/5). Verify in node: `'?work=10&break=5'` → `{ work: 600000, break: 300000 }`; `''`, `'?work=abc'`, and `'?work=0&break=-3'` all keep the defaults for the bad fields; `'?work=0.5'` → 30 seconds of work. Then wire it up: `const DURATIONS_MS = parseDurations(location.search);` and confirm in the browser that `?work=1` starts at `01:00`.

What it practices: validating untrusted input at the boundary into a trusted config object — with the parse logic pure enough to test in node.
Hint: `new URLSearchParams(search).get('work')` is `null` when absent, and `Number(null)` is `0` — one `> 0` check handles missing, zero, and negative in a single stroke.

## Solutions

### 1. Predict the clock face

```js
import assert from 'node:assert/strict';
function formatMs(ms) {
  const totalSecs = Math.ceil(ms / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(totalSecs / 60))}:${pad(totalSecs % 60)}`;
}
assert.equal(formatMs(25 * 60_000), '25:00');
assert.equal(formatMs(0), '00:00');
assert.equal(formatMs(1), '00:01');      // 1ms left still shows a whole second
assert.equal(formatMs(59_999), '01:00'); // ceil lands exactly on the minute
assert.equal(formatMs(61_000), '01:01');
```

WHY: the README calls the ceil "the kind of one-character bug users notice instantly" — this exercise makes you *feel* why. `Math.ceil` means the display shows the second you are still inside, so a fresh timer reads `25:00` and the clock never skips `00:00`-adjacent weirdness. The surprise case is `59_999`: ceil rounds it up to a clean minute, which is exactly what a human glancing at the clock expects.

### 2. Count completed pomodoros

```html
<div id="done"></div>
```

```js
let completedWork = 0;

function phaseComplete() {
  const finished = state.phase;
  const next = NEXT_PHASE[finished];
  if (finished === 'work') completedWork++;   // breaks don't score
  notify(finished === 'work' ? 'Work block done — take a break!' : 'Break over — back to it!');
  state = { status: 'running', phase: next, endsAt: Date.now() + DURATIONS_MS[next] };
  render();
}

// in render():
document.getElementById('done').textContent = `Completed today: ${completedWork}`;
```

WHY: there is exactly one moment when a work block truly finishes, and the state machine already funnels every path (normal completion, throttled-tab wakeup) through `phaseComplete` — so the counter can't double-count or miss. Putting the increment in the tick instead would re-create the original's bug class: counting *ticks* instead of *events*. Reset doesn't touch the counter because resetting the machine and erasing history are different ideas.

### 3. A Skip button

```html
<button id="skip">Skip</button>
```

```js
document.getElementById('skip').onclick = () => {
  if (state.status === 'idle') return; // nothing to skip
  phaseComplete();
};
```

WHY: this is the state-machine payoff the README promised — a whole feature is one guard plus a call to an existing transition, because "end this phase and start the next, running" already exists as `phaseComplete`. The `idle` guard keeps the machine's promise that transitions only leave from states where they make sense; without it, Skip on a fresh page would start a break you never earned. Notice Skip works identically from `running` and `paused` — both are mid-phase, both skippable.

### 4. Extract the machine

```js
function nextStateOnPrimary(state, now) {
  if (state.status === 'running') {
    return { status: 'paused', phase: state.phase, remainingMs: Math.max(0, state.endsAt - now) };
  }
  const remaining = state.status === 'paused' ? state.remainingMs : DURATIONS_MS[state.phase];
  return { status: 'running', phase: state.phase, endsAt: now + remaining };
}

// primaryAction shrinks to effects only:
function primaryAction() {
  const wasRunning = state.status === 'running';
  state = nextStateOnPrimary(state, Date.now());
  if (!wasRunning) requestNotifyPermission(); // still on the user gesture
  render();
}
```

```js
// scratch test, run with node:
const t0 = 1_000_000;
const running = nextStateOnPrimary({ status: 'idle', phase: 'work' }, t0);
assert.deepEqual(running, { status: 'running', phase: 'work', endsAt: t0 + 25 * 60_000 });
const paused = nextStateOnPrimary(running, t0 + 60_000);
assert.deepEqual(paused, { status: 'paused', phase: 'work', remainingMs: 24 * 60_000 });
const resumed = nextStateOnPrimary(paused, t0 + 999_999);
assert.deepEqual(resumed, { status: 'running', phase: 'work', endsAt: t0 + 999_999 + 24 * 60_000 });
assert.equal(nextStateOnPrimary(running, t0 + 26 * 60_000).remainingMs, 0); // clamped
```

WHY: passing `now` as a parameter instead of calling `Date.now()` inside is the whole trick — time becomes an *input*, so tests can place the clock anywhere (including one minute past the end, catching the negative-remaining edge that's nearly impossible to hit by hand in a browser). The state machine's rules now live in one pure function you can read top to bottom, and `primaryAction` is reduced to wiring: gesture in, effects out. This is the CLI projects' layering — pure core, thin shell — applied to a web page. (Verified with node: all four transitions above pass.)

### 5. Durations from the URL

```js
function parseDurations(search) {
  const defaults = { work: 25 * 60_000, break: 5 * 60_000 };
  const params = new URLSearchParams(search);
  for (const phase of ['work', 'break']) {
    const mins = Number(params.get(phase));
    if (Number.isFinite(mins) && mins > 0) defaults[phase] = mins * 60_000;
  }
  return defaults;
}

const DURATIONS_MS = parseDurations(location.search);
```

```js
// scratch test, run with node:
assert.deepEqual(parseDurations('?work=10&break=5'), { work: 600_000, break: 300_000 });
assert.deepEqual(parseDurations(''), { work: 1_500_000, break: 300_000 });
assert.deepEqual(parseDurations('?work=abc'), { work: 1_500_000, break: 300_000 });
assert.deepEqual(parseDurations('?work=0&break=-3'), { work: 1_500_000, break: 300_000 });
assert.deepEqual(parseDurations('?work=0.5'), { work: 30_000, break: 300_000 });
```

WHY: the URL is user input, and this is the weather CLI's boundary rule wearing browser clothes — validate once where outside data enters, hand the rest of the program a config object it can trust blindly. The guard is deliberately one condition: `Number(params.get(x))` turns *absent* (`null`→`0`), *garbage* (`NaN`), and *hostile* (`-3`) all into values that fail `Number.isFinite(mins) && mins > 0`, so every bad shape falls back to a sane default per field, independently. Because the function takes `search` as a string parameter instead of reading `location` itself, node can test all five cases without a browser. (Verified with node: all five assertions pass.)
