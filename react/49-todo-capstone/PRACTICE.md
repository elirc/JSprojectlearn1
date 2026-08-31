# 🏋️ Practice: Todo Capstone

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Once for this file: the pages load React from a CDN, so *running* them needs internet on first load — but every exercise here is checkable by reasoning, and exercises 2 and 5 run in Node with no browser at all.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Counts on the filter buttons (warm-up)

Make each filter button carry its own count: `all (5)`, `active (2)`, `done (3)`, updating as todos come and go. Rule: no new state and no new `if` — the `FILTERS` table already holds the predicate for each button, so the count is one expression inside the existing `Object.keys(FILTERS).map(...)`.

**Practices:** using a lookup table for two jobs at once — deciding what a filter *means* and rendering the UI that offers it.

**Hint:** inside the map you have `f`; `FILTERS[f]` is that button's predicate, and `state.todos` is right there.

**Expected:** with "milk" and "eggs" added and "milk" crossed out, the buttons read `all (2)`, `active (1)`, `done (1)`; adding a fourth entry to `FILTERS` gives you a fourth button *with a working count* and zero other edits.

### ⭐⭐ 2. Put the rulebook under test (core)

The reducer is pure, so it needs no browser. Following project 40's convention, create `refactored/todos-reducer.js` exporting `initialState` and `todosReducer` (leave a copy in `index.html` with a comment saying why — `file://` pages can't import modules), then write `refactored/todos-reducer.test.js` and run `node --test refactored/`. Write at least four tests: `added` trims and rejects blanks, ids are never reused after a delete, `toggled` doesn't mutate the old state, and an unknown action throws.

**Practices:** testing state rules with no DOM, and the identity checks that prove immutability.

**Hint:** `actions.reduce(todosReducer, initialState)` replays a whole session in one line. For "rejects blanks", assert the *same object* comes back (`assert.equal(next, state)`), not merely a deep-equal one.

**Expected:** `# pass 4` (or more) with no browser open. The blank-text test passes only because the trim rule lives in the reducer — if it had stayed in the input handler, the reducer would happily store `"   "`.

### ⭐⭐ 3. "Toggle all" as a rule, not a loop (core)

Add a button that marks every todo done — and, when they're *already* all done, un-marks them all. The button's label should follow suit ("mark all done" / "mark all active"). The catch: the reducer must decide "are they all done?" from its own state, not from a boolean the component passes in.

**Practices:** keeping decisions inside the rulebook, so a stale caller can't corrupt them.

**Hint:** `state.todos.every((t) => t.done)` inside the reducer. Watch the empty list: `[].every(...)` is `true`, which would make the first click on an empty app mean "un-do everything".

**Expected:** two todos, one done → click → both crossed out, "0 remaining", label flips to "mark all active" → click → neither crossed out, "2 remaining". On an empty list the button does nothing visible and never throws.

### ⭐⭐ 4. Predict: the persistence "simplification" (core)

A teammate finds the lazy third argument fussy and rewrites the top of `usePersistentReducer`:

```js
const stored = JSON.parse(localStorage.getItem(key));
const [state, dispatch] = useReducer(reducer, stored || defaultState);
```

Answer four questions in writing, then check yourself. (a) On a brand-new browser with nothing stored, does this crash, and what does `JSON.parse(null)` actually return? (b) With `todos-v2` set to `'{broken json'`, what does the user see, and can they recover by clicking anything? (c) How many times per session does that `getItem` + parse run? (d) If another tab writes new todos into storage, does *this* tab's `state` pick them up on its next render?

**Practices:** reading code that runs during *every* render, and knowing which arguments `useReducer` ignores after mount.

**Hint:** `JSON.parse` stringifies its argument first, and `String(null)` is `'null'` — which is valid JSON. Then ask what `useReducer` does with its second argument on render #2.

**Expected:** your four answers match the solution, including which one of them is a *permanent* white screen and which is merely wasted work.

### ⭐⭐⭐ 5. A loader that migrates old saves (challenge)

An early build of this app saved a bare array (`[{ id: 0, text: 'milk', done: false }, ...]`) under the same key — and because that build minted `id: todos.length`, some of those saved ids repeat. Give `usePersistentReducer` an optional fourth argument, `migrate(loaded, fallback)`, applied to whatever comes out of storage. Write `migrate` so a bare array becomes `{ todos, nextId }` with ids renumbered from 1, a current-shaped blob passes through untouched, and anything else (a number, `null`, a `{ todos: "nope" }`) falls back. Test it in Node like exercise 2.

