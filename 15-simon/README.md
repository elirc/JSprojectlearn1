# 15 — Simon

**Lesson: async/await turns timing pyramids into straight-line code; a phase variable
beats a pile of boolean flags.**

## Run it

Open `original.html` and `refactored/index.html` in a browser. Same game, same feel.

## What's wrong with the original?

1. **The scheduling pyramid.** To flash the sequence, the original computes every
   flash's start time up front (`i * 700`) and nests setTimeout three deep. The numbers
   `700`, `400`, `250` must stay mutually consistent by hand — `700` *is* `400 + 300`,
   but nothing says so. Worse, "what happens after the sequence ends" lives *inside*
   the loop, inside the third callback, guarded by `if (i == sequence.length - 1)`.
   Sequential intent, scattered into fragments.
2. **The `accepting` boolean.** Input control is a flag that five different places
   must remember to flip correctly. Each new feature ("replay button", "demo mode")
   adds more places to forget.
3. The IIFE `(function(i) {...})(i)` exists only to dodge the `var`-in-loop capture
   bug — a workaround for a problem `let`/`const` simply don't have.

## What changed in the refactor

- **`sleep(ms)` — the one-line bridge from callbacks to async.**
  `new Promise(resolve => setTimeout(resolve, ms))` lets any async function *wait*.
  This is the single most reusable line in this repo.
- **`playSequence` reads like the rules of the game:** *for each color: flash, gap;
  then it's your turn.* Same behavior as the pyramid, written as a straight line.
  The "what happens next" now appears *after* the loop, where it belongs. Timing
  changes? The `for` loop derives the schedule; nothing to keep consistent.
- **All durations in one `TIMING` object** — the magic-number lesson from project 03,
  applied to time.
- **`phase` replaces the boolean flag.** The game is always in exactly one of
  `idle | showing | listening | gameover`, and handlers ask `if (phase !==
  'listening') return`. This is a baby **state machine** — the standard cure for
  flag-soup. You can't be "accepting input" and "showing the sequence" at once,
  because one variable can't hold two values.
- One subtle line: `flash(color)` in the click handler is deliberately **not**
  awaited, so the player's feedback flash doesn't delay the correctness check. Async
  gives you the *choice* of waiting or not — the comment records the choice.

## Key takeaway

If you're nesting setTimeout or computing cumulative delays by hand, you're
hand-compiling what async/await writes for you. And when boolean flags multiply
(`accepting`, `playing`, `gameOver`...), collapse them into one `phase` variable with
named values — code that can only be in one state at a time has far fewer ways to be
wrong.
