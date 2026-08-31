# 📘 Learning Guide: Undo/Redo

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny pixel-palette editor. On screen you see:

- a row of six color swatches (small colored squares) — click one to
  pick your paint color;
- a row of four paintable cells, all white at first — click a cell to
  paint it with the picked color;
- an **undo** button (and, in the refactor, a **redo** button too).

Paint some cells, then hit undo to step backwards through your changes,
and redo to step forwards again. The original's undo can only go back
ONE step and has no redo. The refactor gives you full time travel.

## 2. Concepts you need first

### Reducers and useReducer (the quick version)

A **reducer** is a plain function that answers one question: "given the
current state and a description of what happened, what is the next
state?" The description is called an **action** — usually an object
with a `type` field. (Project 13's LEARN.md explains this fully.)

```js
function counter(state, action) {
  if (action.type === 'add') return state + action.amount;
  return state; // unknown action: nothing changes
}
counter(5, { type: 'add', amount: 2 }); // -> 7
```

In React, `useReducer(reducer, initialState)` gives you the current
state and a `dispatch` function. Calling `dispatch(action)` runs your
reducer and re-renders with whatever it returns.

```js
const [state, dispatch] = useReducer(counter, 0);
dispatch({ type: 'add', amount: 2 }); // state becomes 2
```

### Immutability (never edit, always replace)

Reducers must not modify (**mutate**) the old state — they build a NEW
value and return it. `[...past, present]` is the **spread** syntax: it
copies an array and adds an item at the end, leaving the original
untouched. This matters twice here: React only re-renders when it sees
a *new* object, and — the secret behind cheap undo — every old state
stays intact forever, so "history" is just a list of old states you
never threw away.

```js
const old = [1, 2];
const next = [...old, 3]; // [1, 2, 3]; old is still [1, 2]
```

### The past / present / future model

The classic undo/redo data shape is one object with three parts:

```js
{ past: [],        // states you've moved beyond, oldest first
  present: state,  // what's on screen right now
  future: [] }     // states you undid, next-up first
```

- **Do something new:** push `present` onto `past`, the new state
  becomes `present`, and `future` is wiped empty. (Why wiped? If you
  undo, then paint something different, the old "redo" path no longer
  makes sense — you've branched off. Every editor works this way.)
- **Undo:** the last item of `past` becomes `present`; the old
  `present` goes to the front of `future`.
- **Redo:** the first item of `future` becomes `present`; the old
  `present` is pushed onto `past`.

### Higher-order functions (functions that make functions)

A **higher-order function** takes a function as input and/or returns a
new function. You've used them: `array.map(fn)` takes a function.

```js
function twice(fn) {
  return (x) => fn(fn(x)); // returns a NEW function
}
const add2 = twice((n) => n + 1);
add2(10); // -> 12
```

A **higher-order reducer** is the same trick applied to reducers: it
takes a reducer in, and returns a new, upgraded reducer. That's what
`undoable(reducer)` does — it wraps ANY reducer and returns one that
also understands undo and redo.

### Small syntax you'll meet

- **Destructuring:** `const { past, present, future } = history;`
  pulls three properties out of an object into three variables.
  `const [next, ...rest] = future;` takes an array's first item and
  the remaining items in one line.
- **`slice(0, -1)`:** a copy of an array without its last item.
- **`switch (action.type) { case 'did': ... }`:** a multi-way if,
  choosing a branch by value.
- **Reference equality:** `next === history.present` asks "are these
  the *same object in memory*?" — not "do they look alike?". A reducer
  that returns its input unchanged returns the same reference.

### Unit tests with node:test

A **unit test** runs a small piece of code and checks the result, no
browser needed. Node (the JavaScript runtime outside the browser) has
a built-in test runner. `assert.equal(a, b)` fails loudly if a ≠ b.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('adds', () => { assert.equal(1 + 1, 2); });
```

Reducers are perfect for unit tests because they're **pure functions**:
same inputs, same output, no clicking required.

## 3. Walking through the original code

The state is three separate `useState` pieces:

```js
const [palette, setPalette] = useState(['#fff', '#fff', '#fff', '#fff']);
const [previous, setPrevious] = useState(null); // one slot of history
const [selectedColor, setSelectedColor] = useState('#c33');
```

`palette` is four color strings, one per cell. `previous` is the entire
undo system: a single saved copy of the palette, or `null`.

Painting saves the old palette first, then updates one cell:

```js
function paint(index) {
  setPrevious(palette); // save the old palette...
  setPalette(palette.map((c, i) => (i === index ? selectedColor : c)));
}
```

`map` builds a new array where only the clicked index gets the selected
color — good immutable style, actually.

Undo restores that one saved copy — and empties the slot:

```js
function undo() {
  if (previous) {
    setPalette(previous);
    setPrevious(null); // ...and now history is EMPTY again
  }
}
```

The render maps colors to swatches, and the undo button disables itself
when the slot is empty: `disabled={!previous}`.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — one-slot history.** Picture it: you paint cell 1 red, cell 2
blue, cell 3 green. Now you press undo. Green vanishes — good. You
press undo again... nothing. The button is grey. Your red and blue
paints are stuck forever, because `previous` only ever remembered ONE
palette back. Every real editor (text, drawing, spreadsheets) lets you
undo many steps; this one can't.

**Flaw 2 — no redo.** You undo, then think "wait, I liked that."
Too bad. There is no button, and no data to power one — the undone
state was thrown away.

**Flaw 3 — the logic is unreachable for testing.** The undo rules live
*inside* the component, tangled between color-picking and rendering.
Want to verify "undo twice then paint" behaves right? Your only test
harness is opening a browser and clicking swatches by hand. Compare the
refactor: its rules run in Node with `node --test`, no browser at all.

**Flaw 4 — the real sin: re-solving a solved problem.** The JS track's
project 39 already built multi-step undo/redo (past/present/future).
This component reinvented it, badly, because that solution wasn't
packaged in a reusable, reachable form. The lesson is as much about
*packaging* solutions as about undo.

## 5. Try it yourself first!

1. **Vague:** one slot isn't enough. What data shape could remember
   *every* palette you've moved past — and the ones you've undone?
2. **Warmer:** three containers: `past` (an array), `present` (the
   current palette), `future` (an array). Write down what each of
   paint / undo / redo should do to all three.
3. **Warmer still:** don't build it inside the component. Write it as a
   reducer — `(history, action) => newHistory` — so you can feed it
   actions in your head (or in Node) and check the output.
4. **The pro move:** could the palette logic and the history logic be
   *separate*? Write a plain `paletteReducer` that knows nothing about
   undo. Then write a function `undoable(reducer)` that returns a new
   reducer handling `undo`/`redo` itself and delegating everything else.
5. **Edge cases to handle:** undo with empty past (do nothing), redo
   with empty future (do nothing), and: after undoing, a NEW paint
   should erase the future.

## 6. Understanding the refactored solution

Three layers, each ignorant of the others. That separation is the
entire point.

**Layer 1 — `historyReducer` (generic time travel).** It manages
`{ past, present, future }` and handles three actions. `'did'`:

```js
case 'did':
  return { past: [...past, present], present: action.next, future: [] };
```

One line holds two rules: the old present is archived, and
`future: []` is the "new action kills redo" invariant. `'undid'` and
`'redid'` shuffle items between the containers, and both return
`history` unchanged when there's nothing to walk to — that's why the
buttons can never break anything.

**Layer 2 — `undoable(reducer)`, the higher-order reducer.**

```js
function undoable(reducer) {
  return function (history, action) {
    if (action.type === 'undo') return historyReducer(history, { type: 'undid' });
    if (action.type === 'redo') return historyReducer(history, { type: 'redid' });
    const next = reducer(history.present, action);
    if (next === history.present) return history;
    return historyReducer(history, { type: 'did', next });
  };
}
```

It intercepts `undo`/`redo`; everything else goes to YOUR reducer,
which only ever sees `history.present` — it has no idea history exists.
The subtle gem: `if (next === history.present) return history;` — if
the inner reducer returned the *same reference* (a no-op action),
nothing is recorded. Without this, unknown actions would stuff
duplicate entries into `past`, and undo would appear to "do nothing"
once per junk entry.

**Layer 3 — `paletteReducer`, the app's own logic.** Tiny, and purely
about palettes:

```js
case 'painted':
  return palette.map((c, i) => (i === action.index ? action.color : c));
```

**Wiring it up is one line:**

```js
const [history, dispatch] = useReducer(
  undoable(paletteReducer),
  createHistory(['#fff', '#fff', '#fff', '#fff']),
);
const palette = history.present;
```

The buttons dispatch plain actions and *derive* their disabled state
straight from the data shape — no extra "canUndo" state anywhere:

```js
disabled={history.past.length === 0}   // undo
disabled={history.future.length === 0} // redo
```

**Why keeping every state is cheap:** reducers never mutate, so each
old palette is still a valid, untouched object. "Storing history" is
just keeping references to objects that already exist.

**The tests** (`history-reducer.test.js`) wrap a trivial counter
reducer and replay action lists with `actions.reduce(reducer, start)` —
feeding each action through the reducer in order, like fast-forwarding
a recording. They check: normal actions pass through; undo/redo walk
the timeline; a new action after undo kills the old future; undo/redo
at the edges are safe no-ops; and no-op actions record nothing. Note
what's being tested: pure rules, no React, no browser, no clicking.
(The HTML file contains a copy of the module because pages opened from
disk can't import JS modules — the Node tests import the real file.)

## 7. Words you learned (glossary)

- **Reducer:** a pure function `(state, action) => newState`.
- **Action:** a plain object describing what happened, e.g.
  `{ type: 'painted', index: 2, color: '#c33' }`.
- **dispatch:** the function that sends an action to the reducer.
- **Pure function:** same inputs always give the same output, with no
  side effects — which makes it testable.
- **Immutability:** never modifying existing data; building new copies
  instead.
- **Mutation:** editing an object/array in place (forbidden in reducers).
- **Spread syntax (`...`):** copies an array/object's contents into a
  new one.
- **Destructuring:** unpacking object properties or array items into
  variables in one line.
- **past / present / future:** the classic undo data shape — history,
  current state, and undone states.
- **Invariant:** a rule the data must always satisfy (here: a new
  action empties the future).
- **Higher-order function:** a function that takes or returns functions.
- **Higher-order reducer:** a function that wraps a reducer and returns
  an upgraded reducer.
- **Reference equality (`===` on objects):** "is it literally the same
  object in memory?"
- **No-op:** an action that changes nothing.
- **Unit test:** an automated check of one small piece of logic.
- **Node:** a program that runs JavaScript outside the browser.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; note that *running* the HTML pages
needs internet once, because they load React from a CDN (shared servers
that host libraries). The Node tests, if you have Node installed, run
fully offline: `node --test` in this folder.

1. **Break the invariant.** In the refactor's `'did'` case, change
   `future: []` to `future` (keep the old future). Paint, undo, paint
   something new, then redo. Expected: redo "resurrects" a state from
   an abandoned timeline — you'll see a palette that contradicts what
   you just painted. Now the wipe rule makes sense.
2. **Remove the no-op guard.** Delete
   `if (next === history.present) return history;` and add a button
   that dispatches `{ type: 'nothing' }`. Expected: each click silently
   adds a junk history entry; undo then needs extra presses that
   visibly do nothing.
3. **Add a "clear all" feature.** Give `paletteReducer` a `'cleared'`
   case returning four `'#fff'` strings, plus a button dispatching it.
   Expected: clearing is automatically undoable — you wrote zero
   history code. That's the payoff of the wrapper.
4. **Cap the history.** In `'did'`, keep only the last 3 past states:
   `past: [...past, present].slice(-3)`. Expected: the undo counter
   never shows more than 3; older steps fall off the back, like real
   apps that cap undo depth.
5. **Predict the tests.** Read `history-reducer.test.js` and, for each
   test, write down the expected `past`/`present`/`future` by hand
   before trusting the asserts. If your paper answer matches all five,
   you own this pattern.