**Practices:** treating stored data as untrusted input, and keeping the upgrade path a pure function you can test.

**Hint:** `Array.isArray(loaded)` tells the two shapes apart. Renumber with `map((t, i) => ({ ...t, id: i + 1 }))` and set `nextId` past the end. You don't need to memoize the lazy init function — React calls it once, on mount, and never looks at it again.

**Expected:** old saves load with their text and done-flags intact and their duplicate ids gone; corrupt storage still yields a clean empty app rather than a crash; and adding a todo right after a migration gets a fresh id that collides with nothing.

### ⭐⭐⭐ 6. Two tabs, one list (challenge)

Open the app in two tabs today and they drift apart — each saves over the other. Fix it: add a `replaced` case to the reducer, and inside `usePersistentReducer` subscribe to the window's `storage` event (which fires only in the *other* tabs when a page writes to storage) to dispatch the incoming state. Remember the cleanup.

**Practices:** subscribing to something outside React with an effect, and the identity guarantee that keeps its dependency array short.

**Hint:** the event gives you `e.key` and `e.newValue`; ignore events for other keys and for `null` (a clear). Guard the parse. `dispatch` from `useReducer` is stable for the component's lifetime, so `[key]` is an honest dependency array.

**Expected:** tab A adds "milk" → tab B shows it within a moment, keeping its own filter and its own half-typed draft; deleting in B removes it from A. No infinite ping-pong between the tabs, and closing one tab leaves no listener behind.

## Solutions

### 1. Counts on the filter buttons

```jsx
{Object.keys(FILTERS).map((f) => (
  <button key={f} onClick={() => setFilter(f)} disabled={filter === f}>
    {f} ({state.todos.filter(FILTERS[f]).length})
  </button>
))}
```

**Why:** the count is a derived value (project 09) computed during render from state the component already has — no `useState`, no sync effect, no chance of a stale number. It's also the payoff of rules-as-data: because each button already knows its own predicate, "count what this button would show" is the same expression as "show what this button filters", so a new `FILTERS` entry brings its count along for free.

### 2. Put the rulebook under test

`refactored/todos-reducer.js` exports `initialState` and `todosReducer` exactly as they appear in `index.html`. Then:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todosReducer, initialState } from './todos-reducer.js';

const replay = (actions) => actions.reduce(todosReducer, initialState);
const add = (text) => ({ type: 'added', text });

test('added trims text and rejects blanks by returning the same state', () => {
  const s = replay([add('  milk  ')]);
  assert.deepEqual(s.todos, [{ id: 1, text: 'milk', done: false }]);
  assert.equal(todosReducer(s, add('   ')), s);   // identical object
});

test('ids are never reused after a delete', () => {
  const s = replay([add('milk'), add('eggs'), add('bread')]);
  const after = todosReducer(
    todosReducer(s, { type: 'deleted', id: 2 }), add('coffee'));
  const ids = after.todos.map((t) => t.id);
  assert.deepEqual(ids, [1, 3, 4]);
  assert.equal(new Set(ids).size, ids.length);
});

test('toggled leaves the old state untouched and reuses unchanged rows', () => {
  const before = replay([add('milk'), add('eggs')]);
  const snapshot = structuredClone(before);
  const after = todosReducer(before, { type: 'toggled', id: 1 });
  assert.deepEqual(before, snapshot);                // pure: no mutation
  assert.notEqual(after.todos[0], before.todos[0]);  // changed row: new object
  assert.equal(after.todos[1], before.todos[1]);     // untouched row: same object
});

test('unknown actions throw loudly', () => {
  assert.throws(() => todosReducer(initialState, { type: 'toggeld', id: 1 }),
    /Unknown action: toggeld/);
});
```

**Why:** `(state, action) => newState` with no I/O is testable by construction — a session is just `reduce`. The identity assertions are the interesting ones: returning `state` itself for a blank add is what lets React skip a re-render, and `after.todos[1] === before.todos[1]` proves `map` reused the untouched row object, which is exactly what makes `React.memo` on a row component worth anything. The duplicated copy in `index.html` is the house compromise: `file://` pages can't import ES modules, so the tested file is the source of truth and the inline copy is marked as a copy.

### 3. "Toggle all" as a rule, not a loop

