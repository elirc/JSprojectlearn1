# 📘 Learning Guide: useInterval

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

An auto-advancing slideshow: a big emoji slide (🌅 sunrise, 🏔 mountain, 🌊 ocean, 🌲 forest), a speed slider (advance every 200ms–2000ms), and — in the refactor — a pause/resume button.

The original contains **two attempts**, switchable with A/B buttons, and both are broken in instructive ways: attempt A gets stuck flipping between the first two slides forever and ignores the speed slider; attempt B works, but secretly tears down and restarts its timer on every single tick. The refactor cycles all slides, retunes speed live, and pauses cleanly — using a famous little hook called `useInterval` built on the **latest-ref pattern**.

## 2. Concepts you need first

### Renders are snapshots; closures capture them (the stale closure)

Each render of a component is a fresh run of its function, with that moment's state values as plain local constants. Any function created during a render — including an interval callback — *closes over* those constants and remembers them forever:

```jsx
const [count, setCount] = useState(0);
useEffect(() => {
  setInterval(() => {
    setCount(count + 1);  // `count` is frozen at 0 — this render's value
  }, 1000);
}, []); // effect ran once, so the callback is from the FIRST render, forever
```

Every tick computes `0 + 1`. The display goes to 1 and stays. This is a *stale closure*: a long-lived function reading short-lived (frozen) values. Project 11 of this track is devoted to it; here it's the villain of attempt A.

### Updater functions dodge one kind of staleness

`setCount((c) => c + 1)` doesn't read the closed-over `count` at all — React hands the updater the *latest* value. This fixes staleness **for that one state variable**. But it can't help the callback read anything else fresh (props, other state, a changed delay). It's a patch, not the general cure.

### Honest deps force a dilemma

Project 17's honest rule: everything the effect reads goes in the deps array. But for a timer:

- Leave state out of deps (attempt A): the interval lives long but its brain is frozen. Stale.
- Put state in deps (attempt B): the brain is fresh, but the interval is torn down and rebuilt **every time that state changes** — for a slideshow that advances `index` every tick, that means every tick.

A restarted-every-tick interval isn't really an interval; it's a chain of one-shot timeouts. Fine-ish for a toy, but the moment anything time-sensitive lives in it — drift correction, "time already elapsed," pause bookkeeping — resetting the timer resets that too. The dilemma is real: **the timer wants one long lifetime; the callback wants a fresh new one every render.** The deps array can only give both the *same* lifetime.

### `useRef` — the box that survives renders

`useRef(x)` returns a stable object `{ current: x }` — the **same object** on every render of that component. You can write `.current` any time, and writing it does **not** cause a render. (Project 15 used refs to hold DOM nodes; project 26 explores refs for values in depth.)

```jsx
const box = useRef(0);
box.current = 42;      // no render, just a write
console.log(box.current); // always the latest thing written
```

### The latest-ref pattern (this project's big idea)

Split the two lifetimes. Keep the *callback* in a ref, refreshed every render; give the *timer* an effect whose deps only include what genuinely restarts it (the delay):

```jsx
const savedCallback = useRef(callback);
useEffect(() => { savedCallback.current = callback; });      // every render: refresh the brain
useEffect(() => {
  const id = setInterval(() => savedCallback.current(), delay); // read THROUGH the ref at tick time
  return () => clearInterval(id);
}, [delay]);                                                  // restart only when speed changes
```

The interval callback `() => savedCallback.current()` never goes stale — it captures only the ref *box*, which never changes; the box's *contents* are re-written each render with a closure over the newest state. At tick time it reaches through the box to the fresh world. One long-lived timer, many short-lived brains.

### Odds and ends used here

