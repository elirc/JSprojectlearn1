# 📘 Learning Guide: Todo Capstone

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The classic todo app, done properly. On screen: a text input ("what
needs doing?"), an add button, three filter buttons (all / active /
done), a "clear done" button, the todo list itself — click a todo's
text to cross it out, click "x" to delete — and a "2 remaining"
counter at the bottom. Todos survive a page refresh because they're
saved in the browser.

Both versions *look* the same. The original is a working first draft
that quietly carries **five** classic bugs — the README calls it a
review quiz in code form. Certain click-rituals make each one visible:
refresh at the wrong moment and your todos vanish; delete one and
re-add and two todos share an id; toggle from the "done" filter and
the wrong row animates. The refactor survives all the rituals.

## 2. Concepts you need first

This capstone composes ideas from the whole track. Quick tour of each
(with pointers to the full versions).

### localStorage (the browser's little notebook)

`localStorage` stores strings that survive refreshes and browser
restarts, per website:

```js
localStorage.setItem('greeting', 'hello');
localStorage.getItem('greeting');   // 'hello' — even after a refresh
localStorage.getItem('missing');    // null
```

It only stores **strings**, so objects go through JSON:
`JSON.stringify(obj)` → string, `JSON.parse(str)` → object.
`JSON.parse` **throws an error** on garbage input — anything reading
storage must be ready for that (someone else's code, an old version
of your app, or a manual edit can leave junk there).

### Lazy initialization (load once, correctly)

Both `useState` and `useReducer` accept a way to compute the initial
value *once*, on the very first render. For `useReducer` it's the
third argument — an init function that receives the second argument:

```js
const [state, dispatch] = useReducer(reducer, fallback, (fb) => {
  try {
    const stored = localStorage.getItem('key');
    return stored === null ? fb : JSON.parse(stored);
  } catch { return fb; }
});
```

Why this matters here: the state starts out *already loaded*. There
is no moment where the app renders empty and loads later — which, as
we'll see, is exactly the moment the original loses your data.

### The load/save race (this project's nastiest bug)

The original loads with one effect and saves with another. But
effects run *after* render, in order. Timeline of doom:

1. First render: `todos = []` (the useState default).
2. Effects run. If the save effect observes `[]` before the loaded
   data arrives — or any re-render sneaks between load-start and
   load-finish — **the empty array gets saved over your stored
   todos.** Your data is gone, overwritten by nothing.

Lazy initialization kills this whole class of bug: the initial state
IS the stored state, so there is nothing to race.

### Stable identity (ids that never repeat)

Every todo needs an **id** — a value that identifies it forever. The
trap: `id: todos.length`. Add A, B, C → ids 0, 1, 2. Delete B →
[A(0), C(2)]. Add D → `todos.length` is 2 → **D gets id 2, same as
C.** Now toggling C toggles D too (or vice versa) — every
"find by id" operation has two matches. The fix: a counter that only
ever counts up (`nextId`), stored in state, incremented on every add,
never reused after deletes.

### Keys on lists (and why index keys are worst when filtered)

React uses `key` to match list items between renders, so it knows
which DOM rows to keep, move, or delete (project 03 teaches this
fully). `key={i}` (array index) breaks when items shift positions —
and a *filtered* list shifts constantly: toggle a todo in the
"active" filter and it disappears from the list, renumbering every
index after it. React then matches old row 2 with new row 2 — which
is now a *different todo* — producing wrong crossing-out and lost row
state. `key={t.id}` is stable no matter what the filter does.

### Reducers (quick recap)

A **reducer** collects all the update rules in one pure function
`(state, action) => newState`; components just `dispatch` actions.
Project 13's LEARN.md covers it fully — this app's reducer is
essentially that project's, with `nextId` minting stable ids.

### Derived values (quick recap)

Project 09: never store what you can compute. `remaining` (count of
unfinished todos) and `visible` (todos passing the current filter)
are recomputed every render — no `useState`, no sync effect, no
chance of showing a stale count.

### Rules as data: a lookup table of filters

Instead of a chained ternary deciding what each filter means, store
the meanings in an object mapping names to test functions
(**predicates** — functions returning true/false):

```js
const FILTERS = {
  all: () => true,
  active: (t) => !t.done,
  done: (t) => t.done,
};
state.todos.filter(FILTERS[filter]);          // apply the current one
Object.keys(FILTERS).map(...)                 // render the buttons
```

Adding a filter = adding one entry. The buttons render themselves
from the table's keys — data and UI can't drift apart.

### Controlled input + Enter to submit (quick recap)

The draft input is controlled (`value` + `onChange`, project 07), and
`onKeyDown={(e) => e.key === 'Enter' && submitDraft()}` makes Enter
work like the add button (project 14).

