# 📘 Learning Guide: Stopwatch

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A stopwatch web page: a big `00:00.0` readout with Start, Stop, and Reset buttons (the refactor adds Lap). Open either HTML file in a browser — no server, no internet — and click Start. The display counts up in tenths of a second.

The plot twist: start the *original* stopwatch, switch to another browser tab for two minutes, and come back. It's now **seconds behind** a real stopwatch. The refactored one is exact. Same buttons, same look — completely different idea of what "time" is.

## 2. Concepts you need first

### HTML elements and ids

A web page is built from **elements** — `<button>`, `<div>`, etc. An **id** gives one element a unique name so JavaScript can find it:

```html
<div id="display">00:00.0</div>
```

```js
const el = document.getElementById("display");
el.textContent = "hello";   // the div now shows: hello
```

`document` is the page itself; the whole tree of elements is called the **DOM** (Document Object Model). Setting `.textContent` (or the older `.innerText`) changes what an element shows.

### Click handlers

Code that runs when a button is clicked. Two styles:

```html
<button onclick="start()">Start</button>          <!-- old style: in the HTML -->
```

```js
document.getElementById("btn").onclick = start;   // newer: assigned in JS
```

### setInterval and clearInterval

`setInterval(fn, ms)` runs `fn` repeatedly, about every `ms` milliseconds, and returns an id. `clearInterval(id)` stops it:

```js
let n = 0;
const id = setInterval(() => {
  n++;
  console.log(n);            // prints 1, 2, 3...
  if (n === 3) clearInterval(id); // ...then stops
}, 100);
```

**The fine print that this whole project hinges on:** `setInterval(fn, 100)` does *not* promise "exactly every 100ms." It promises "no sooner than 100ms, when the browser gets around to it." Each tick can slip a few milliseconds (**jitter**). Worse, browsers deliberately slow timers in background tabs (**throttling**) — often to once per second or less — to save battery.

### Date.now() — the real clock

`Date.now()` returns the current time as milliseconds since Jan 1, 1970 (a **timestamp**):

```js
const before = Date.now();
// ... some time passes ...
const after = Date.now();
console.log(after - before); // prints: how many ms actually passed
```

Unlike timers, the clock can't drift — subtracting two timestamps gives true elapsed time no matter how lazy the timers were.

### Source of truth vs derived values

The **source of truth** is the data you trust; everything else should be **derived** (recalculated) from it. The whole lesson here: make the *clock* the source of truth for elapsed time, and make the display a derived value. The original instead made the tick counter the source of truth — and ticks lie.

### Modulo and integer division for time math

`%` (**modulo**) gives the remainder; `Math.floor` rounds down. Together they split milliseconds into minutes/seconds/tenths:

```js
const ms = 83456;
console.log(Math.floor(ms / 60000));        // prints: 1   (minutes)
console.log(Math.floor((ms % 60000) / 1000)); // prints: 23  (seconds)
```

`String(n).padStart(2, '0')` pads `"7"` into `"07"` for clock-style display.

### Pure functions

A **pure function** computes its answer only from its inputs — no reading globals, no changing anything. `formatElapsed(ms)` is pure: give it 83456, get `"01:23.4"`, every time. Pure functions are trivially testable and reusable.

## 3. Walking through the original code

The state — one counter:

```js
var tenths = 0;         // elapsed time = number of ticks so far
var interval = null;
```

Elapsed time *is* the number of times the timer has fired. Remember the fine print about timers...

```js
function start() {
  if (interval) return;
  interval = setInterval(function () {
    tenths++;           // <- the elapsed time IS the tick count
    show();
  }, 100);
}
```

Start guards against double-starting (`if (interval) return`), then every ~100ms increments `tenths` and redraws. Stop clears the interval; Reset zeroes the counter.

```js
function show() {
  var mins = Math.floor(tenths / 600);
  var secs = Math.floor((tenths % 600) / 10);
  var t = tenths % 10;
```

The display converts tick-count into minutes (600 tenths per minute), seconds, and tenths. The math is fine. The *input* to the math is the problem.

## 4. What's wrong with it (in beginner terms)

**The one big flaw: it counts ticks, and ticks are unreliable.** `setInterval(fn, 100)` is a *request*, not a metronome. Suppose each tick actually arrives after 103ms — a totally normal slip. The stopwatch counts 10 ticks and shows "1.0 seconds" when 1.03 seconds truly passed. Tiny... but it never corrects. It **accumulates**: after 10 minutes you're ~2 seconds behind. That growing error is called **drift**.

Now the killer scenario: you start the stopwatch and switch tabs to read email. The browser throttles your background tab to one tick per second — it deliberately withholds 9 out of 10 ticks you were counting on. Two minutes later you come back: real time passed, but only ~120 ticks arrived instead of 1200. Your stopwatch believes 12 seconds passed. It's not a bug in the counting code — every line does what it says. It's a wrong *belief* about what timers promise.

**A smaller flaw: pause loses time.** Stopping between ticks throws away the fraction of a tick in progress — up to 100ms lost per pause. Pause five times during a workout and your total is half a second short, always in the same direction.

