# 🏋️ Practice: Typed actions

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a fresh scratch file (e.g. `32-typed-actions/practice.ts`, ending with `export {}` so it's a module) or in a COPY of `refactored/actions.ts`. Check your work with `npm run typecheck` from the `typescript/` folder. When a scratch file needs `Todo`, `State`, or `TodoAction`, copy those few lines in — retyping them is part of the practice.

## Exercises

### ⭐ 1. A second consumer (warm-up)

The reducer isn't the only code that can consume the action vocabulary. Write `describeAction(action: TodoAction): string` that returns a human sentence for each action (e.g. `'added'` → `add "buy milk"`), using a switch with **no `default`** so it's exhaustive.

Practices: narrowing per `case` and exhaustiveness in a brand-new consumer.

Hint: inside `case 'added':` the compiler knows `.text` exists; declare the return type `string` so a missing case becomes an error.

Check: this must compile with all four cases present; deleting any one case must error with roughly "Function lacks ending return statement".

### ⭐⭐ 2. Grow the vocabulary (core)

Product wants a "complete all" button. Add `{ type: 'completedAll' }` (no payload) to the action union, then follow the compiler errors until everything is green again — the reducer must mark every todo done. Finally, prove no payload can stow away on the new action.

Practices: extending a discriminated union and letting exhaustiveness hand you the to-do list.

Hint: the moment the variant exists, the no-`default` switch stops compiling; that error IS the feature.

Check: dispatching `{ type: 'completedAll' }` must compile; add a `@ts-expect-error` type test that catches `{ type: 'completedAll', id: 1 }` (excess property).

### ⭐⭐ 3. A new command channel (core)

Design a vocabulary from scratch for a music player with state `{ playing: boolean; position: number; trackId: number | null }`. Three events: play a given track (starts at position 0), pause, and seek to a number of seconds. Write the discriminated union `PlayerAction` and an exhaustive `playerReducer`.

Practices: choosing discriminants and payloads for a fresh domain — the design half of the pattern.

Hint: give each variant *exactly* the data its case needs — `pause` needs nothing.

Check: this must compile with no `default`; add `@ts-expect-error` tests that catch a typo'd type (`'paused'`) and a crossed payload (`{ type: 'seek', trackId: 3 }`).

### ⭐⭐ 4. One variant, by name (core)

Sometimes a function should accept only ONE action from the vocabulary. Write the utility `ActionOf<K>` so that `ActionOf<'toggled'>` is exactly `{ type: 'toggled'; id: number }`, without redeclaring any payload shapes.

Practices: `Extract` on a discriminated union — deriving per-variant types from the vocabulary.

Hint: `Extract<TodoAction, { type: K }>` keeps the union members whose `type` matches `K`; constrain `K extends TodoAction['type']`.

Check: `const a: ActionOf<'toggled'> = { type: 'toggled', id: 4 }` must compile; add a `@ts-expect-error` test that catches `{ type: 'added', id: 4 }` typed as `ActionOf<'added'>`.

### ⭐⭐⭐ 5. The handler map (challenge)

Rebuild the reducer as a lookup table instead of a switch: an object with one handler function per action type, where each handler receives *its own* action variant (the `'added'` handler sees `.text`, never `.id`). Type the map with a mapped type over `TodoAction['type']` using your `ActionOf<K>`, then write `todosReducerViaMap(state, action)` that dispatches through it.

Practices: mapped types correlating keys to function signatures — the switch's table-driven twin.

Hint: the map's type is `{ [K in TodoAction['type']]: (state: State, action: ActionOf<K>) => State }`. At the dispatch line, TypeScript cannot correlate `handlers[action.type]` with `action` — one contained `as` on the looked-up handler is the honest escape hatch.

Check: the map must refuse a wrong handler — add a `@ts-expect-error` test where the `toggled` handler tries to read `action.text`. Omitting any key from the map must error with roughly "Property 'deleted' is missing".

## Solutions

### 1. A second consumer

```ts
function describeAction(action: TodoAction): string {
  switch (action.type) {
    case 'added': return `add "${action.text}"`;
    case 'toggled': return `toggle todo #${action.id}`;
    case 'deleted': return `delete todo #${action.id}`;
    case 'clearedDone': return 'clear all completed todos';
  }
}
```

WHY: each `case` narrows `action` to one variant, so `.text` and `.id` are only touchable where they exist. With a declared `string` return and no `default`, the compiler proves every variant returns — delete a case and the function "lacks ending return statement". Every new consumer of the vocabulary gets this exhaustiveness guarantee for free.

### 2. Grow the vocabulary

```ts
export type TodoAction =
  | { type: 'added'; text: string }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number }
  | { type: 'clearedDone' }
  | { type: 'completedAll' };   // ← new

