# React 02 — List from data

**Lesson: if you can count your `useState`s by reading your JSX, the list is trapped
in the code. Render lists with `map`; keep one state for the collection.**

## Run it

Open `original.html` and `refactored/index.html` in a browser.

## What's wrong with the original?

Four checklist items = four `useState`s + four hand-written `<li>`s + a `doneCount`
that manually sums four booleans. Every feature must touch every copy:

- Adding step 5 means a new `useState`, a new `<li>`, *and remembering to edit
  `doneCount` and the "of 4" text* — two of those will be forgotten.
- "Reset all" means calling four setters.
- Steps from a server? Reorderable steps? Structurally impossible — **the list
  doesn't exist anywhere in the program; only four individuals do.**

This is js#47's hardcoded-quiz disease, and the fix is the same.

## What changed in the refactor

- **`STEPS` is an array**; the UI is `STEPS.map(step => <li>...)`. One `<li>`
  template, N items. Adding a step is one data row and zero code.
- **State shrank to what the user actually did**: a `Set` of done ids. The done
  count is `doneIds.size` — *derived*, so it can't disagree with the list (project
  09 expands on this). "Reset all" is `new Set()` — one line.
- **The state update copies the Set** (`new Set(current)`) instead of mutating —
  React only re-renders when it sees a *new* object (project 10 shows the crash-
  and-burn version of getting this wrong).
- **`key={step.id}`** on each mapped item — React needs a stable identity per item
  to track them across renders. Project 03 is entirely about what goes wrong with
  keys, so here just note: ids from your data, not array indexes.

## Key takeaway

The number of `useState` calls should not grow when your data grows. If items are
peers — steps, todos, players, messages — model them as one collection in one piece
of state, render with `map`, and derive the summaries. React's whole rendering
model is built for "here's an array, draw it."
