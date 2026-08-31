# 📘 Learning Guide: Pomodoro Timer

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A Pomodoro timer web page. "Pomodoro" is a focus technique: work for 25 minutes, take a 5-minute break, repeat. Open the HTML file in a browser and you see a big countdown (`25:00`), the current phase (`work` or `break`), and Start / Pause / Reset buttons. Click Start and the clock ticks down: `24:59`, `24:58`... When it reaches `00:00`, the page tells you your work block is done and automatically starts a 5-minute break countdown. There's no typed input — you interact by clicking buttons, and the output is the ever-updating display (plus a notification when a phase ends).

## 2. Concepts you need first

**HTML elements and the DOM.** An HTML file describes a page with tags like `<div>` (a box), `<button>`, and `<h1>` (a heading). The browser turns them into live objects called the **DOM** (Document Object Model). JavaScript can grab an element by its `id` and change it:

```js
// with <div id="time">25:00</div> on the page:
const el = document.getElementById("time");
el.textContent = "24:59";  // the page instantly shows 24:59
```

**Events and handlers.** An **event** is "something happened" — a click, a key press. A **handler** is the function you attach to run when it happens:

```js
document.getElementById("primary").onclick = () => console.log("clicked!");
// clicking the button prints: clicked!
```

**Timers: setInterval and clearInterval.** `setInterval(fn, ms)` asks the browser to run `fn` roughly every `ms` milliseconds (1000 ms = 1 second). It returns a handle you can pass to `clearInterval` to stop it:

```js
let n = 0;
const handle = setInterval(() => console.log(++n), 1000);
// prints 1, 2, 3... once per second, forever — until:
clearInterval(handle);
```

The word "roughly" matters: the browser makes no exact promise. A busy page runs ticks late, and a **background tab** (one you switched away from) gets **throttled** — the browser slows its timers to about once per minute to save battery.

**Timestamps and Date.now().** A **timestamp** is a moment in time as one big number: milliseconds since January 1, 1970. `Date.now()` gives you the current one:

```js
const start = Date.now();     // e.g. 1770000000000
// ...later...
console.log(Date.now() - start); // ms elapsed, e.g. 3021
```

Key insight for this project: subtracting timestamps measures *real* time, no matter how late or rarely your code runs. A timestamp can't drift, because it isn't counting — the clock is.

**State and state machines.** **State** is the data describing "where the program is right now". A **state machine** is a design where you list the few legal states by name (here: `idle`, `running`, `paused`) and only move between them via defined **transitions** (Start, Pause, Reset). The alternative — several independent booleans like `running` and `onBreak` — silently allows nonsense combinations no one designed.

**Objects and replacing state wholesale.** The refactor stores state as one object, and each transition *replaces* it:

```js
let state = { status: "idle", phase: "work" };
state = { status: "running", phase: "work", endsAt: Date.now() + 5000 };
console.log(state.status); // "running"
```

Notice each state carries only the data that makes sense for it: `running` has `endsAt`, `paused` has `remainingMs`, `idle` has neither.

**Template literals.** Strings in backticks that can embed values with `${...}`:

```js
const mins = 25;
console.log(`${mins}:00 — Pomodoro`); // "25:00 — Pomodoro"
```

**Math.floor, Math.ceil, and padStart.** `Math.floor` rounds down, `Math.ceil` rounds up. `padStart(2, "0")` pads a string to 2 characters with zeros — how `5` becomes `05`:

```js
console.log(Math.floor(4.9)); // 4
console.log(Math.ceil(4.1));  // 5
console.log(String(5).padStart(2, "0")); // "05"
```

**The Notifications API.** Browsers can show small system pop-ups even when the tab isn't focused — but only after the user grants permission. `Notification.requestPermission()` asks; `new Notification("title", { body })` shows one. Permission starts as `"default"` (not asked yet) and becomes `"granted"` or `"denied"`. Browsers distrust permission requests that fire on page load; asking during a *click* is the polite, reliable way.

**alert().** The old-school pop-up: `alert("hi")` shows a dialog and **freezes the whole page** until dismissed. Nothing runs, nothing repaints. That's why it's the wrong notification tool.