## 3. Walking through the original code

State: `todos`, `draft`, `filter` — plus one that shouldn't exist:

```js
const [remaining, setRemaining] = useState(0);
useEffect(() => {
  setRemaining(todos.filter((t) => !t.done).length);
}, [todos]);
```

A stored copy of something computable, kept in sync by an effect —
disease #1 (react#09).

Persistence, bolted on with two effects:

```js
useEffect(() => {
  const stored = localStorage.getItem('todos-v1');
  if (stored) setTodos(JSON.parse(stored));
}, []);
useEffect(() => {
  localStorage.setItem('todos-v1', JSON.stringify(todos));
}, [todos]);
```

Disease #2, twice over: the load runs *after* the first render (so
the save effect can write `[]` over your real data first), and
`JSON.parse(stored)` is unguarded — if storage contains garbage (the
comment notes `"undefined"` as classic crash bait), the app dies on
arrival.

Adding a todo:

```js
setTodos([...todos, { id: todos.length, text: draft.trim(), done: false }]);
```

Disease #3: `id: todos.length` — ids collide after any delete.

Rendering the filtered list:

```js
{visible.map((t, i) => (
  <li key={i} className={t.done ? 'done' : ''}>
```

Disease #4: index keys on a *filtered* list — the worst variant.

And disease #5 is spread everywhere: the toggle logic
(`setTodos(todos.map(...))`) and delete logic live inline inside JSX
handlers, so the update rules are smeared through the markup instead
of collected anywhere testable.

## 4. What's wrong with it (in beginner terms)

Each disease, as a thing you can watch happen:

1. **Stored derived state.** Works today — but it's a copy that must
   be maintained. Add any new way to change todos and forget the
   sync, and the counter lies. It also costs an extra render every
   change (render → effect → setRemaining → render again). The
   computed version *cannot* lie.
2. **The vanishing todos.** Add three todos, refresh. Usually fine…
   but the load happens after first render, and any save before the
   load lands writes `[]` into storage. Refresh at the wrong moment
   (or add any innocent re-render between the two effects) and your
   list is permanently empty. Data-loss bugs that strike
   *occasionally* are the worst kind — you can't reproduce them on
   demand, and users can't prove they happened.
3. **Colliding ids.** Add "milk", "eggs", "bread" (ids 0,1,2).
   Delete "eggs". Add "coffee" — it gets id 2, same as "bread". Now
   click "bread" to cross it out: *both* bread and coffee toggle,
   because `todos.map(x => x.id === t.id ...)` matches twice.
4. **Index keys on a filtered list.** Go to the "active" filter with
   several todos, toggle the first one. It leaves the list, every
   remaining item shifts up one index, and React mis-matches old rows
   to new rows. With plain text you may only notice styling glitches;
   give rows any internal state (an edit box, an animation) and it
   visibly attaches to the *wrong todo*.
5. **Smeared rules.** Toggle logic in one handler, delete in another,
   add in a function, trim rules inline… to answer "what are the ways
   todos can change?" you must read the entire JSX. Nothing is
   testable without a browser.

## 5. Try it yourself first!

This is the capstone — treat it as an exam. The five diseases above
are the question sheet.

1. **The counter:** which `useState` + `useEffect` pair can you
   delete and replace with a one-line `const`?
2. **The rules:** collect add/toggle/delete into a `todosReducer`.
   While you're there: where should the "ignore empty text" rule
   live? (Hint: in the rulebook, not the input handler.) And make the
   reducer mint ids from a `nextId` counter in state.
3. **The keys:** one-character-class fix. Which line, what change?
4. **The persistence:** replace both effects with ONE hook —
   `usePersistentReducer(key, reducer, defaultState)` — that loads in
   `useReducer`'s lazy third argument (wrapped in try/catch, falling
   back to the default) and saves in a single effect. Convince
   yourself the race is *structurally* gone: what is the first
   rendered state?
5. **The filters:** turn the ternary chain into a `FILTERS` lookup
   table, and render the buttons from `Object.keys(FILTERS)`. Then
   add a fourth filter to prove it's one line.

## 6. Understanding the refactored solution

**The reducer — the rules, all in one place:**

```js
case 'added': {
  const text = action.text.trim();
  if (text === '') return state;
  return {
    todos: [...state.todos, { id: state.nextId, text, done: false }],
    nextId: state.nextId + 1,
  };
}
```

Trimming and reject-empty are *rules*, so they live in the rulebook —
every future caller gets them for free. `nextId` lives in state and
only increments: delete and re-add all you like, ids never repeat.
`toggled` and `deleted` are immutable map/filter one-liners;
`clearedDone` is a new feature that cost one case. Unknown actions
throw — typos fail loudly.

