# 🏋️ Practice: Stopwatch

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The timelines here can all be reasoned out on paper, and the formatter can be run under Node; only the pages themselves need the CDN, so save those for when you're online.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Give the digits their own function (warm-up)

The three `Math.floor` lines and the `padStart` calls are display logic tangled into a component. Extract them into a pure `formatElapsed(ms)` that takes milliseconds and returns the string `"MM:SS.T"`, defined above `App` with no React in sight. The component should end up rendering `<h2>{formatElapsed(elapsedMs)}</h2>`.

**Practices:** separating a pure formatter from a component — the same "it's just a function" move the money module made in project 46.

**Hint:** the tenths digit needs no padding (it's always one character); the minutes and seconds do.

**Expected:** the screen is unchanged — `00:00.0` at rest, `00:02.5` after two and a half seconds. What changed is that `formatElapsed` can now be called from a test file, which exercise 3 does.

### ⭐⭐ 2. Predict: the stopwatch that thinks it's 55 years old (core)

A teammate notices the ternary in the derived line and "simplifies" it:

```jsx
const elapsedMs = watch.accumulatedMs + (Date.now() - watch.startedAt);
```

Assume the wall clock reads exactly `1750000000000` at every paint below. Write down the digits shown (a) the instant the page loads, before any click; (b) five and a half seconds after pressing start; (c) right after pressing stop at the 2.55s mark. Then explain why one of those three is correct, and fix the line.

**Practices:** reading `null` through arithmetic coercion, and noticing that a guard can be load-bearing even when the happy path looks fine.

**Hint:** `Date.now() - null` is not `NaN`. What does `Number(null)` give you?

**Expected:** two of your three answers are absurd eight-digit minute counts and one is ordinary; the solution states all three exactly. Note which state fields make the difference — it's not the running one that breaks.

### ⭐⭐ 3. Test the formatter in Node, and give it hours (core)

Create `refactored/format-elapsed.js` exporting `formatElapsed`, plus a `refactored/format-elapsed.test.js` using `node:test`, and run `node --test react/47-stopwatch-react/refactored/` from the repo root. Cover the boundaries: `0`, `99`, `100`, `999`, `1000`, `59999`, `60000`. Then extend the function so that past an hour it shows an hours segment (`1:00:00.0`) instead of `60:00.0`, and clamp negative input to zero — and add tests for those. Project 40 already ships an exported-module-plus-tests pair if you want the shape.

**Practices:** unit-testing a pure function's boundary behaviour, where "off by one tenth" is invisible on screen but obvious to an assertion.

**Hint:** with an hours segment it's easier to work from `totalSecs = Math.floor(ms / 1000)` and then take `% 60` and `/ 3600`, rather than nesting remainders of remainders.

**Expected:** `node --test` prints all-pass. `formatElapsed(3599999)` is `"59:59.9"`, `formatElapsed(3600000)` is `"1:00:00.0"`, `formatElapsed(3661500)` is `"1:01:01.5"`, and `formatElapsed(-5)` is `"00:00.0"` rather than the `"-1:-1.-1"` the unclamped version produces.

### ⭐⭐ 4. Bottle the model as `useStopwatch()` (core)

Move the whole time model — the `watch` state, the repaint state, the effect, `startStop`, `reset`, and the derived `elapsedMs` — into a custom hook `useStopwatch()` that returns `{ elapsedMs, running, startStop, reset }`. `App` should shrink to markup plus one call. Then render **two** stopwatches side by side to prove they don't interfere.

**Practices:** custom hooks as model extraction; the fact that each call site gets its own independent state.

**Hint:** a custom hook is a plain function whose name starts with `use` and that calls other hooks — no registration, no wrapper. Don't reach for `useCallback` on `startStop`; nothing here is memoized, so it would be ceremony.

**Expected:** each watch starts, stops, and resets independently — run one, leave the other paused, and the paused one stays put. The `Stopwatch` component that consumes the hook contains no `Date.now()` at all.

### ⭐⭐⭐ 5. Countdown mode, stopping exactly on zero (challenge)

Turn it into a ten-second countdown: display `remainingMs` counting down from `00:10.0`, and have it stop *itself* when the target is reached. Two traps to handle. First, the display must never show negative time. Second, the banked `accumulatedMs` must end up exactly `10000` — if the repaint that notices "we're done" arrives 40ms late (or two minutes late, because the tab was backgrounded), the stopwatch must not bank the overshoot.

**Practices:** deriving a clamped value, and using an effect to close a state machine — with a guard that keeps it from looping.

**Hint:** `Math.max(0, TARGET_MS - elapsedMs)`. An effect with *no* dependency array runs after every render, which is what you want for "check the clock every time we repaint"; the guard `if (!watch.running || remainingMs > 0) return;` is what stops it re-firing forever.

**Expected:** press start and the digits fall from `00:10.0`; at zero the button flips back to "start" and the display freezes at exactly `00:00.0`. Background the tab at the 3-second mark for a full minute and return: the first render already shows `00:00.0`, stopped, banked at exactly 10000 — not 63000. Pressing start again does nothing visible until you press reset.

### ⭐⭐⭐ 6. Repaint on the tenth, not every 100ms (challenge)

The 100ms interval and the tenths boundaries drift apart: start at `x.x47` and every repaint lands 47ms after the digit actually changed, so the display is up to a tenth stale, forever. Replace the interval with a `setTimeout` that is rescheduled after every render to fire at the *next tenth boundary*. The effect that does this has no dependency array — think through why that's correct here and not sloppy.

**Practices:** self-rescheduling timers, effects that intentionally run every render, and cleanup as the thing that makes both safe.

**Hint:** the time until the next boundary is `100 - (elapsedMs % 100)`, always between 1 and 100. Each fired timeout causes a repaint, the repaint causes a render, and the render schedules the next timeout.

**Expected:** the digits still tick ten times a second, but each change now lands within a millisecond or two of the true boundary instead of a fixed offset behind it. Because the cleanup clears the pending timeout, any *other* render (a click, a parent update) cancels and reschedules from the fresh elapsed time rather than stacking timers up.

## Solutions

### 1. Give the digits their own function

```jsx
function formatElapsed(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

// in App:
<h2>{formatElapsed(elapsedMs)}</h2>
```

**Why:** nothing in this arithmetic depends on React, so nothing in it belongs in a component — it's a function from a number to a string, and now it can be read, reasoned about, and tested as one. Notice how thin the component becomes: state holds timestamps, one derivation turns them into a duration, one formatter turns that into text. Each of the three steps is now independently checkable, which is what "separation of concerns" actually buys you.

### 2. Predict: the stopwatch that thinks it's 55 years old

(a) On load: **29166666:40.0**. (b) Five and a half seconds after start: **00:05.5** — correct. (c) After stopping at 2.55s: **29166666:42.5**.

The fix restores the guard: `watch.accumulatedMs + (watch.running ? Date.now() - watch.startedAt : 0)`.

**Why:** when the watch isn't running, `startedAt` is `null`, and `-` coerces its operands to numbers — `Number(null)` is `0`, so `Date.now() - null` is `Date.now()`: the milliseconds since 1970, about 55 years, rendered as an eight-digit minute count. (Had the field been `undefined` instead, you'd have got `NaN` and a display of `NaN:NaN.NaN` — arguably a kinder failure, since nobody ships that by accident.) Case (b) is correct only because while running the ternary would have taken the same branch anyway; the guard's real job is the two-thirds of the time the watch is *paused*. The bug is visible before you click anything, which is the tell: a derived value that's wrong at rest means the derivation, not the interaction, is broken.

