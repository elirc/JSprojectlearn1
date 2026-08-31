# 🏋️ Practice: useReducer

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. Exercises 2-4 need no browser at all: `node --test` in `refactored/` runs offline.

## Exercises

### ⭐ 1. An "N left" counter (warm-up)

Show how many todos are not done, right under the heading in `refactored/index.html` — e.g. `2 left`. Compute it during render from `state.todos`; do not add anything to the reducer or the state shape.

**Practices:** derived values — the reducer owns the facts, the render computes the views.
**Hint:** `filter` for the not-done ones, then `.length`.
**Expected:** adding a todo raises the number, toggling one done lowers it, `toggle all` drops it to 0, and `clear done` leaves it unchanged (it only removes done items).

### ⭐⭐ 2. A "duplicated" rule, test-first (core)

Add a `duplicated` action: `{ type: 'duplicated', id }` inserts a copy of that todo *immediately after* the original, with a fresh id from `nextId` and `done: false` (a copy is new work). Write the test in `reducer.test.js` first, watch it fail, then add the case to `reducer.js`. Duplicating an id that doesn't exist should return `state` unchanged.

**Practices:** growing the rulebook — new behavior lands as a pure case plus a Node test.
**Hint:** `findIndex` to locate it, then rebuild with `slice(0, i + 1)`, the copy, `slice(i + 1)`.
**Expected:** `node --test` goes red with your new test, green after the case; duplicating a *done* todo yields an undone copy right below it, and `nextId` advances.

### ⭐⭐ 3. The bug the browser can't see (core)

A learner rewrote the `toggled` case like this, clicked around in the browser, and concluded it works fine:

```js
case 'toggled': {
  const todo = state.todos.find((t) => t.id === action.id);
  todo.done = !todo.done;
  return { ...state, todos: state.todos };
}
```

And the UI *does* update! Explain why the screen still works, which existing test fails anyway, and rewrite the case correctly. This is the exercise where the test suite earns its keep.

**Practices:** mutation hiding behind a fresh outer object — and tests as the mutation police.
**Hint:** the returned *state* object is new (so React re-renders), but what happened to the old render's todo?
**Expected:** `node --test` shows exactly one failure ("the reducer never mutates its input") with the broken case; all 8 tests pass with your fix.

### ⭐⭐ 4. Predict the replay (core)

Without running anything, trace this event log by hand and predict the final state — every todo's `id`, `text`, `done`, plus `nextId` — and therefore exactly which lines the browser list would show:

```js
replay([
  { type: 'added', text: 'a' },
  { type: 'added', text: '   ' },
  { type: 'added', text: 'b' },
  { type: 'toggled', id: 2 },
  { type: 'clearedDone' },
  { type: 'added', text: 'c' },
]);
```

**Practices:** predicting state (and the render it produces) by folding events through the rulebook.
**Hint:** two of the six actions are the tricky ones — one is rejected, one deletes.
**Expected:** your written answer names each surviving todo and the final `nextId`; then verify offline with a five-line scratch file and `node`.

### ⭐⭐⭐ 5. A filter that stays out of the reducer (challenge)

Add three buttons — `all` / `active` / `done` — that filter which todos are *shown*. Decide where the filter value lives: in the reducer's state, or in a separate `useState` in `App`? Implement it the way you can defend, and be ready to justify the choice in one sentence.

