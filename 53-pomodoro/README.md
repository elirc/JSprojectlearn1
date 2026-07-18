# 53 — Pomodoro timer

**Lesson: a countdown is a future timestamp, not a number you decrement —
plus a real state machine and polite notifications.**

## Run it

Open `original.html` and `refactored/index.html` in a browser.
The drift bug is easiest to see by starting the original and switching
tabs for a few minutes.

## What's wrong with the original?

1. **Time is counted, not derived.** `secondsLeft--` every tick assumes
   `setInterval` fires exactly every 1000ms. It doesn't — and background
   tabs get throttled to roughly one tick per *minute*. In project 46 (the
   stopwatch) drift was cosmetic; here the entire product is "tell me when
   25 minutes have passed", so drift is the product failing.
2. **Boolean-pile state.** `running` + `onBreak` + a timer handle can
   combine into states that don't exist. Project 40's lesson, unlearned.
3. **Click Start twice → two intervals**, time runs at double speed.
   Nothing prevents it.
4. **`alert()` as the notification** — it blocks the page and you only see
   it promptly if the tab is focused, which during a work block it never is.

## What changed in the refactor

- **`endsAt` timestamp instead of a countdown.** `remaining = endsAt − now`.
  Throttling, jitter, even a suspended laptop can't move a timestamp. When a
  throttled tab wakes, the first tick sees `remaining === 0` and completes
  the phase exactly as if it had been watching all along.
- **Four-state machine** (project 40): `idle`, `running {endsAt}`,
  `paused {remainingMs}` — which *data* exists depends on the state, so
  "paused but also running" is unrepresentable, and a second Start click is
  just a transition from `running` that starts nothing new.
- **The interval only redraws and checks** (project 46) — it carries no
  time information, so its reliability is irrelevant to correctness.
- **Notifications API done politely**: permission requested on the first
  Start *click* (browsers penalize requests not tied to a user gesture),
  with a title-bar fallback when denied or unsupported.
- `Math.ceil` in the formatter so a fresh timer shows `25:00`, not `24:59` —
  the kind of one-character bug users notice instantly.

## Key takeaway

Never store durations that decay — store the moments things happen(ed) and
derive everything else from the clock. This is the same principle as the
stopwatch, pointed the other direction in time: past anchors for elapsed,
future anchors for remaining. The clock is the single source of truth;
your variables just annotate it.