## 3. Walking through the original code

The state is three loose variables:

```js
var secondsLeft = 25 * 60;
var running = false;
var onBreak = false;
var timer = null;
```

`secondsLeft` is the countdown as a plain number (1500 seconds). `running` and `onBreak` are booleans; `timer` holds the interval handle.

```js
function start() {
  running = true;
  timer = setInterval(tick, 1000);
}
```

Start flips the flag and asks the browser to run `tick` every second. Note what's *missing*: no check whether an interval already exists.

```js
function tick() {
  secondsLeft = secondsLeft - 1;
  if (secondsLeft <= 0) {
    alert(onBreak ? "Break over!" : "Time for a break!");
    onBreak = !onBreak;
    secondsLeft = (onBreak ? 5 : 25) * 60;
  }
  show();
}
```

Each tick subtracts one second — *assuming* exactly one second passed. At zero it alerts, flips the phase, and reloads the counter.

```js
function show() {
  var m = Math.floor(secondsLeft / 60);
  var s = secondsLeft % 60;
  document.getElementById("time").textContent =
    (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
```

`show` turns seconds into `MM:SS` (the `%` is remainder: `125 % 60` is `5`) and writes it into the page.

## 4. What's wrong with it (in beginner terms)

**1. Time is counted, not measured.** `secondsLeft--` trusts that each tick means one real second. But switch tabs to do your actual work (the whole point of a pomodoro!) and the browser throttles the tab to ~1 tick per minute. Come back 30 real minutes later and the display says `24:37`. The one job of this product — "tell me when 25 minutes have passed" — silently fails, and you can't even tell it failed.

**2. Boolean-pile state.** `running`, `onBreak`, and `timer` are independent, so impossible combinations can exist: `running === false` while an interval is still ticking, for example. Nobody designed those states, so no code handles them. Each new feature (a "long break"? a pause-during-break?) multiplies the untested combinations and the `if` soup.

**3. Double Start = double speed.** Click Start twice and you have *two* intervals, each subtracting a second every second. Your 25-minute block ends in 12.5 minutes. Worse: `timer` only remembers the second handle, so Pause kills one interval and the other ticks on forever — now even Reset can't fully stop it.

**4. alert() as the bell.** `alert` freezes the page, and you only notice it promptly if you're staring at the tab — which, mid-work-block, you never are. Also, while the alert sits there frozen, ticks keep queuing behind it, so dismissing it late makes time jump.

## 5. Try it yourself first!

Try fixing `original.html` before peeking at the refactor:

1. Start with bug 3, the easiest: what one-line guard at the top of `start()` prevents a second interval?
2. For the drift bug: stop asking "how many ticks fired?" and start asking "what time is it *now*, and when should this phase *end*?"
3. Concretely: when Start is clicked, compute `endsAt = Date.now() + secondsLeft * 1000` and store *that*. Each tick, derive `remaining = endsAt - Date.now()`. The tick stops carrying time information — it just redraws.
4. What should Pause store, given there's no end moment anymore while paused? (Answer: the remaining milliseconds, frozen.)
5. Replace the booleans with one object: `{ status: 'idle' | 'running' | 'paused', phase: 'work' | 'break', ... }`, and make every button a pure "old state in, new state out" function.
6. Swap `alert` for `new Notification(...)`, requesting permission inside the Start click handler, with a fallback (like changing `document.title`) when permission is denied.

## 6. Understanding the refactored solution

**Config up top.** `DURATIONS_MS` maps each phase to its length in milliseconds; `NEXT_PHASE` maps work → break → work. Changing pomodoro lengths is now a one-line edit.

**One state object, four legal shapes.** `state` is always one of: `{status:'idle', phase}`, `{status:'running', phase, endsAt}`, or `{status:'paused', phase, remainingMs}`. The data each state carries is only the data that makes sense for it — "paused but also running" literally cannot be written.

**`remainingMs()` derives, never stores.**

```js
if (state.status === 'running') return Math.max(0, state.endsAt - now);
if (state.status === 'paused') return state.remainingMs;
return DURATIONS_MS[state.phase];
```

