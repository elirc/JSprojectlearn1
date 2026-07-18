# 48 — Memory match

**Lesson: async + user input = race conditions, and the phase machine that closes
them. A synthesis of projects 14, 15, and 17.**

## Run it

Open both files in a browser. On the original, flip two non-matching cards and
**quickly click a third** during the 800ms flip-back window — watch the board
corrupt. Do the same on the refactor — the click is simply ignored.

## What's wrong with the original?

1. **The 800ms bug window — a genuine race condition.** After a failed match, a
   `setTimeout` will flip the cards back... but during those 800ms, clicks still
   register, `firstCard`/`secondCard` are still set, and a third click re-runs the
   "second card" logic against a card that's about to flip down. Fast clickers
   corrupt the board every time. The deep cause: **the game has a "busy" period,
   but no code represents it** — there's no phase, so there's nothing to check.
2. **State lives in DOM nodes** (`firstCard` points at a `<div>`; matched-ness is
   a CSS class) — project 14's sin in its most dangerous habitat: async code
   reading state that other timers are mutating.
3. **`sort(() => Math.random() - 0.5)` is a famously biased shuffle** — some
   orderings come up measurably more often (it also violates sort's comparator
   contract). It *looks* shuffled, which is why it ships everywhere. Project 11's
   Fisher–Yates exists for exactly this.
4. Cheating bonus: the original hides faces by making text the same color as the
   card — select the text or view source and every face is visible.

## What changed in the refactor

- **A `phase` machine closes the race**: `idle | oneUp | checking | won`. The
  *first* check in `flipCard` is `if (phase === 'checking') return` — during the
  flip-back sleep, clicks hit that wall. The bug isn't guarded against; it's
  **unrepresentable** (project 40's word, in async clothing). This is the cure for
  a whole family of real-world bugs: double-submitted forms, double-charged carts,
  spam-clicked buttons.
- **`await sleep(800)` replaces the setTimeout callback** (project 15), so the
  compare-flip-back-continue logic reads top to bottom in one function — *and* the
  phase change wrapping it is impossible to miss.
- **Cards are data** (`{ id, emoji, face }`), and `face` is a tiny state machine
  per card (`down | up | matched`) rather than CSS-class-as-truth. Render draws
  from data (project 14); "New game" is `state = newGame()` — free, as always,
  when state is one object.
- **Fisher–Yates shuffle**, imported conceptually from project 11.

## Key takeaway

Whenever async work creates a "meanwhile" — an animation, a fetch, a timeout — ask:
*what can the user do during the meanwhile, and does the code know it's in one?*
If the answer is "anything, and no," you have a race. Name the busy phase, check it
at every entry point, and the whole class of bug dissolves.