**Practices:** drawing the reducer's boundary — data rules in, view preferences out.
**Hint:** does changing the filter change any *fact* about the todos? Does any reducer rule need to read it?
**Expected:** with one done and one active todo, `active` shows only the undone one, `done` shows only the done one, `all` shows both; toggling a todo while in `active` makes it vanish from the list (it's still in state — switch filters to see it).

## Solutions

### 1. An "N left" counter

```jsx
const remaining = state.todos.filter((t) => !t.done).length;
// in the JSX, under <h1>:
<p>{remaining} left</p>
```

**Why:** this is a view of the state, not a new fact — storing it (in the reducer or a `useState`) would create a second copy that every rule must remember to update. Computed during render, it is correct by construction after *any* action, including rules added later. Project 09's lesson, applied to reducer state.

### 2. A "duplicated" rule, test-first

```js
// reducer.js
case 'duplicated': {
  const index = state.todos.findIndex((t) => t.id === action.id);
  if (index === -1) return state;
  const copy = { ...state.todos[index], id: state.nextId, done: false };
  return {
    todos: [...state.todos.slice(0, index + 1), copy, ...state.todos.slice(index + 1)],
    nextId: state.nextId + 1,
  };
}
```

```js
// reducer.test.js
test('duplicating inserts a fresh undone copy right after the original', () => {
  const state = replay([
    { type: 'added', text: 'a' },
    { type: 'added', text: 'b' },
    { type: 'toggled', id: 1 },
    { type: 'duplicated', id: 1 },
  ]);
  assert.deepEqual(
    state.todos.map((t) => [t.id, t.text, t.done]),
    [[1, 'a', true], [3, 'a', false], [2, 'b', false]],
  );
  assert.equal(state.nextId, 4);
});
```

**Why:** the copy spreads the original (keeping its text) and overrides `id` and `done` — id from `nextId` so deleted ids are never reused, `done: false` because the business rule says a copy is fresh work. The two-`slice` rebuild inserts without mutating; `if (index === -1) return state` reuses the "same reference = nothing happened" signal. The UI needs only `<button onClick={() => dispatch({ type: 'duplicated', id: t.id })}>copy</button>`.

### 3. The bug the browser can't see

The screen updates because `{ ...state, todos: state.todos }` is a **new outer object**, so `useReducer` sees changed state and re-renders — but `todo.done = !todo.done` **mutated an object belonging to the previous state**. The "never mutates its input" test fails. Correct version:

```js
case 'toggled':
  return {
    ...state,
    todos: state.todos.map((t) =>
      t.id === action.id ? { ...t, done: !t.done } : t,
    ),
  };
```

**Why:** mutation here corrupts every older reference to that todo — the action-log replay trick, undo history (project 40), and `React.memo` bail-outs (project 28) all compare old objects, and this bug silently rewrites history behind their backs. The browser can't show that today; the Node test can. `map` + spread builds a new todo for the one that changed and reuses the untouched ones.

### 4. Predict the replay

Final state: `todos = [{ id: 1, text: 'a', done: false }, { id: 3, text: 'c', done: false }]`, `nextId = 4`. The list shows two lines: `a` and `c`.

**Why:** `'a'` takes id 1; the whitespace add is rejected (state returned unchanged — `nextId` stays 2, so no id is burned); `'b'` takes id 2; `toggled 2` marks b done; `clearedDone` deletes b; `'c'` takes id 3. Verify offline with a scratch file: import `todosReducer, initialState`, `console.log(actions.reduce(todosReducer, initialState))`, run `node` on it.

### 5. A filter that stays out of the reducer

Separate `useState` — the filter is a view preference, not a data rule: no reducer case reads it, and changing it changes nothing about the todos.

```jsx
const [filter, setFilter] = useState('all');
const visible = state.todos.filter((t) =>
  filter === 'all' ? true : filter === 'done' ? t.done : !t.done,
);
// buttons:
{['all', 'active', 'done'].map((f) => (
  <button key={f} onClick={() => setFilter(f)} disabled={filter === f}>{f}</button>
))}
// render the list from `visible` instead of state.todos
```

**Why:** the reducer is the rulebook for *what the todos are*; the filter only decides *which ones this screen shows*, so putting it in reducer state would force every test to carry an irrelevant field and blur the boundary that made the reducer testable. `visible` is derived during render (exercise 1's move again), so toggling a todo under the `active` filter re-derives the list and the finished item drops out. Defensible alternative: in the reducer *if* some future rule needed it — none does here.
