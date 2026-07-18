# React 40 — Undo/redo with a reducer

**Lesson: js#39's past/present/future, reborn as a *higher-order reducer* — any
reducer becomes undoable in one wrapping line.**

## Run it

```
open original.html and refactored/index.html in a browser
node --test react/40-undo-redo/     <- the time-travel rules, tested in Node
```

## What's wrong with the original?

The undo strategy is **one slot**: `previous` holds a single old palette; undo
restores it and empties history. Paint three cells, undo twice → one step comes
back, and redo doesn't exist. Worse structurally: the undo logic is woven into
the component between color-picking and rendering, so the only test harness is
clicking swatches. js#39 already solved multi-step undo/redo with
past/present/future — this component just never heard about it. That's the
real failure: a solved problem, re-solved badly, because the solution wasn't
packaged reachably.

## What changed in the refactor

- **`historyReducer`** is js#39's `History` class as a reducer — same three
  containers (past/present/future), same one-line invariant (`'did'` clears
  the future), now in react#13's testable shape. The Node tests replay the
  classic scenarios, including new-action-kills-redo.
- **`undoable(reducer)` is the star**: a *higher-order reducer* (js#27's
  memoize move, for reducers). It intercepts `undo`/`redo`, delegates
  everything else to your app's reducer, and records real changes as history
  entries. The palette reducer doesn't know history exists; the history
  reducer doesn't know what a palette is — either can change freely.
  (This is precisely how redux-undo works.)
- **One line adopts it**: `useReducer(undoable(paletteReducer),
  createHistory(initial))`. Undo/redo buttons dispatch plain actions, and
  their disabled states read straight off `past.length` / `future.length` —
  UI derived from the data shape (project 09, always).
- **Why it's cheap**: reducers never mutate (react#10/13), so every past
  state is already intact — keeping them is just keeping references. A subtle
  detail worth study: `undoable` skips recording when the inner reducer
  returns the same reference — no-op actions don't pollute the timeline.

## Key takeaway

When a capability (undo, logging, persistence) applies to *any* state, don't
weave it into one component — wrap the reducer. Higher-order reducers compose
capabilities the way higher-order functions compose behavior, and the JS
track's data structures slot straight in.
