# 📘 Learning Guide: useReducer Todo

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A todo list. On screen: a "Todos" heading, a text box ("what needs doing?"), and three buttons — **add**, **toggle all**, **clear done**. Each todo appears as a list item; clicking its text crosses it out (marks it done), and a little "x" button deletes it. "Toggle all" flips everything: if any todo is unfinished, all become done; if all are done, all become undone. "Clear done" removes the crossed-out ones.

Here's the twist: **the original has no bugs.** Both versions behave identically. This project is about *code organization* — where the app's rules live, and whether you can test them without opening a browser.

## 2. Concepts you need first

**`useState`, `map`, `filter`, spread copies** — covered in projects 07, 02, and 10's LEARN.md files. This project leans on all of them.

**`some`** — an array method asking "does at least one item pass this test?":

```js
const todos = [{ done: true }, { done: false }];
todos.some((t) => !t.done); // true — at least one is not done
```

**Pure function** — a function whose output depends only on its inputs, and which changes nothing outside itself. Same inputs in, same answer out, every time, no side effects (no clicking, no network, no editing globals):

```js
function add(a, b) { return a + b; }       // pure
function addAndLog(a, b) { console.log(a); return a + b; } // NOT pure (side effect)
```

Pure functions are the easiest code in the world to test: call them, check the answer.

