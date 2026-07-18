# React 11 — Stale closures & updater functions

**Lesson: every render is a snapshot; closures capture it. When next-state depends
on current-state, use `set(current => next)`.**

## Run it

Open `original.html`: the auto-ticker counts 0 → 1 and freezes; the "+3" button
adds 1. The refactor: ticks forever, +3 adds 3.

## What's wrong with the original?

Both bugs are the same misunderstanding, at two speeds:

1. **The frozen ticker.** The interval callback was created during the *first*
   render, so it closed over that render's `count` — `0` — forever
   (js#27/28's closure mechanics, now biting instead of helping). Every tick
   computes `setCount(0 + 1)`. The empty deps array froze the closure; listing
   `count` in deps would "fix" it by tearing down and recreating the interval
   every second — working, but wasteful and subtly janky. Neither is the answer.
2. **+3 gives +1.** All three `setCount(count + 1)` lines read the same
   snapshot value (5 → schedule 6, schedule 6, schedule 6). `setCount` doesn't
   change the local `count` — it schedules a future render; within this function
   run, `count` never moves. React also batches the three calls into one render,
   but batching isn't the bug — the stale reads are.

## What changed in the refactor

- **The updater form**: `setCount((current) => current + 1)`. React invokes the
  function *at update time* with the live value — no captured variable, nothing
  to go stale. The ticker works with honest empty deps (the effect now uses zero
  render-scope values); the three updaters chain 5 → 6 → 7 → 8.
- **The rule that falls out**: writing `set(x + 1)`, `set([...x, item])`,
  `set({...x, k: v})` — any next-state-from-current-state — should reflexively
  become the updater form. Reading current state to *display* it is what the
  snapshot is for; reading it to *compute the successor* is what updaters are
  for.
- The page states the mental model worth memorizing: **a render is a snapshot**.
  Props, state, and everything derived are frozen per render; handlers and
  effects close over that frozen world. Most "React is being weird" moments —
  including project 19's fetch races — are this model, unlearned.

## Key takeaway

`useState`'s setter has two calling conventions for two questions. New value
unrelated to old → pass the value. New value *derived from* old → pass a
function. Get that reflex right and stale-closure bugs mostly stop existing.