// in todosReducer's switch, after the existing cases:
    case 'completedAll':
      return { ...state, todos: state.todos.map((t) => ({ ...t, done: true })) };

todosReducer(initial, { type: 'completedAll' });  // ✅
// @ts-expect-error — completedAll carries no payload: ids can't stow away
todosReducer(initial, { type: 'completedAll', id: 1 });
```

WHY: adding the variant instantly breaks the exhaustive switch — "not all code paths return a value" — which is the compiler handing you the complete list of consumers to update (your `describeAction` from exercise 1 breaks too!). The excess-property check rejects stowaway fields on object literals, so `clearedDone`-style payload-free actions stay payload-free at every dispatch site.

### 3. A new command channel

```ts
interface PlayerState { playing: boolean; position: number; trackId: number | null }

type PlayerAction =
  | { type: 'play'; trackId: number }
  | { type: 'pause' }
  | { type: 'seek'; seconds: number };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'play': return { playing: true, position: 0, trackId: action.trackId };
    case 'pause': return { ...state, playing: false };
    case 'seek': return { ...state, position: action.seconds };
  }
}

// @ts-expect-error — typo'd action types can't be dispatched
playerReducer(stopped, { type: 'paused' });
// @ts-expect-error — seek's payload is seconds, not trackId
playerReducer(stopped, { type: 'seek', trackId: 3 });
```

WHY: the design decisions are the exercise — `play` carries the track to start, `pause` carries nothing, `seek` carries only seconds. Because the union records those decisions, the typo and the crossed payload are unrepresentable at every dispatch site, and the reducer's no-`default` switch will flag any future event you add.

### 4. One variant, by name

```ts
type ActionOf<K extends TodoAction['type']> = Extract<TodoAction, { type: K }>;

const a: ActionOf<'toggled'> = { type: 'toggled', id: 4 };      // ✅
const c: ActionOf<'clearedDone'> = { type: 'clearedDone' };     // ✅
// @ts-expect-error — the 'added' variant carries text, not id
const bad: ActionOf<'added'> = { type: 'added', id: 4 };
```

WHY: `Extract<Union, { type: K }>` filters the union to the members whose discriminant matches — the payload shapes stay defined in exactly one place (the vocabulary) and per-variant types are *derived*, never re-declared. The `K extends TodoAction['type']` constraint means asking for a variant that doesn't exist (`ActionOf<'renamed'>`) is itself a compile error.

### 5. The handler map

```ts
type ActionType = TodoAction['type'];

const handlers: { [K in ActionType]: (state: State, action: ActionOf<K>) => State } = {
  added: (state, action) => ({
    todos: [...state.todos, { id: state.nextId, text: action.text, done: false }],
    nextId: state.nextId + 1,
  }),
  toggled: (state, action) => ({
    ...state,
    todos: state.todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
  }),
  deleted: (state, action) => ({
    ...state,
    todos: state.todos.filter((t) => t.id !== action.id),
  }),
  clearedDone: (state) => ({ ...state, todos: state.todos.filter((t) => !t.done) }),
};

function todosReducerViaMap(state: State, action: TodoAction): State {
  const handler = handlers[action.type] as (state: State, action: TodoAction) => State;
  return handler(state, action);
}
```

WHY: the mapped type correlates every key with the *matching* handler signature, so inside `toggled` the parameter is `ActionOf<'toggled'>` — reading `action.text` there refuses to compile, and omitting a key errors, which keeps the map exactly as exhaustive as the switch was. The one cast at the dispatch line is a known TypeScript limitation: `handlers[action.type]` and `action` are each fine, but the compiler can't prove they vary *together*. The cast is contained at the hub, and it can't hide a wrong handler because the map's own type already checked every signature.
