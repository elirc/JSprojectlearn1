# React 08 — Lifting state up

**Lesson: when two components need the same data, the data moves UP to their
closest common parent — siblings never sync with each other.**

## Run it

Open `original.html`, type in the USD box, and watch the EUR box... not move.
Then the refactor: type in *either* box and both stay in sync.

## What's wrong with the original?

Each box owns a **private copy of what is conceptually one value** — the amount.
React state flows *down* via props; siblings have no channel to each other, so
the copies can never sync. The tell was there from line one: the initial values
`'10'` and `'9.20'` were hand-computed to agree — a human doing at author-time
what the code can't do at runtime. Whenever you see two initial values that must
"match", you're looking at one value stored twice.

(Beginners often try to patch this with effects that copy state between
components via callbacks — a Rube Goldberg machine project 21 dismantles. The
real fix is structural.)

## What changed in the refactor

- **The state moved up to `App`** — the closest common parent of everyone who
  needs it — and shrank to *one* value: `dollars`. Euros is **derived** during
  render (`dollars * RATE`), so it cannot be stale (project 09's theme).
- **`CurrencyBox` became stateless**: `{ label, amount, onAmountChange }` — it
  displays a value and reports edits, exactly a controlled input's contract
  (project 07) promoted one level. It doesn't know which currency it is; that's
  why *one* component now serves both boxes.
- **Editing the derived box updates the source of truth**: typing euros calls
  `setDollars(euros / RATE)`. Two-way sync without two states — both directions
  route through the single owner.
- The decision procedure, for reuse forever: *who needs this state?* One
  component → keep it there (colocation, project 29). Several → lift to their
  closest common parent. Everyone → context (project 34).

## Key takeaway

"How do I sync state between components?" is almost always the wrong question —
the answer is *don't have two states*. Find the one value underneath, give it one
owner high enough for all readers, pass it down, and pass change-handlers down
with it.
