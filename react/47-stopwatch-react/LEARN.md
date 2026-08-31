# 📘 Learning Guide: Stopwatch (React)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A big digital stopwatch: `00:00.0` in giant monospace digits, with a
start/stop button and a reset button. Start it and the tenths tick up;
stop pauses; start again resumes; reset zeroes it.

Both versions look identical and both *seem* to work. The difference
needs a real-world test: start each one next to your phone's
stopwatch, switch to another browser tab for two minutes, and come
back. The **original is now seconds behind your phone.** The
**refactor shows exactly the right time** the instant you return.

## 2. Concepts you need first

### setInterval, and the promise it does NOT make

`setInterval(fn, 100)` asks the browser to run `fn` every 100
milliseconds. Here's the part that breaks stopwatches: that 100 is a
*minimum*, not a guarantee. The real contract is "no sooner than
100ms, whenever the browser gets around to it." When the tab is busy,
ticks arrive late. When the tab is in the **background**, browsers
deliberately **throttle** timers — slowing them to once per second or
even less, to save battery. Ticks you were counting on simply never
arrive.

```js
const id = setInterval(() => console.log('tick'), 100);
clearInterval(id); // always stop what you start
```

### Counting ticks vs reading the clock (the whole lesson)

Two ways to know how long a stopwatch has run:

- **Count ticks:** keep a counter, add 1 per interval firing, and
  declare "elapsed = ticks × 100ms." This *trusts the timer's
  punctuality* — which we just saw is fiction. Every late or skipped
  tick is time silently lost.
- **Read the clock:** record *when* things happened
  (`Date.now()` — the current time in milliseconds), and compute
  elapsed as `now - startedAt` whenever you need it. The wall clock
  doesn't throttle. Late renders show a slightly older number for a
  moment; they never *lose* time.

```js
const startedAt = Date.now();
// ...any amount of time later, no matter how choppy the timers were:
const elapsedMs = Date.now() - startedAt; // exact
```

The JS track's project 46 taught this without React. The point here:
the framework changed, the physics didn't.

### The two-part time state (running + banked time)

A pausable stopwatch needs slightly more than one timestamp:

```js
{ running: false, startedAt: null, accumulatedMs: 0 }
```

- `accumulatedMs` — time **banked** from previous run stretches;
- `startedAt` — when the *current* stretch began (null when paused);
- elapsed = `accumulatedMs + (running ? now - startedAt : 0)`.

Pausing banks the current stretch (`accumulatedMs += now - startedAt`)
to the exact millisecond — no fraction of a tick is lost.

### Effects with deps and cleanup (quick recap)

`useEffect(fn, [running])` re-runs `fn` when `running` changes; the
function `fn` returns is the **cleanup**, called before the next run
and on unmount. Start the interval when running becomes true; the
cleanup clears it when running becomes false. Projects 17 and 18 teach
this fully. Note: the original gets ALL of this right.

### Updater functions (quick recap)

`setCount((c) => c + 1)` — passing a function — says "add 1 to the
*latest* value," avoiding stale-closure bugs inside timers (project
11's lesson). Also used correctly by the original.

### Derived state at render (quick recap)

Project 09's rule: don't store what you can compute. Here, elapsed
time is *computed from timestamps during render*, not stored. The
freshest possible value, every paint, with nothing to sync.

### The repaint trick (a deliberately cheeky idiom)

If elapsed is derived at render... something still has to *cause*
renders while running, or the digits freeze. The refactor keeps a
dummy state whose only job is to change:

```js
const [, setRepaint] = useState(0);
// in the interval:
setInterval(() => setRepaint((n) => n + 1), 100);
```

`const [, setRepaint]` skips naming the value (we never read it!) and
keeps only the setter. Each call bumps a number nobody looks at —
which makes React re-render — which makes the derivation re-read the
clock. The interval carries **zero time information**, so its
unreliability is harmless: a late tick means a late *repaint*, and the
repaint computes the *true* time anyway.

### Formatting the digits