```jsx
case 'toggledAll': {
  const allDone = state.todos.length > 0 && state.todos.every((t) => t.done);
  return { ...state, todos: state.todos.map((t) => ({ ...t, done: !allDone })) };
}
```

```jsx
const allDone = state.todos.length > 0 && state.todos.every((t) => t.done);
<button onClick={() => dispatch({ type: 'toggledAll' })}>
  {allDone ? 'mark all active' : 'mark all done'}
</button>
```

**Why:** the component computes `allDone` only to *label* the button; the reducer computes it again to *decide*, because the action is a request ("toggle them all") and the rulebook answers it from the state it holds right now. Passing `done: !allDone` in the action would work today and rot tomorrow — a queued or replayed action would carry a stale verdict. The `length > 0` guard exists because `[].every(...)` is vacuously `true`, which would make the first click on an empty list mean "un-complete everything".

### 4. Predict: the persistence "simplification"

(a) **No crash.** `localStorage.getItem` returns `null`, `JSON.parse` stringifies its argument first, and `String(null)` is `'null'` — valid JSON that parses to `null`. So `stored` is `null`, `null || defaultState` is `defaultState`, and the fresh visit works. (b) **A permanent white screen.** The parse throws during render, before anything is committed, and it throws again on every reload — there is nothing to click, because nothing rendered. Only clearing storage by hand rescues the user. (c) **Every render**: the read and parse sit in the component body, so typing one character in the draft input re-reads and re-parses the whole todo list. (d) **No.** `useReducer` uses its second argument only on mount; afterwards the state lives in React and the freshly parsed `stored` is computed and thrown away.

**Why:** the refactor's lazy third argument isn't fussiness, it's placement: it runs *once*, so the load can't repeat, can't be wasted, and — with `try/catch` — can't take the app down. Answers (b) and (c) are the two costs of doing work in the render body that belongs in initialization; answer (d) is the trap that makes it look harmless during testing, since the code appears to "re-read storage constantly" while actually having no effect at all.

### 5. A loader that migrates old saves

```js
function migrateTodos(loaded, fallback) {
  if (Array.isArray(loaded)) {                    // early build: a bare array
    const todos = loaded.map((t, i) => ({
      id: i + 1,                                  // old ids repeat; renumber
      text: String(t.text ?? ''),
      done: Boolean(t.done),
    }));
    return { todos, nextId: todos.length + 1 };
  }
  if (loaded && Array.isArray(loaded.todos) && typeof loaded.nextId === 'number') {
    return loaded;                                // already current
  }
  return fallback;
}

function usePersistentReducer(key, reducer, defaultState, migrate = (x) => x) {
  const [state, dispatch] = useReducer(reducer, defaultState, (fallback) => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : migrate(JSON.parse(stored), fallback);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, dispatch];
}
// usage: usePersistentReducer('todos-v2', todosReducer, initialState, migrateTodos)
```

**Why:** stored data is input from the past, and past-you was less careful — so the loader's job is not just "parse" but "prove the shape". Renumbering rather than trusting the old ids is the honest move: those ids came from `todos.length`, so duplicates are *expected*, and every find-by-id in the app would misbehave on migrated data. `migrate` stays a pure `(loaded, fallback) => state` function, which is why Node can test it against a bare array, a current blob, `42`, and `'{broken json'` without a browser; and because it's called inside the `try`, a migration that throws still lands on the fallback instead of the white screen from exercise 4.

### 6. Two tabs, one list

```jsx
case 'replaced':
  return action.state;
```

```jsx
useEffect(() => {
  function onStorage(e) {
    if (e.key !== key || e.newValue === null) return;
    try {
      dispatch({ type: 'replaced', state: JSON.parse(e.newValue) });
    } catch {
      /* another tab wrote garbage — keep what we have */
    }
  }
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, [key]);
```

**Why:** the `storage` event is a subscription to something outside React, so it gets the full ritual: subscribe in an effect, unsubscribe in the cleanup, and a dependency array naming what the subscription actually depends on. `dispatch` can be left out because `useReducer` guarantees the same function identity for the component's lifetime — if it changed each render, this effect would resubscribe constantly. The ping-pong you'd expect doesn't happen: the incoming state re-runs the save effect, but writing a value identical to the one already stored doesn't notify the other tabs, so the echo stops after one hop. Note what each tab keeps: `filter` and `draft` are local `useState`, so only the shared, persisted state travels — which is the same colocation judgment (project 29) that decided where they lived in the first place.
