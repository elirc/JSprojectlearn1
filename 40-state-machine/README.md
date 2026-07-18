# 40 — State machine

**Lesson: booleans multiply, states don't — make impossible states unrepresentable.**

## Run it

```
node 40-state-machine/original.js
node --test 40-state-machine/
```

## What's wrong with the original?

Run it: the order ends up **cancelled AND shipped simultaneously** — the warehouse
sends a package for an order the customer was told is dead.

The root cause is arithmetic. Four booleans can represent 2⁴ = **16 states**; the
business has **5 real ones**. The other 11 are nonsense (`delivered` but never
`paid`...), and nothing prevents them — prevention lives in scattered flag-checks
inside each action, added one production incident at a time. `ship()` checks
`isPaid` (someone got burned); it doesn't check `isCancelled` (that flag came
later, and nobody went back). Every new flag silently doubles the state space and
invalidates every existing check.

This is project 15's `phase` lesson with money on the line.

## What changed in the refactor

- **One `state` field with five values.** An order simply *cannot be* cancelled and
  shipped — the contradiction has no representation. This principle — **make illegal
  states unrepresentable** — is one of the highest-leverage design ideas in software;
  you'll meet it again in typed languages, database constraints, and API design.
- **The rules are a table, not scattered ifs** (the project 06/10/13 move, completing
  the trilogy: rules → operators → *transitions*). `TRANSITIONS` reads like the spec:
  from `paid` you may `ship` or `cancel`, and that's the whole law. A product manager
  can review it. Changing the rules is editing data.
- **The engine is five lines** and throws on illegal events with a message listing
  what *was* allowed — because "ship a cancelled order" is a caller bug, and bugs
  are loud (project 30). `allowedEvents(state)` exists so UIs can disable buttons —
  deriving the UI from the same table that enforces the rules, so they can't
  disagree.
- **Note the exhaustive test**: it checks the *table itself* — every transition
  lands on a defined state — so a typo'd target can't hide. When rules are data,
  you can test the rulebook, not just samples of it.

## Key takeaway

The moment you have two booleans that interact, ask "what are the *actual* states
here?" — list them, name them, and store *which one you're in* instead of flag
combinations. Then put the legal moves in a table. The 2ⁿ explosion disappears,
along with the class of bug where someone forgets a flag-check.
