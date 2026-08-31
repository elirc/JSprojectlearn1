# 🏋️ Practice: To-do App

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

For DOM-free exercises you can put the function in a small `.js` file and run it with `node file.js` — no browser needed.

## Exercises

### ⭐ 1. Counter text with correct grammar (warm-up)

The counter currently says "1 items left" — bad English. Write a **pure** function `remainingText(todos)` that returns the counter string with proper pluralization: `'0 items left'`, `'1 item left'`, `'2 items left'`. Then make `render()` in `refactored/index.html` use it.

What it practices: deriving display text from state with `filter`, and pulling a tiny pure function out of render so you can test it in node.

Hint: count the not-done todos, then use a ternary on `count === 1`.

Check (in node): `remainingText([])` → `'0 items left'`; `remainingText([{done:false}])` → `'1 item left'`; `remainingText([{done:false},{done:true},{done:false}])` → `'2 items left'`.

### ⭐⭐ 2. No duplicate todos (core)

Write a pure function `isDuplicate(todos, text)` that returns true when a todo with the same text already exists — ignoring upper/lower case and surrounding spaces. Then use it at the top of `addTodo` so adding `'  BUY MILK '` when `'Buy milk'` exists does nothing.

What it practices: guarding an action so bad data never enters the state (like the existing blank-text guard), plus `some` and string normalizing.

Hint: normalize both sides the same way — `.trim().toLowerCase()` — before comparing.

Check (in node): with `todos = [{id:1, text:'Buy milk', done:false}]`, `isDuplicate(todos,'buy milk')` and `isDuplicate(todos,'  BUY MILK ')` are true; `isDuplicate(todos,'buy bread')` is false. In the browser, adding a duplicate leaves the list and counter unchanged.

### ⭐⭐ 3. All / Active / Done filters (core)

Add three buttons and a state variable `filter` (`'all' | 'active' | 'done'`). Write a pure function `visibleTodos(todos, filter)` that returns the todos to display; `render()` draws only those — but the counter must still count from the **full** array. Clicking a filter button sets `filter` and re-renders.

What it practices: derived views — the screen shows a *computed slice* of state, while the state itself stays untouched.

Hint: the filter is state, so changing it follows the same protocol as everything else: change data, then `render()`. Don't hide `<li>`s — just render fewer of them.

Check (in node): with one done and two active todos, `visibleTodos(t,'active')` has 2 items, `visibleTodos(t,'done')` has 1, `visibleTodos(t,'all')` has 3. In the browser: on "Done", the counter still says `2 items left`.

### ⭐⭐ 4. Edit a todo with double-click (core)

Add an action `editTodo(id, newText)` that changes a todo's text (trimmed; ignore empty). Wire it so double-clicking a todo's text opens `prompt('Edit todo:', todo.text)` and applies the answer — unless the user pressed Cancel.

What it practices: adding a feature the refactor's way: one new action that mutates state and calls `render()`, one line of wiring, zero manual DOM patching.

Hint: `prompt` returns `null` on Cancel — that's different from an empty string. Use `span.ondblclick`.

Check: double-click "buy milk", type "buy oat milk", OK → the list updates and the change survives closing and reopening the page (persistence came for free).

### ⭐⭐⭐ 5. Undo (challenge)

Add an Undo button that reverses the last add, toggle, remove, or edit. Keep a `history` array; before **every** state change push a snapshot of `todos`, and `undo()` pops one back and renders. Pressing Undo with empty history must do nothing (no crash).

What it practices: the payoff of "state is plain data" — a whole undo feature is push/pop of JSON snapshots, impossible in the original where the DOM is the database.

Hint: `history.push(JSON.stringify(todos))` snapshots; `todos = JSON.parse(history.pop())` restores. Why stringify instead of `history.push(todos)`? Because toggle *mutates* objects inside the array — a shallow copy would remember the wrong done-flags.

Check: add "a", add "b", delete "a" → Undo brings "a" back → Undo removes "b" → Undo removes "a" → a fourth Undo does nothing. Counter is correct at every step.

### ⭐⭐⭐ 6. Prove the mechanics in node (challenge)

Browsers hide logic bugs behind clicking. Write `undo-test.js` for node: re-create `todos`, `history`, and DOM-free versions of `addTodo` / `toggleTodo` / `removeTodo` / `undo` (everything except the `render()` calls), run the exercise-5 scenario, and `assert` the state after each step.

What it practices: the project's core claim — because actions only touch data, the *entire* behavior is testable without a browser.

Hint: `import assert from 'node:assert/strict';` and `assert.deepEqual(todos.map(t => t.text), ['buy milk', 'walk dog'])` style checks.

Check: `node undo-test.js` prints your success message and exits silently on every assert; break `undo()` (e.g. use `history.shift()` instead of `pop()`) and an assert must fail.

## Solutions

### 1. Counter text with correct grammar

