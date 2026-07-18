# React 47 — Stopwatch

**Lesson: js#46's "never count ticks" survives frameworks — React state should
hold *timestamps*, and elapsed time should be derived at render.**

## Run it

Run each stopwatch next to your phone's, background the tab two minutes, come
back: the original is seconds behind; the refactor is exact.

## What's wrong with the original?

Here's the trap worth savoring: **all the React is correct.** Deps (17),
cleanup (18), updater function (11) — every plumbing lesson applied. The
*model* is wrong: `tenths` counts interval firings, and `setInterval(100)`
promises only "no sooner than 100ms, when the browser feels like it."
Background tabs throttle to once a second or slower; every late tick is time
silently lost. js#46 taught this exact bug — the framework changed, the
physics didn't. (Bonus waste: 10 renders/second forever, to maintain a number
nobody reads between repaints.)

## What changed in the refactor

- **State is js#46's shape**: `{ running, startedAt, accumulatedMs }` — *when
  things happened*, not "how much time." Elapsed is **derived at render** from
  `Date.now()` (project 09 meets js#46): late repaints cost smoothness, never
  correctness. Return to a throttled tab and the first render shows true time.
- **The interval's only job is repaint** — `setRepaint(n => n + 1)` is a
  deliberate, slightly cheeky idiom: state whose only purpose is "please
  render again so the derivation re-reads the clock." The interval carries
  zero time information, so its unreliability is harmless. (Contrast with
  project 26: this is the one case where you *want* a render per tick — the
  screen genuinely changes.)
- **Pause banks exact milliseconds**: stopping adds `now - startedAt` into
  `accumulatedMs` — no fraction-of-a-tick lost, same two-part representation
  as js#46.
- Worth noticing the division of labor: React contributed the *rendering
  loop hygiene* (effect + cleanup keyed on `running`); the JS track
  contributed the *correct model of time*. Neither substitutes for the other.

## Key takeaway

Frameworks manage *rendering*; they can't repair a wrong model of the world.
Whenever elapsed time, speed, or scheduling matters, the model is always:
record timestamps in state, derive durations from the clock at read time, and
let timers do nothing but wake up the renderer.