`Math.floor(x)` rounds down; `%` gives a remainder;
`String(n).padStart(2, '0')` left-pads to two characters ("7" → "07").
From milliseconds: minutes = `ms / 60000`, leftover seconds =
`(ms % 60000) / 1000`, tenths = `(ms % 1000) / 100`, all floored.

## 3. Walking through the original code

Two pieces of state:

```js
const [tenths, setTenths] = useState(0);
const [running, setRunning] = useState(false);
```

`tenths` is the elapsed time — as a *count of interval firings*.
That single design decision is the whole bug. The effect:

```js
useEffect(() => {
  if (!running) return;
  const id = setInterval(() => {
    setTenths((t) => t + 1); // count the tick = trust the timer
  }, 100);
  return () => clearInterval(id);
}, [running]);
```

Read the craftsmanship: correct deps (`[running]`), correct cleanup
(`clearInterval`), correct updater function (`t => t + 1`). Projects
17, 18, and 11, all faithfully applied. And yet.

Display math converts tick-count to digits:

```js
const mins = Math.floor(tenths / 600);
const secs = Math.floor((tenths % 600) / 10);
```

600 tenths = one minute. The buttons toggle `running` and reset
`tenths` to 0.

## 4. What's wrong with it (in beginner terms)

**The model is wrong, not the plumbing.** This is the trap worth
savoring: you can apply every React lesson perfectly and still build
a stopwatch that lies, because the *idea* underneath — "elapsed time
equals ticks received × 100ms" — is false.

Here's the on-screen story. Start the stopwatch and your phone's
side by side. Switch to another tab and read articles for two minutes.
The browser sees a background tab and throttles its timers: instead of
10 firings per second, maybe 1. Each firing still adds exactly +1
tenth. So during those two minutes, the counter gains ~120 tenths
(12 seconds) while the real world moved 120 seconds. Come back:
your phone says 2:00, the app says maybe 0:15. **The missing ticks
never happened, so the time they represented simply vanished.** No
error, no warning — a stopwatch that quietly runs slow whenever life
gets in the way.

Even in a focused tab there's drift: each tick fires *no sooner than*
100ms — meaning a hair late, every time, forever, always in the same
direction. Late ticks accumulate; the counter falls steadily behind.

**Bonus waste:** 10 state updates (and re-renders) per second, forever,
to maintain a number nobody reads between repaints.

## 5. Try it yourself first!

1. **Vague:** the timer is untrustworthy. What *is* trustworthy on
   every device, even in a throttled tab?
2. **Warmer:** `Date.now()`. Store *when* the user pressed start, not
   how many ticks have passed. Derive elapsed as `now - startedAt` in
   the render.
3. **Pause is the tricky part:** stopping must *bank* the elapsed so
   far, so resuming continues instead of restarting. Two fields:
   `accumulatedMs` (banked) and `startedAt` (current stretch). Write
   the start/stop transitions on paper first.
4. **Now the digits freeze while running** — nothing triggers renders
   anymore. Add an interval whose only job is to poke a dummy state
   (`setRepaint(n => n + 1)`) so React redraws and re-reads the clock.
5. **The test:** background the tab two minutes. If your version shows
   the true time on return, you've beaten the original.

## 6. Understanding the refactored solution

**The state is timestamps, not durations:**

```js
const [watch, setWatch] = useState({
  running: false, startedAt: null, accumulatedMs: 0,
});
const [, setRepaint] = useState(0);
```

One object holds *when things happened*; the dummy `setRepaint` state
exists purely to trigger renders.

**The interval carries no time information:**

```js
useEffect(() => {
  if (!watch.running) return;
  const id = setInterval(() => setRepaint((n) => n + 1), 100);
  return () => clearInterval(id);
}, [watch.running]);
```

Same effect hygiene as the original (deps + cleanup) — React's
contribution to this app is exactly this rendering-loop hygiene. But
the tick body doesn't add time; it just requests a repaint. If the
browser throttles it to once per second, you get a choppier display
of a *still-correct* number.

