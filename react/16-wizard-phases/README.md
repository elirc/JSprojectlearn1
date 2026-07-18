# React 16 — Wizard phases

**Lesson: js#40's state machine lesson, where the invalid states are pixels — one
`step` value beats N `showX` booleans.**

## Run it

Open `original.html` and click through: Cart → Shipping → Payment → **review
order** → a blank screen, at the exact moment the user was about to pay. Then
find the missing line in `goToConfirm`.

## What's wrong with the original?

Five booleans track which screen shows. That's 2⁵ = 32 representable states for a
wizard with 5 real ones — and the other 27 are *visible*: two screens at once, or
the demo's all-false **blank checkout**. Every navigation function must flip
exactly the right *pair* of booleans; `goToConfirm` flipped one. Nothing crashed.
No console error. The UI just... isn't.

Second cost, subtler: "which step are we on?" doesn't exist as a value. The
progress indicator every checkout needs would require if-chaining the booleans to
reconstruct a fact the state should simply *be*.

## What changed in the refactor

- **One `step` state holding one of five names.** Two-screens-at-once and
  no-screen-at-all are now unrepresentable — not prevented by discipline,
  *inexpressible* (js#40's phrase, now with pixels). React renders whatever
  `step` says; there's nothing to desynchronize.
- **The flow is a table** (`SCREENS`, with `next`/`back` per screen), so
  navigation is `setStep(screen.next)` — no hand-flipped pairs, and the
  original's bug has no place to live. Adding a step is a table row. A product
  manager can read the flow.
- **The progress indicator fell out for free**: map over steps, bold the one
  equal to `step`. When "where we are" is a value, everything about "where we
  are" is a cheap derivation (project 09).
- The early `return` for `done` keeps the terminal state out of the table logic
  — same guard-clause shape as project 04.

This is also project 20's foundation (loading/error/success as one status) and
project 48-from-the-JS-track's race-closer — phases are the recurring answer.

## Key takeaway

When screens/modes/steps are exclusive, the state is *which one* — a single
value from a named set, never a boolean per option. In React the payoff is
doubled: invalid combinations aren't just wrong data, they're wrong *pixels*,
and one `step` value makes them impossible to draw.