- `(i + 1) % SLIDES.length` — `%` is remainder; this wraps 3+1 back to 0. The classic "cycle through a list" formula.
- `<input type="range" ...>` — a slider; `e.target.value` is a *string*, hence `Number(...)`.
- Passing `null` as a delay — a *sentinel value*: a special value meaning "no timer at all" (pause).
- Prereqs: effects/deps (project 17's LEARN.md), cleanup + `setInterval`/`clearInterval` (18), custom hooks (22).

## 3. Walking through the original code

**Shared state:**

```jsx
const [index, setIndex] = useState(0);
const [delay, setDelay] = useState(1000);
const [attempt, setAttempt] = useState('A');
```

Which slide, how fast, and which broken attempt is active (each effect starts with `if (attempt !== 'X') return;` so only one runs).

**Attempt A — stale closure + missing dep:**

```jsx
const id = setInterval(() => {
  setIndex(index + 1 >= SLIDES.length ? 0 : index + 1);
}, delay);
return () => clearInterval(id);
}, [attempt]);
```

Deps are `[attempt]` only — effectively "once." The callback froze `index` at 0, so every tick computes `0 + 1`: the show flips 0 → 1, then "1" again, forever (each `setIndex(1)` after the first changes nothing; you see 0↔1 because switching attempts re-runs the effect). And `delay` isn't a dep, so dragging the slider does nothing — the interval keeps the speed it was born with. Cleanup is present; leaking isn't the sin here.

**Attempt B — honest deps, restarting timer:**

```jsx
const id = setInterval(() => {
  setIndex((i) => (i + 1 >= SLIDES.length ? 0 : i + 1));
}, delay);
return () => clearInterval(id);
}, [attempt, delay, index]);
```

The updater `(i) => ...` fixed staleness. But `index` sits in the deps, and the callback *changes* `index` every tick — so each tick triggers cleanup-and-restart of the interval. It works on screen! The file's comment explains why it's still wrong: an interval that never survives one full period is secretly a setTimeout chain, and any pause behavior, drift correction, or elapsed-time bookkeeping would be reset with every restart.

## 4. What's wrong with it (in beginner terms)

**Attempt A, on screen:** the slideshow shows sunrise, then mountain... then mountain, mountain, mountain. Stuck. You drag the speed slider from 1000ms to 200ms — nothing changes. Two symptoms, one cause: the interval's callback and settings are frozen photocopies from the render where the effect ran. The timer is alive; its knowledge is dead.

**Attempt B, on screen:** everything looks right! Slides cycle, the slider works. The wrongness is architectural, visible only if you add a `console.log` in the cleanup: it fires **every second**. Your "1000ms interval" never once completes two ticks. Imagine adding "pause after 10 seconds of ticking" — your elapsed count would reset every tick. Imagine correcting drift — there's no continuity to correct. B is a trap that *ships*, then makes every future timer feature mysteriously buggy.

**The general shape:** one long-lived thing (a timer — but equally an event listener, a socket subscription, an animation loop) needs to see many short-lived worlds (renders). Deps offer only "rebuild the long-lived thing whenever the world changes" or "let it go stale." Both are wrong. That's not a missing React feature — it's the signal that *two lifetimes are living in one effect* and need separating.

## 5. Try it yourself first!

1. **Vague hint:** attempt A's timer has the right lifetime but a stale brain; attempt B has a fresh brain but the wrong lifetime. Can you give the timer A's lifetime and B's brain?
2. **Tool hint:** what React container can you *write* on every render without causing renders, and *read* at any moment getting the latest value? (Not state — writing state renders. It's the other box.)
3. **Recipe:** `const savedCallback = useRef(cb)`. One effect with **no deps array** that does `savedCallback.current = cb` (runs every render — that's the point). A second effect, deps `[delay]`, that starts `setInterval(() => savedCallback.current(), delay)` and returns its `clearInterval`.
4. **Package it:** wrap those pieces as `function useInterval(callback, delay)` (custom-hook mechanics: project 22). The app becomes `useInterval(() => setIndex(i => (i+1) % SLIDES.length), delay)`.
5. **The pause puzzle:** how would you pause *declaratively* — no `clearInterval` calls in handlers? Hint: what if `delay === null` made the interval effect start nothing at all?
6. **Verify:** all four slides cycle; the slider retunes live; a cleanup `console.log` fires only when you *move the slider*, not every tick.

## 6. Understanding the refactored solution

**The hook (Dan Abramov's classic `useInterval`):**

```jsx
function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback; // always the newest closure
  });

  useEffect(() => {
    if (delay === null) return; // paused: no interval at all
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

Piece by piece:

- **The ref effect has no deps array** — deliberately. It runs after *every* render, stashing that render's fresh callback (with its fresh closed-over state) into the box. Cheap: one assignment.
- **The interval effect deps on `[delay]` only.** The timer starts once per speed setting. Its callback captures only `savedCallback` — the never-changing box — so it can't go stale; each tick reads `.current` *at fire time* and gets the newest brain.
- **`delay === null` means paused.** The effect simply starts nothing (and the previous interval was already cleaned up when `delay` changed). Pause isn't an action you perform; it's a state you're in — declarative, like everything else in React.

**Usage:**

```jsx
useInterval(() => {
  setIndex((i) => (i + 1) % SLIDES.length);
}, paused ? null : delay);
```

Reads like a sentence: "advance the slide every `delay` ms — unless paused." No handler ever touches `clearInterval`; the pause button just flips a boolean, and the effect machinery reconciles reality to match.

**Where else this pattern shows up:** anywhere long-lived meets fresh — a window event listener that must read current state, a socket subscription's message handler, a `requestAnimationFrame` loop. The recipe is always: effect for the resource (deps = what truly restarts it), ref for the fresh-every-render part, read through the ref at fire time.

## 7. Words you learned (glossary)

- **Stale closure** — a long-lived function still reading values frozen from an old render.
- **Updater function** — `setX((old) => new)`; gets the latest state, dodging staleness for that variable only.
- **Restart churn** — tearing down and rebuilding a resource (timer) on every change of a dep.
- **setTimeout chain** — what a restarted-every-tick "interval" really is.
- **Two lifetimes problem** — one effect containing a long-lived resource and a fresh-per-render behavior.
- **`useRef`** — hook returning a stable `{ current }` box; writes don't render, reads are always latest.
- **Latest-ref pattern** — refresh a ref with the newest callback every render; long-lived code calls `ref.current()` at fire time.
- **Read at fire time** — deferring the "which function?" lookup until the moment of the tick.
- **Declarative pause** — expressing "paused" as data (`delay: null`) instead of imperative stop/start calls.
- **Sentinel value** — a special value (like `null`) carrying meaning ("no timer") beyond its type.
- **`%` (modulo)** — remainder; `(i + 1) % n` wraps a counter to cycle 0..n-1.
- **Drift** — accumulated timing error in repeated timers; fixable only if the timer has continuity.
- **`requestAnimationFrame`** — browser API for animation-loop callbacks; another latest-ref customer.

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): first load pulls React from the internet; the slideshow itself is local. Predict offline; verify when connected or if cached.

1. **See B's churn with your own eyes.** In `original.html`, attempt B's effect, add `console.log('interval started')` before `setInterval` and `console.log('interval killed')` in the cleanup. Prediction: the pair logs every single tick. Then do the same in the refactor's interval effect: it logs only when you drag the speed slider or toggle pause.
2. **Break the latest-ref on purpose.** In the refactor's hook, change the first effect to have `[]` deps (so the ref is written only once). Prediction: the ref holds the first render's callback forever — with the *updater* inside, the slideshow still cycles (updaters dodge staleness for `index`), so make the bug visible: change the app's callback to `setIndex(index + 1 >= SLIDES.length ? 0 : index + 1)` (no updater). Now it sticks at slide 1, attempt-A style. Two safety nets, and you removed both.
3. **Pause and resume mid-cycle.** In the refactor, pause, wait, resume. Prediction: resuming starts a *fresh* full `delay` before the next advance (the old interval was destroyed at pause; a new one starts at resume). Question to ponder: how would you make resume "remember" a half-elapsed tick? (You'd need elapsed-time bookkeeping — exactly the thing attempt B's restarts would have trashed.)
4. **A second consumer, free of charge.** Add `useInterval(() => setSeconds((s) => s + 1), 1000)` with a small `seconds` state and render "on screen for {seconds}s". Prediction: both intervals run independently (per-call-site state, project 22) — a live counter alongside the slideshow, three lines total.
5. **Speed slider at the extremes.** Drag to 200ms, then to 2000ms while watching. Prediction: the change applies at the *next* interval start — smooth retuning, because `[delay]` restarts the timer exactly once per adjustment, not per tick. In attempt A, repeat the same drag: nothing ever changes, no matter how long you wait.