**Start/stop is a two-way transition:**

```js
setWatch((w) =>
  w.running
    ? { running: false, startedAt: null,
        accumulatedMs: w.accumulatedMs + (Date.now() - w.startedAt) }
    : { ...w, running: true, startedAt: Date.now() });
```

Stopping banks the current stretch to the exact millisecond into
`accumulatedMs`. Starting stamps a fresh `startedAt`. Reset returns to
the initial object.

**Elapsed is derived at render, from the clock:**

```js
const elapsedMs = watch.accumulatedMs +
  (watch.running ? Date.now() - watch.startedAt : 0);
```

Every render — whatever caused it, however late it is — reads the
wall clock *now*. Return to a throttled tab and the first render is
already exact. Late ticks cost smoothness, never correctness.

Then the digits: `mins` from `elapsedMs / 60000`, `secs` from the
remainder, `tenths` from the last three digits — same padding as
before.

**The division of labor, worth noticing:** React contributed effect/
cleanup discipline; the JS track contributed the correct model of
time. Neither substitutes for the other — a framework manages
rendering, and it cannot repair a wrong model of the world.

**One contrast to file away:** project 26 warns against state updates
that exist only to re-render. This is the legitimate exception — the
screen genuinely must change 10 times a second, so a render per tick
is the *point*, and the trick is honest about it (the state is
nameless and unread).

## 7. Words you learned (glossary)

- **setInterval / clearInterval:** schedule a repeating callback /
  cancel it.
- **Throttling:** browsers slowing background-tab timers to save
  battery.
- **Tick:** one firing of an interval callback.
- **Tick counting:** measuring time by counting firings — trusting
  timer punctuality (the bug).
- **Wall clock:** the device's real time-of-day clock; `Date.now()`
  reads it in milliseconds.
- **Timestamp:** a recorded moment ("startedAt = 1724246400000"), as
  opposed to a duration.
- **Drift:** accumulated error between counted time and real time.
- **Banked time (`accumulatedMs`):** milliseconds locked in from
  finished run stretches.
- **Derived value:** computed at render from state (here: elapsed
  from timestamps + clock).
- **Repaint state:** a dummy state bumped only to cause re-renders.
- **Cleanup function:** what an effect returns; React runs it before
  re-running the effect or on unmount.
- **Dependency array:** the `[running]` list telling the effect when
  to re-run.
- **Updater function:** `set(x => ...)` — update based on the latest
  value, safe inside timers.
- **Stale closure:** a function trapped with old state values
  (project 11).
- **Math.floor / % / padStart:** round down / remainder / left-pad a
  string.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load. (Good news: the backgrounding experiment itself needs no
network once the page is open.)

1. **Run the head-to-head.** Open both versions in two tabs, start
   both, then leave them backgrounded for two minutes while you use a
   third tab. Expected: original several seconds (or more) behind;
   refactor exact on the first frame after you return.
2. **Slow the repaint on purpose.** In the refactor, change the
   interval to `1000`. Expected: digits update once a second (choppy
   tenths), but stop it after a while and the total is still exact.
   Do the same in the original (interval 1000, still adding +1 tenth
   per tick): it now runs at one-tenth speed — the display IS the
   time there, so breaking the timer breaks the time.
3. **Test pause precision.** In the refactor, start, wait ~2.55s,
   stop, and note the digits; start and stop again quickly a few
   times. Expected: resumes continue seamlessly — `accumulatedMs`
   banks exact milliseconds, not whole ticks. In the original,
   pause/resume can only ever hold whole tenths that were counted.
4. **Add a lap button.** On click, push the current derived
   `elapsedMs` into a `laps` array state and render the list
   formatted. Expected: works with five new lines — because "current
   elapsed" is always available as a derivation, laps are just
   snapshots of it.
5. **Remove the repaint interval entirely.** Delete the effect in the
   refactor. Expected: the digits freeze while running — but click
   stop and the banked time is *still correct*. Proof on screen that
   time never lived in the ticks; they were only wake-up calls for
   the renderer.