### 3. Test the formatter in Node, and give it hours

`refactored/format-elapsed.js`:

```js
export function formatElapsed(ms) {
  const safe = Math.max(0, ms);
  const totalSecs = Math.floor(safe / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  const hours = Math.floor(totalSecs / 3600);
  const mmss =
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}
```

`refactored/format-elapsed.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatElapsed } from './format-elapsed.js';

test('the boundaries', () => {
  assert.equal(formatElapsed(0), '00:00.0');
  assert.equal(formatElapsed(99), '00:00.0');    // not yet a tenth
  assert.equal(formatElapsed(100), '00:00.1');
  assert.equal(formatElapsed(999), '00:00.9');
  assert.equal(formatElapsed(1000), '00:01.0');
  assert.equal(formatElapsed(59999), '00:59.9');
  assert.equal(formatElapsed(60000), '01:00.0');
});

test('hours appear only when needed', () => {
  assert.equal(formatElapsed(3599999), '59:59.9');
  assert.equal(formatElapsed(3600000), '1:00:00.0');
  assert.equal(formatElapsed(3661500), '1:01:01.5');
});

test('negative input is clamped, not rendered as garbage', () => {
  assert.equal(formatElapsed(-5), '00:00.0');
});
```

**Why:** `Math.floor` truncates toward negative infinity, so an unclamped formatter turns `-5` into `"-1:-1.-1"` — and `padStart` can't save a minus sign. Clamping once at the top is cheaper than auditing every caller. The boundary cases are the ones worth asserting because they're exactly where a `<` and a `<=`, or a `round` and a `floor`, disagree: at 999ms the display must still say `.9`, and the instant it becomes 1000 the seconds must roll. None of this needs a browser, which is the point of having pulled the function out in exercise 1.