```js
function remainingText(todos) {
  const n = todos.filter((t) => !t.done).length;
  return n === 1 ? '1 item left' : `${n} items left`;
}
// in render():  document.getElementById('counter').textContent = remainingText(todos);
```

WHY: the counter is *derived* from `todos`, so the fix lives in one pure function used by the one place that paints. Being pure (no DOM), you can check all three grammar cases in node in four lines — try doing that to the original's DOM-scanning counter.

### 2. No duplicate todos

```js
function isDuplicate(todos, text) {
  const wanted = text.trim().toLowerCase();
  return todos.some((t) => t.text.toLowerCase() === wanted);
}

function addTodo(text) {
  if (text.trim() === '') return;
  if (isDuplicate(todos, text)) return;
  todos.push({ id: nextId++, text: text.trim(), done: false });
  render();
}
```

WHY: actions are the only gate into the state, so one guard in `addTodo` protects everything downstream — render, counter, persistence all stay clean because dirty data never gets in. Normalizing both sides identically is what makes "BUY MILK" and " buy milk " collide.

### 3. All / Active / Done filters

```html
<p>
  <button id="filterAll">All</button>
  <button id="filterActive">Active</button>
  <button id="filterDone">Done</button>
</p>
```

```js
let filter = 'all';

function visibleTodos(todos, filter) {
  if (filter === 'active') return todos.filter((t) => !t.done);
  if (filter === 'done') return todos.filter((t) => t.done);
  return todos;
}

// in render(), change the loop header:
//   for (const todo of visibleTodos(todos, filter)) { ... }
// the `remaining` line still uses the full `todos` array.

document.getElementById('filterAll').onclick = () => { filter = 'all'; render(); };
document.getElementById('filterActive').onclick = () => { filter = 'active'; render(); };
document.getElementById('filterDone').onclick = () => { filter = 'done'; render(); };
```

WHY: the filter never *changes* the todos — it changes which slice gets drawn, computed fresh each render. In the original you'd be hiding `<li>` elements and teaching the counter loop about hidden rows; here the counter can't lie because it still reads the one true array.

### 4. Edit a todo with double-click

```js
function editTodo(id, newText) {
  const trimmed = newText.trim();
  if (trimmed === '') return;
  const todo = todos.find((t) => t.id === id);
  todo.text = trimmed;
  render();
}

// in render()'s loop, next to span.onclick:
span.ondblclick = () => {
  const answer = prompt('Edit todo:', todo.text);
  if (answer !== null) editTodo(todo.id, answer);
};
```

WHY: the feature follows the update protocol exactly — event → action → mutate state → render — so the crossed-out style, counter, and localStorage all stay correct with zero extra bookkeeping. The `null` check matters: Cancel means "leave it alone," while OK on an emptied box means "invalid," and the trim guard treats only the second as a no-op edit.

### 5. Undo

```html
<button id="undoButton">Undo</button>
```

```js
const history = [];
const snapshot = () => history.push(JSON.stringify(todos));

// first line inside addTodo (after the guards), toggleTodo, removeTodo, editTodo:
//   snapshot();

function undo() {
  if (history.length === 0) return;
  todos = JSON.parse(history.pop());
  render();
}

document.getElementById('undoButton').onclick = undo;
```

WHY: because state is one plain array, "the past" is just strings in another array — `stringify` on the way in, `parse` on the way out. The deep copy via JSON is essential: `toggleTodo` mutates a todo object in place, so a snapshot holding *references* would silently change along with the present. And since `render()` ends by calling `save()`, undo persists without any extra code.

### 6. Prove the mechanics in node

```js
import assert from 'node:assert/strict';

let todos = [];
let nextId = 1;
const history = [];
const snapshot = () => history.push(JSON.stringify(todos));

function addTodo(text) {
  if (text.trim() === '') return;
  snapshot();
  todos.push({ id: nextId++, text: text.trim(), done: false });
}
function removeTodo(id) { snapshot(); todos = todos.filter((t) => t.id !== id); }
function toggleTodo(id) { snapshot(); const t = todos.find((t) => t.id === id); t.done = !t.done; }
function undo() { if (history.length === 0) return; todos = JSON.parse(history.pop()); }

addTodo('buy milk');
addTodo('walk dog');
toggleTodo(1);
removeTodo(2);
assert.deepEqual(todos, [{ id: 1, text: 'buy milk', done: true }]);
undo(); assert.deepEqual(todos.map((t) => t.text), ['buy milk', 'walk dog']);
undo(); assert.equal(todos[0].done, false);
undo(); undo(); assert.deepEqual(todos, []);
undo(); assert.deepEqual(todos, []); // empty history: safe no-op
console.log('all undo checks passed');
```

WHY: every action is data-in, data-out, so deleting the `render()` calls leaves the app's whole brain runnable in node — the README's "delete the DOM and the app survives" test, taken literally. This is the same move project 16 makes with `game.js`: logic that never mentions `document` is logic you can test in milliseconds.