**Reducer** — a pure function with a specific shape: `(state, action) => nextState`. Give it the current state and a description of *what happened*, and it returns the next state. It never mutates; it builds replacements (project 10's rule).

**Action** — a plain object describing an event, by convention with a `type` field naming what happened, plus any details:

```js
{ type: 'added', text: 'buy milk' }
{ type: 'deleted', id: 3 }
{ type: 'toggledAll' }
```

Note the past tense: actions *report* what the user did; they don't command what to do. The reducer decides what the event *means*.

**`switch` statement** — a cleaner way to write a chain of `if/else if` on one value:

```js
switch (action.type) {
  case 'added':   /* ...handle it... */ break;
  case 'deleted': /* ...handle it... */ break;
  default:        throw new Error('unknown');
}
```

**`useReducer`** — a React hook that's a sibling of `useState`. You hand it your reducer and a starting state; it hands back the current state and a `dispatch` function:

```js
const [state, dispatch] = useReducer(todosReducer, initialState);
// later, in a click handler:
dispatch({ type: 'toggled', id: 7 });
```

`dispatch(action)` means "this happened — reducer, take it from here." React calls your reducer with the current state and your action, and stores whatever it returns.

**Unit test** — a small program that calls a function with known inputs and checks the output automatically. Node.js (the JavaScript runtime that runs outside browsers) has a built-in test runner: `test('name', () => { assert.equal(got, want); })`. If the assertion fails, the test prints an error.

**`export` / `import`** — JavaScript's way to share code between files. `export function foo()` in one file, `import { foo } from './file.js'` in another. This is what lets the reducer live in its own React-free file that tests can load.

**`reduce` (the array method)** — related name, same idea! `actions.reduce(reducer, initialState)` feeds each action through the reducer, carrying the state along — replaying history to compute the final state. The test file uses exactly this.

## 3. Walking through the original code

State: three `useState` slots — `todos` (the array), `draft` (the input text), and `nextId` (a counter so each todo gets a fresh id, even after deletions).

```jsx
function handleAdd() {
  if (draft.trim() === '') return;
  setTodos([...todos, { id: nextId, text: draft.trim(), done: false }]);
  setNextId(nextId + 1);
  setDraft('');
}
```

Reject blank input (`trim` strips spaces), append a new todo object (spread — no mutation), bump the id counter, clear the box. Notice: the *rule* "blank todos are rejected" lives inside this click handler.

```jsx
function handleToggle(id) {
  setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}
```

Map over the todos: the one with a matching id gets a flipped copy; everyone else passes through untouched.

```jsx
function handleDelete(id) {
  setTodos(todos.filter((t) => t.id !== id));
}
function handleClearDone() {
  setTodos(todos.filter((t) => !t.done));
}
```

Two filters: keep everything except the deleted id; keep only unfinished ones.

```jsx
function handleToggleAll() {
  const anyNotDone = todos.some((t) => !t.done);
  setTodos(todos.map((t) => ({ ...t, done: anyNotDone })));
}
```

The most interesting business rule in the app — "if anything is unfinished, finish everything; otherwise unfinish everything" — buried in a click handler.

The JSX wires it up: the input (with Enter-key support via `onKeyDown`), the three buttons, and a `map` rendering each todo with its toggle span and delete button.

## 4. What's wrong with it (in beginner terms)

Again — nothing is buggy. The complaints are about *where things live*:

**The rules are scattered.** "What does toggle-all mean?" is answered inside `handleToggleAll`. "What input is rejected?" inside `handleAdd`. Five rules, five locations, all tangled with UI code. The README's image: a rulebook with its pages stapled to random walls.

**You can't test the rules without a browser.** Want to verify "toggle all works in both directions"? With the original, you'd have to render the page, simulate clicks, and read the screen. The logic is welded to the UI.

**Stale-closure bait.** Every handler reads `todos`, `draft`, `nextId` from the render snapshot (project 11's LEARN.md explains snapshots). That's fine while handlers run instantly on click. But the day someone wraps `handleAdd` in a `setTimeout` or a network callback, the snapshot goes stale and quiet bugs appear. The structure is one refactor away from project 11's trap.

Concrete story: six months later a teammate is asked "make toggle-all skip archived todos." They must first *find* the rule (it's in a click handler), change it there, then manually click around a browser to check both directions, id behavior, and that nothing else broke. With a reducer + tests, they'd edit one case in one file and run `node --test`.

## 5. Try it yourself first!

Try restructuring a copy before reading on:

1. Could all five update rules live in *one* function? What would that function need to receive to know which rule to apply?
2. Design the messages first: write one plain object per user action (`{ type: 'added', text }`, `{ type: 'toggled', id }`, ...). Past-tense names describe what happened.
3. Write `todosReducer(state, action)` with a `switch` on `action.type`. Each case returns a *new* state (spread, map, filter — never mutate). Move the body of each handler into its case.
4. `nextId` belongs *inside* the reducer's state (`{ todos, nextId }`) — adding a todo is one rule, so the id bump happens in the same case.
5. Swap the component over: `const [state, dispatch] = useReducer(todosReducer, initialState);` and shrink every handler to a single `dispatch({...})` call. (`draft` can stay a `useState` — it's input-box state, not a rule.)
6. What should happen for an action type you never defined? Silence hides typos; consider throwing an error.

## 6. Understanding the refactored solution

There are three files. `refactored/reducer.js` holds the rules, `refactored/reducer.test.js` proves them, and `refactored/index.html` is the UI. (The HTML contains a pasted copy of the reducer because a plain double-clicked HTML file can't `import` from other files; a real project with a bundler would import it.)

**The reducer** (`reducer.js`) — state shape `{ todos: [...], nextId }`, one `switch`:

```js
case 'added': {
  const text = action.text.trim();
  if (text === '') return state; // rejecting bad input is a RULE — it lives here
  return {
    todos: [...state.todos, { id: state.nextId, text, done: false }],
    nextId: state.nextId + 1,
  };
}
```

Two subtleties. First, validation moved *into* the reducer — rejection is a rule like any other. Second, rejecting by returning `state` — the very same object, not a copy — deliberately uses project 10's reference rule in reverse: same reference tells React "nothing happened, skip the re-render."

```js
default:
  throw new Error(`Unknown action type: ${action.type}`);
```

A typo like `dispatch({ type: 'togled' })` crashes loudly instead of silently doing nothing. Loud beats quiet.

**The component** (`index.html`) — handlers stop deciding and start reporting:

```jsx
const [state, dispatch] = useReducer(todosReducer, initialState);
...
<button onClick={() => dispatch({ type: 'toggledAll' })}>toggle all</button>
```

The UI says *what happened*; the reducer says *what it means*. Clean cut between the two. Bonus: React guarantees `dispatch` is stable (the same function every render), so it can never go stale in a callback — the project-11 trap is structurally gone.

**The tests** (`reducer.test.js`) — pure Node, zero browser. The helper:

```js
const replay = (actions) => actions.reduce(todosReducer, initialState);
```

A test is a *story told as actions*, then an assertion about the ending:

```js
test('deleting removes by id and never reuses old ids', () => {
  const state = replay([
    { type: 'added', text: 'a' },
    { type: 'deleted', id: 1 },
    { type: 'added', text: 'b' },
  ]);
  assert.deepEqual(state.todos, [{ id: 2, text: 'b', done: false }]);
});
```

Other tests check: trimming, whitespace rejection (asserting `state === initialState` — the same-reference trick again), toggle-all in *both* directions, clear-done, "the reducer never mutates its input" (snapshot the state as a JSON string, run actions, confirm the string didn't change), and "unknown actions throw."

**When to use which?** `useState` for independent little values (the `draft` text stayed one!). `useReducer` when updates are interacting *rules* you'd want to unit-test — anything cart-like, game-like, or form-like.

## 7. Words you learned (glossary)

- **Reducer**: a pure function `(state, action) => nextState` — the app's rulebook.
- **Action**: a plain object describing what happened, e.g. `{ type: 'added', text }`.
- **`dispatch`**: the function that sends an action to the reducer ("this happened").
- **`useReducer`**: React hook returning `[state, dispatch]` for reducer-managed state.
- **Pure function**: output depends only on inputs; no side effects, no mutation.
- **Side effect**: anything a function does besides returning a value (logging, DOM, network).
- **Business rule**: a behavior decision of the app ("blank todos are rejected").
- **`switch`**: multi-branch statement choosing a case by value.
- **Unit test**: automated check that a function returns the expected output.
- **`assert`**: a test statement that fails loudly if a condition isn't met.
- **Replay**: recomputing state by folding a list of actions through the reducer.
- **Stable function**: one React guarantees is identical across renders (like `dispatch`).
- **`export` / `import`**: sharing code between JavaScript files.

## 8. Experiments to try on the plane (no internet needed)

Note once: the two HTML pages load React from a CDN, so *running them* needs internet (or a cached copy). But this project has a superpower for plane rides: `reducer.js` and `reducer.test.js` need **no internet and no browser at all** — if Node.js is installed, `node --test` runs the whole test suite offline.

1. **Run the tests, then break a rule**: in `reducer.js`, change `'added'` to not trim (`const text = action.text;`). Run `node --test` in the `refactored` folder. Prediction: the "trims text" and "whitespace rejected" tests fail with a clear diff; six others still pass — pinpointing exactly what you broke.
2. **Add a new rule, test-first**: write a failing test — `replay([{type:'added',text:'a'}, {type:'edited', id:1, text:'b'}])` should yield text `'b'` — then add an `'edited'` case (`map`, spread, override `text`). Prediction: red turns green, and you never opened a browser.
3. **Test a typo**: add a test that calls `todosReducer(initialState, { type: 'togled' })`. Prediction: it throws "Unknown action type" — now delete the `default` case and watch the same test fail because nothing throws (silent typo bugs restored).
4. **Mutate on purpose**: rewrite the `'toggled'` case to mutate (`state.todos.forEach(t => { if (t.id === action.id) t.done = !t.done; }); return state;`). Prediction: "the reducer never mutates its input" fails — the tests are literally enforcing project 10's lesson.
5. **In the browser (post-flight)**: add `console.log(action)` at the top of the reducer in `index.html`, then use the app. Prediction: the console shows a readable event log of everything you did — the "debugging by replay" superpower the README mentions.