## 5. Try it yourself first!

1. **Vague hint:** The tick counter lies; what on the page never lies about time?
2. **Warmer:** `Date.now()`. If you write down the timestamp when Start is clicked, how do you compute elapsed time at any later moment — without counting anything?
3. **Warmer still:** `elapsed = Date.now() - startedAt`. Now the interval doesn't need to count; its only job is calling the redraw function.
4. **Pause/resume:** one timestamp isn't enough once you can stop and restart. Keep *two* pieces: `accumulatedMs` (total of all finished run segments) and `startedAt` (when the current segment began). What does Stop do to each? What does Start do?
5. **Check your fix:** while "running," change your computer's ability to tick by minimizing the window for a minute. When you come back, the very next redraw should show the true time.

## 6. Understanding the refactored solution

**The state and the one formula:**

```js
let state = {
  running: false,
  startedAt: null,     // timestamp when the current segment began
  accumulatedMs: 0,    // total of all finished segments
  laps: [],
};

function elapsedMs(now = Date.now()) {
  return state.accumulatedMs + (state.running ? now - state.startedAt : 0);
}
```

Elapsed time is *derived fresh* every time you ask: banked past segments, plus (if running) the live segment measured straight from the clock. No counter exists anywhere. The clock is the source of truth.

**Start/Stop banks segments exactly:**

```js
if (state.running) {
  state.accumulatedMs += Date.now() - state.startedAt; // bank the segment
  state.running = false;
  state.startedAt = null;
} else {
  state.startedAt = Date.now();
  state.running = true;
}
```

Stopping banks precisely `now - startedAt` — to the millisecond. No fraction of a tick can be lost, because there are no ticks in the time math at all.

**Laps came free:**

```js
function lap() {
  if (state.running) state.laps.push(elapsedMs());
}
```

Because elapsed time is now *a value you can ask for*, a lap is just "record the current value." In the original, elapsed time was tangled into a counter and a display routine — laps would have been surgery. Right structure → free features.

**The tick's only job is repainting:**

```js
setInterval(render, 100);
```

The interval carries **zero** time information. If it fires late, the display updates late — but with the *correct* time, because `render` derives from the clock. Return to a throttled tab and the very next tick snaps to the true time. The drift *class* of bug is gone by design, not patched by tuning.

**Layout of the file:** state → actions → rendering — the same floor plan as earlier projects. `formatElapsed(ms)` is a pure formatter (ms in, `"mm:ss.t"` out), and `render()` redraws *everything* from state: display text, the Start/Stop button label, whether Lap is disabled, and the lap list.

## 7. Words you learned (glossary)

- **DOM** — the browser's tree of page elements that JavaScript can modify.
- **id / getElementById** — a unique element name / the function that finds it.
- **textContent** — the text an element displays.
- **Click handler** — the function run when an element is clicked.
- **setInterval / clearInterval** — repeat a function on a timer / stop repeating.
- **Tick** — one firing of a repeating timer.
- **Jitter** — small random lateness in each tick.
- **Throttling** — the browser deliberately slowing timers in background tabs.
- **Drift** — accumulated timing error that grows and never corrects.
- **Timestamp** — a moment in time as a number (ms since 1970).
- **Date.now()** — the current timestamp; the clock that can't drift.
- **Source of truth** — the data you trust; everything else is recalculated from it.
- **Derived value** — a value computed from the source of truth on demand.
- **Segment** — one continuous run between a Start and a Stop.
- **Bank (a segment)** — add a finished segment's duration to the accumulated total.
- **Pure function** — output depends only on inputs; no side effects.
- **Modulo (`%`)** — remainder after division; splits ms into mins/secs/tenths.
- **padStart** — pad a string to a length: `"7"` → `"07"`.

## 8. Experiments to try on the plane (no internet needed)

1. **Run the drift race.** Open both HTML files in two tabs, start both stopwatches at the same moment, then sit in a *third* tab for two minutes. Return and compare. Expected: the original lags by many seconds; the refactor matches real time on its next repaint.
2. **Exaggerate the lie.** In `original.html`, change `setInterval(..., 100)` to `setInterval(..., 200)` but leave the math alone. Expected: the stopwatch runs at exactly half speed — proof that its "time" is just a tick count wearing a clock costume. Try the same change in the refactor's `setInterval(render, 200)`: the display updates more chunkily, but the time shown stays correct.
3. **Measure pause loss.** In the original, start, then rapidly stop/start ten times, then let it run alongside the refactor for a minute. Expected: the original is visibly short — each pause discarded a fraction of a tick.
4. **Add hundredths.** In the refactor's `formatElapsed`, derive `Math.floor((ms % 1000) / 10)` padded to 2 digits and show `mm:ss.hh`. Expected: a smoother-looking readout; correctness untouched, because formatting is a pure function bolted onto the same truth.
5. **Show lap differences.** In `render`, print each lap as the difference from the previous lap instead of the running total (keep a `prev` variable while looping `state.laps`). Expected: per-lap split times — a real stopwatch feature built purely in the render layer, with zero changes to state or actions.
