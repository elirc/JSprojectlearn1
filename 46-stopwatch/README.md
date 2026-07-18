# 46 — Stopwatch

**Lesson: timers are unreliable narrators — never count ticks; record timestamps and
derive.**

## Run it

Open both files in a browser. Then run the experiment the original suggests: start
each stopwatch, switch to another tab for two minutes, come back. The original is
seconds behind; the refactor is exact.

## What's wrong with the original?

**It uses the timer as the source of truth**: every tick, `tenths++` — elapsed time
*is* the tick count. But `setInterval(fn, 100)` doesn't promise "every 100ms"; it
promises "no sooner than 100ms, whenever the event loop is free." Every tick slips
a few milliseconds, busy pages slip more, and **background tabs get throttled to
once per second or worse** — the browser deliberately withholds ticks you were
counting on. Counting ticks means *accumulating* every one of those errors,
forever. The drift isn't a bug in your code; it's a misunderstanding of what timers
promise.

## What changed in the refactor

- **The clock is the source of truth; the timer only redraws.**
  `elapsed = accumulatedMs + (running ? Date.now() - startedAt : 0)` — one formula,
  derived fresh at every render. The interval carries **zero** time information, so
  its jitter affects display smoothness but never correctness. Return to a
  throttled tab and the very next tick shows the *true* time — the drift class of
  bug is gone by design, not by tuning.
- **Pause/resume is exact** via the two-part representation: `accumulatedMs` banks
  finished run segments; `startedAt` anchors the current one. Stopping banks
  `now - startedAt` — no fraction of a tick is ever lost (the original loses up to
  100ms per pause).
- **Laps fell out for free**: a lap is just `elapsedMs()` recorded into state —
  because elapsed time is a *value you can ask for*, not a counter tangled with
  display. Same story as project 17's cheap pause: right structure → free features.
- The file uses the repo's standard layout — state → actions → render (project 14),
  pure `formatElapsed` (project 23) — so by now it should read like a familiar
  floor plan.

## Key takeaway

`setInterval` is a *request*, not a metronome. For anything where accumulated error
matters — stopwatches, countdowns, animations, sync — record *when things happened*
(timestamps) and *derive* durations from the clock at read time. Ticks are only
good for one thing: deciding when to repaint.
