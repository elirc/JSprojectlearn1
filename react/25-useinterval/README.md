# React 25 — useInterval

**Lesson: the latest-ref pattern — when one long-lived thing (a timer) needs to
see many short-lived worlds (renders).**

## Run it

Open `original.html`: attempt A flips between slides 0↔1 forever with a dead
speed slider; attempt B works by restarting the interval every tick. The
refactor cycles all slides, retunes live, and pauses declaratively.

## What's wrong with the original?

The two attempts are the two horns of a real dilemma:

- **Attempt A (empty-ish deps)**: one long-lived interval whose callback closed
  over the *first* render — stale closure (project 11), so `index + 1` computes
  from a frozen `index`. And `delay` isn't a dep, so the slider does nothing.
- **Attempt B (honest deps)**: updater function fixes staleness, but `index` in
  the deps tears down and restarts the interval *every tick*. A timer that
  never survives one period is secretly a setTimeout chain — fine-ish here,
  a mess once anything time-sensitive (drift correction, pause, elapsed time)
  lives in it.

The dilemma is general: **the timer wants one lifetime, the callback wants
another.** Deps can't express "keep the interval, refresh its brain."

## What changed in the refactor

- **`useInterval(callback, delay)` splits the lifetimes** with the
  **latest-ref pattern**:
  1. `savedCallback = useRef(...)`, updated by a no-deps effect every render —
     the ref always holds the newest closure (refs are the mutable box that
     survives renders; project 26 goes deeper).
  2. The interval effect deps only on `[delay]`; each tick calls
     `savedCallback.current()` — reaching *through* the ref to the fresh world.
  The timer restarts only when the speed changes; the tick always sees current
  state.
- **`delay: null` means paused** — the effect simply starts nothing. Pause
  became a declarative input instead of an imperative `clearInterval` call:
  `useInterval(fn, paused ? null : delay)` reads like a sentence.
- This is Dan Abramov's classic `useInterval`, and the latest-ref idea inside
  it recurs anywhere long-lived things meet fresh state: event listeners,
  subscriptions (js#38 + this = a solid `useEmitter`), animation loops.

## Key takeaway

When deps force a false choice — stale closure vs. constant restart — you have
two lifetimes in one effect. Separate them: effect for the long-lived resource
(deps = what actually restarts it), ref for the fresh-every-render part, and
read through the ref at fire time.