### 4. Bottle the model as `useStopwatch()`

```jsx
function useStopwatch() {
  const [watch, setWatch] = useState({
    running: false, startedAt: null, accumulatedMs: 0,
  });
  const [, setRepaint] = useState(0);

  useEffect(() => {
    if (!watch.running) return;
    const id = setInterval(() => setRepaint((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [watch.running]);

  function startStop() {
    setWatch((w) =>
      w.running
        ? { running: false, startedAt: null,
            accumulatedMs: w.accumulatedMs + (Date.now() - w.startedAt) }
        : { ...w, running: true, startedAt: Date.now() });
  }
  function reset() {
    setWatch({ running: false, startedAt: null, accumulatedMs: 0 });
  }

  const elapsedMs = watch.accumulatedMs +
    (watch.running ? Date.now() - watch.startedAt : 0);

  return { elapsedMs, running: watch.running, startStop, reset };
}

function Stopwatch({ label }) {
  const { elapsedMs, running, startStop, reset } = useStopwatch();
  return (
    <div>
      <h3>{label}</h3>
      <h2>{formatElapsed(elapsedMs)}</h2>
      <button onClick={startStop}>{running ? 'stop' : 'start'}</button>{' '}
      <button onClick={reset}>reset</button>
    </div>
  );
}

function App() {
  return (
    <div>
      <h1>Stopwatch</h1>
      <Stopwatch label="lap timer" />
      <Stopwatch label="total" />
    </div>
  );
}
```

**Why:** a custom hook is just a function that calls hooks, and the independence comes for free — hook state lives on the *fiber* of the component that called it, so two `<Stopwatch>` elements own two separate `watch` objects and two separate intervals. The hook exposes `elapsedMs`, a number, rather than the raw `watch` object: callers get the useful derived value and can't accidentally depend on the internal shape, which is what makes it safe to change that shape later. `startStop` is a fresh function every render and that's fine — a new identity only costs something when a `React.memo` child or a dependency array is comparing it, and neither exists here.

### 5. Countdown mode, stopping exactly on zero

```jsx
const TARGET_MS = 10000;

// ...inside App, after elapsedMs is derived:
const remainingMs = Math.max(0, TARGET_MS - elapsedMs);

useEffect(() => {
  if (!watch.running || remainingMs > 0) return;
  setWatch({ running: false, startedAt: null, accumulatedMs: TARGET_MS });
});

// in the JSX:
<h2>{formatElapsed(remainingMs)}</h2>
```

**Why:** the clamp and the bank do two different jobs. `Math.max(0, …)` keeps the *display* honest between the moment the target passes and the render that notices; setting `accumulatedMs` to `TARGET_MS` rather than to the measured elapsed keeps the *data* honest, discarding an overshoot that could be milliseconds or minutes depending on how throttled the tab was. The effect deliberately has no dependency array: "look at the clock again" is exactly a per-render job, and the guard makes it idempotent — after it fires once, `watch.running` is false, so the next run returns immediately and there's no loop. Pressing start again does nothing visible because the machine is consistent: elapsed is already at the target, so the effect stops it on the very next render.

### 6. Repaint on the tenth, not every 100ms

```jsx
useEffect(() => {
  if (!watch.running) return;
  const delay = 100 - (elapsedMs % 100);   // 1..100 ms to the next boundary
  const id = setTimeout(() => setRepaint((n) => n + 1), delay);
  return () => clearTimeout(id);
});
```

**Why:** an interval fires on *its* schedule, which was set once at start and knows nothing about where the tenths boundaries fell; a timeout recomputed from the current elapsed time re-aims at the boundary on every hop, so error can't accumulate. `delay` is never 0 (when `elapsedMs % 100` is 0 you get a full 100), so there's no busy-loop, and it's never more than 100, so a fired timeout always lands after the displayed digit has actually changed. The missing dependency array is the honest expression of "reschedule after every render," and the cleanup is what makes it safe: React clears the pending timeout before each re-run, so however many renders happen there is never more than one timer outstanding. This is the same rhythm as the original repaint interval, and it still carries zero time information — a late timeout costs one late frame, and the derivation reads the true clock regardless.