The display value is *computed from the clock* every time. `Math.max(0, ...)` stops it going negative if a tick lands late.

**One button, two transitions.** `primaryAction()` checks the current status: running → become paused (freezing `remainingMs`); anything else → become running (computing a fresh `endsAt`). A second Start click while running is just... a Pause. No path creates a second interval, because the interval is started once, at page load, and never multiplied.

**The tick is dumb on purpose.** `setInterval(..., 250)` only redraws, and checks whether `remainingMs() === 0` to call `phaseComplete()`. If the tab slept for ten minutes, the first tick after waking sees 0 remaining and completes the phase — as if it had been watching all along. The interval's unreliability stopped mattering because it carries no time.

**Polite notifications.** Permission is requested inside the Start *click* (`requestNotifyPermission`), because browsers penalize permission prompts not tied to a user gesture. `notify()` shows a system notification if granted, and *always* also writes the message into `document.title` — the browser tab's text — so even "denied" users see the bell.

**`Math.ceil` in the formatter.** With 1,499,900 ms left, `floor` would show `24:59` the instant you start; `ceil` shows `25:00`. One character, and it's the difference users notice first.

There is no test file for this project — the behavior is visual, so the browser is the test bench.

## 7. Words you learned (glossary)

- **Pomodoro** — a 25-minutes-work / 5-minutes-break focus technique.
- **DOM** — the browser's live object tree of the page that JavaScript edits.
- **Element / id** — a page item, and the name used to find it from code.
- **textContent** — the property that sets an element's visible text.
- **Event / handler** — something happening (a click) / the function that responds.
- **setInterval / clearInterval** — run a function repeatedly / stop doing so.
- **Throttled tab** — a background tab whose timers the browser slows way down.
- **Drift** — a counted clock sliding away from real time.
- **Timestamp** — a moment as milliseconds since Jan 1, 1970.
- **Date.now()** — the current timestamp.
- **State** — the data describing where the program is right now.
- **State machine** — a design with named states and defined transitions between them.
- **Transition** — a legal move from one state to another.
- **Boolean** — a true/false value.
- **Template literal** — a backtick string with `${...}` slots.
- **Math.floor / Math.ceil** — round down / round up.
- **padStart** — pad a string's front to a length (`"5"` → `"05"`).
- **Notifications API** — browser system pop-ups, gated behind user permission.
- **User gesture** — a real user action (click, keypress) browsers trust.
- **alert()** — a dialog that freezes the page until dismissed.
- **document.title** — the text shown in the browser tab.

## 8. Experiments to try on the plane (no internet needed)

Both HTML files open straight from disk in any browser — fully offline. (Only the system notification pop-up may behave differently per browser; the title-bar fallback always works.)

1. **See the double-speed bug live.** Open `original.html`, click Start twice, and watch the clock: it drops two seconds per second. Then click Pause — one interval survives and keeps ticking. Try the same double-click in `refactored/index.html`: the second click just pauses. Expected: original misbehaves, refactor doesn't.
2. **Shrink the durations.** In `refactored/index.html`, change `DURATIONS_MS` to `{ work: 10_000, break: 5_000 }` (10s / 5s). Expected: you can watch a full work → break → work cycle in under a minute, with the background turning green during breaks.
3. **Prove the timestamp survives sleeping.** With short durations set, click Start, then switch to another tab (or minimize) past the end time, and come back. Expected: the refactor has already completed the phase correctly; the original (same experiment) is still mid-countdown, late.
4. **Add a "long break".** In the refactor, add `long: 15 * 60_000` to `DURATIONS_MS` and change `NEXT_PHASE` so `break` leads to `work` but every so often to `long` (simplest: a counter of completed work blocks; every 4th break becomes `long`). Expected: the phase label shows `long` after the 4th work block. This tests whether the state-machine shape really made features easy.
5. **Break the ceil on purpose.** Change `Math.ceil` to `Math.floor` in `formatMs`. Expected: a fresh timer shows `24:59` the moment you press Start — now change it back and appreciate the character.
