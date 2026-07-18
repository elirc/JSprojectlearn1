# React 03 — The key prop

**Lesson: keys are identity, not warning-silencers. Index keys make row state jump
between rows — watch it happen.**

## Run it

Open `original.html` and follow the 3 steps printed on the page: type a meal for
each guest, delete the middle guest, and observe **Alan now has Grace's meal**.
Then do the same in `refactored/index.html` — everyone keeps their own.

## What's wrong with the original?

`key={index}` — the classic "the linter wanted a key and index made the warning go
away."

Keys are how React matches old rows to new rows across renders. With index keys,
after deleting Grace (row 1), *Alan becomes row 1*. React compares by key, sees
"key 1 still exists, its name text changed," and **keeps row 1's DOM** — including
the input where Grace's pasta was typed. No error, no warning: the *labels* moved
but the *state* stayed put. The same corruption happens on reorder, insert-at-top,
and sort — anywhere positions shift under stateful rows (inputs, checkboxes,
animations, focus).

## What changed in the refactor

- **`key={guest.id}`** — the data's own stable identity. When Grace leaves, key
  102 disappears, React unmounts *her* row, and 101/103 keep their DOM and state.
  That's the entire fix: one attribute.
- The page states the honest rule of thumb: index keys are only safe when the list
  never reorders/inserts/removes mid-list *and* rows are stateless — rare enough
  that "don't use index" is the right default. If your data truly has no id, that's
  a data-modeling problem (give it one at creation time), not a key problem.
- Bonus detail: `setGuests((current) => ...)` uses the updater form — a habit
  project 11 justifies.

## Key takeaway

A key answers "*which one is this?*", and it must keep answering the same thing as
the list shuffles. Position doesn't; identity does. When you see state mysteriously
jumping between rows in any React app, your first suspect is now obvious.