**`usePersistentReducer` — the capstone's one new idea (15 lines):**

```js
const [state, dispatch] = useReducer(reducer, defaultState, (fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
});

useEffect(() => {
  localStorage.setItem(key, JSON.stringify(state));
}, [key, state]);
```

It's projects 13 and 23 fused. Read why each piece kills a disease:
- the lazy init runs **once, before the first render's output** — the
  first state the app ever has IS the stored state. There's no
  "empty first, load later" gap, so no save can overwrite real data
  with `[]`. The race isn't guarded against; it's *impossible*.
- `try/catch` + `stored === null` check: corrupted or missing storage
  falls back to the default instead of crashing.
- one save effect, keyed on `[key, state]` — every accepted change is
  persisted, and there's exactly one writer.
- it's generic: any reducer app can reuse it unchanged.

**Filters as a lookup table:** `FILTERS` maps names to predicates;
`visible` is `state.todos.filter(FILTERS[filter])`; the buttons render
from `Object.keys(FILTERS)`. Adding an "overdue" filter someday: one
entry, zero other edits.

**Derived, never stored:**

```js
const visible = state.todos.filter(FILTERS[filter]);
const remaining = state.todos.filter((t) => !t.done).length;
```

Two consts replace a state + effect. They cannot desync because they
don't persist between renders at all.

**And the keys:** `key={t.id}` — stable identity from the data, so
filtering and toggling move DOM rows correctly.

**The extensions the README points at** (each is a track project you
could bolt on): wrap `todosReducer` in project 40's `undoable` for
undo/redo — it's already compatible because it's pure; put the filter
in the URL hash (42) so it survives refresh and shares; sync to a
server with optimistic toggles (39); lift into a context store (41)
if the app grows screens. Nothing would need rewriting — that's what
composing standard shapes buys.

## 7. Words you learned (glossary)

- **Capstone:** a final project that combines everything learned.
- **localStorage:** browser storage of key→string that survives
  refresh.
- **JSON.stringify / JSON.parse:** object→string / string→object;
  parse throws on garbage.
- **Guarded parse:** wrapping JSON.parse in try/catch with a
  fallback.
- **Lazy initialization:** computing initial state once, on first
  render (useReducer's third argument).
- **Race condition:** correctness depending on which of two
  operations happens first (here: load vs save).
- **Stable id:** an identifier minted once and never reused
  (`nextId` counter).
- **Id collision:** two items sharing one id, breaking every
  find-by-id.
- **key:** React's hint for matching list items across renders;
  must be stable, from the data.
- **Predicate:** a function returning true/false, used for filtering.
- **Lookup table:** an object mapping names to values/functions,
  replacing if/ternary chains.
- **Derived value:** computed from state each render, never stored.
- **Reducer / action / dispatch:** the rulebook pattern (project 13).
- **Controlled input:** input whose value lives in React state.
- **Persistence:** state surviving page reloads.
- **Fallback:** the safe default used when loading fails.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load. (localStorage itself works offline once the page is up.)

1. **Run the bug rituals on the original.** (a) Add "milk, eggs,
   bread", delete "eggs", add "coffee", then toggle "bread" —
   expected: coffee toggles too (id collision). (b) In DevTools'
   console run `localStorage.setItem('todos-v1', 'undefined')` and
   refresh — expected: crash on load (unguarded parse). Then do both
   against the refactor — expected: nothing breaks.
2. **Corrupt the refactor's storage on purpose.**
   `localStorage.setItem('todos-v2', '{broken json')` then refresh.
   Expected: a clean empty app (the fallback), not a crash — and your
   next add starts a fresh valid save.
3. **Add an "overdue" filter... without the table.** First imagine
   the edit in the original's ternary chain. Then do it in the
   refactor: one entry in `FILTERS` like `overdue: (t) => !t.done`.
   Expected: a fourth button appears by itself — rendered from
   `Object.keys`.
4. **Add editing.** New reducer case:
   `case 'renamed': return { ...state, todos: state.todos.map((t) =>
   t.id === action.id ? { ...t, text: action.text } : t) };` and a
   double-click handler that prompts for new text. Expected: rename
   works, persists across refresh (the save effect never heard of
   renaming, and didn't need to), and is one more testable rule.
5. **Make it undoable.** Copy `undoable` and `createHistory` from
   project 40, wrap: `usePersistentReducer('todos-v3',
   undoable(todosReducer), createHistory(initialState))`, read state
   from `history.present`, add undo/redo buttons. Expected: full
   time travel over todos — and note how little glue it took,
   because both pieces are pure. (Bonus: the *history* persists too.
   Is that what you want? Design decisions live where the state
   shape does.)
