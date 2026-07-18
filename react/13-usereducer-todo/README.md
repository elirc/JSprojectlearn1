# React 13 — useReducer

**Lesson: when state updates are the interesting part of your app, gather them
into a reducer — one pure, unit-testable rulebook.**

## Run it

```
open original.html and refactored/index.html in a browser
node --test react/13-usereducer-todo/     <- the app's RULES, tested in Node!
```

## What's wrong with the original?

Nothing is buggy — that's deliberate. The problem is *where the rules live*:
smeared across five handlers inside a component. "What does toggle-all mean?" is
answered inside a click handler; testing it requires rendering a UI and clicking
buttons; and every handler reads state from the render snapshot — fine today,
stale-closure bait (project 11) the moment a handler moves into a timeout or
callback. As update logic grows past two or three interacting rules, `useState`
handlers become a rulebook with its pages stapled to random walls.

## What changed in the refactor

- **All update rules moved into `todosReducer(state, action)`** — one pure
  function: current state + a description of *what happened* → next state. This
  is js#17's `step(state, input)` and js#40's `transition(state, event)` with
  React's naming. Handlers shrink to `dispatch({ type: 'toggled', id })` — they
  *report events*; the reducer *decides meaning*. UI and logic, cleanly cut.
- **`reducer.js` contains zero React** — so `reducer.test.js` unit-tests every
  rule in Node: the toggle-all business rule both directions, id non-reuse after
  delete, whitespace rejection, and a no-mutation check. Look at the `replay`
  helper — testing state logic as *a list of events folded over a reducer* is the
  same replay trick as js#07's Hanoi verifier.
- **Even validation is a rule**: empty text returns `state` unchanged — and
  returning the *same reference* is also the "nothing happened, skip re-render"
  signal (project 10's reference model, used deliberately). Unknown actions
  throw (js#30).
- Free bonuses this structure buys later: dispatch never goes stale (React
  guarantees it's stable), action logs give you debugging-by-replay, and project
  40/41 plug this exact reducer shape into undo/redo and a global store.

## Key takeaway

`useState` for independent values; `useReducer` when updates are *rules that
interact*. The question to ask: "would I want to unit-test my state
transitions?" If yes — and for anything game-like, form-like, or cart-like, yes —
put them in a reducer and test them like the pure functions they are.
