# 📘 Learning Guide: Typed Actions

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

This code manages a todo list with a **reducer** — one function that takes the current state plus an **action** (a plain object describing "what just happened," like "a todo was added") and returns the next state. UIs built with React/Redux use this pattern everywhere: components **dispatch** actions; the reducer applies them.

The type-level problem: the original types actions as `{ type: string; payload?: any }` — any string for the name, anything (or nothing) for the data. So wrong payload shapes compile, and a *typo'd action name* compiles too — it just falls into the `default` case and changes nothing. Silently. The fix: define the whole **action vocabulary** as a discriminated union, one variant per action, each carrying exactly its own data.

## 2. Concepts you need first

### The reducer pattern
A reducer is a pure function: `(state, action) => newState`. "Pure" means it doesn't modify its inputs — it builds and returns a fresh state. All changes to state flow through this single function, which makes app behavior predictable and testable:

```ts
function counter(state: number, action: { type: string }): number {
  if (action.type === 'increment') return state + 1;
  return state;
}
```

### Actions and dispatching
An action is a plain object describing an event: `{ type: 'added', text: 'buy milk' }`. The `type` field names the event; other fields carry its data. "Dispatching" just means sending an action to the reducer. In this exercise we call the reducer directly.

### Spread syntax (`...`) for non-mutating updates
`...` copies an object's or array's contents into a new one:

```ts
const s = { a: 1, b: 2 };
const s2 = { ...s, b: 3 };        // new object: { a: 1, b: 3 } — s untouched
const list2 = [...list, newItem]; // new array with one more item
```

Reducers use this constantly: copy everything, override what changed.

### `.map` and `.filter` (quick recap)
`arr.map(fn)` builds a new array by transforming each item; `arr.filter(fn)` builds a new array keeping only items where `fn` returns true. Both leave the original untouched — perfect for reducers.

### Discriminated unions
The star tool, fully taught in exercise 10's LEARN.md. A union of object shapes sharing a literal tag (here `type`):

```ts
type Action =
  | { type: 'added'; text: string }
  | { type: 'toggled'; id: number };

function reduce(a: Action) {
  if (a.type === 'added') a.text;  // ✅ narrowed: text exists here
  // a.text                        // ❌ Error outside the check
}
```

### Exhaustive switches (no `default`)
When a `switch` covers every variant of a union and the function must return something, you can omit `default`. Then *adding* a new variant makes the function fail to compile until you handle it — the compiler becomes your todo list (exercise 12's LEARN.md).

### Why `payload?: any` is a double curse
`?` makes the data optional (forgetting it compiles); `any` makes its shape unchecked (wrong shapes compile). Together, the action type checks exactly one thing: that a `type` string exists. Everything else is vibes.

### `@ts-expect-error`
A comment asserting the next line must fail to compile — a type test (exercise 19's LEARN.md).

## 3. Walking through the original code

```ts
interface Action {
  type: string;
  payload?: any;
}
```

"The action type that isn't one." Any string, any (or no) payload. Every dispatch in the program is on the honor system.

```ts
case 'added':
  return {
    todos: [
      ...state.todos,
      { id: state.nextId, text: action.payload.text, done: false },
    ],
    nextId: state.nextId + 1,
  };
```

The `'added'` case *hopes* the payload is an object with `.text`. Nothing records that expectation anywhere — it lives in this line only.

```ts
case 'toggled':
  return {
    ...state,
    todos: state.todos.map((t) =>
      t.id === action.payload ? { ...t, done: !t.done } : t,
    ),
  };
```

And here, `payload` is expected to be... a raw number. Each case invents its own payload convention. A new teammate must read the reducer's *body* to learn how to dispatch — and will guess wrong.

```ts
export const s2 = todosReducer(initial, { type: 'added', payload: 'buy milk' });
export const s3 = todosReducer(initial, { type: 'toggeld', payload: 1 });
export const s4 = todosReducer(initial, { type: 'toggled', payload: { id: 1 } });
```

Three wrong dispatches, all compiling: `s2` sends a bare string where `{text}` was hoped for; `s3` typos the type name; `s4` sends an object where the raw id was expected.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: payload shapes are unrecorded, so wrong shapes compile.** In `s2`, `action.payload.text` is `('buy milk').text` — `undefined`. A todo gets created with `text: undefined`. **Runtime bug story:** the UI renders an empty list row. No crash, no error — just a blank todo that confuses everyone in the demo. The bug is data-shaped, so it survives until a human *looks* at it.

**Flaw 2: the typo'd action name — the silent no-op.** `'toggeld'` matches no case, falls to `default`, and returns the state unchanged. The user taps a checkbox and *nothing happens*. There's no error to log, no crash to trace — the code did exactly what it was told, which was nothing. Fun historical note: the original JS version of this reducer *threw* on unknown actions, so at least it failed loudly. The `any`-flavored port can't even tell an unknown action from a known one — this "typed" port is *worse* than the untyped original.

**Flaw 3: wrong payload kind = another silent no-op.** In `s4`, `t.id === { id: 1 }` compares a number to an object — never true in JavaScript. `.map` dutifully changes nothing. Again: no crash, just quiet wrongness.

**Flaw 4: the `default` case hides all of this.** `default: return state` is exactly what makes typos survivable-but-invisible. It converts "unknown action" from a bug into normal behavior.

## 5. Try it yourself first!

1. **Vague hint:** The reducer's cases already know what data each action needs. Move that knowledge out of the case bodies and into a type the dispatchers see.
2. **Less vague:** Write one union type, one variant per action. Each variant: a literal `type` plus *exactly* the fields that action needs — no generic `payload` wrapper at all.
3. **More specific:** `{ type: 'added'; text: string }` and `{ type: 'toggled'; id: number }` (add `'deleted'` and `'clearedDone'` if you like). Change the reducer's parameter to this union and update the case bodies to `action.text` / `action.id`.
4. **The finishing move:** delete the `default` case. If the compiler complains the function might not return, some variant is unhandled — handle it. Now the switch is exhaustive.
5. **Test it:** try dispatching all three wrong dispatches from the original (`payload: 'buy milk'`, `'toggeld'`, object-as-id). All three should now be compile errors.

## 6. Understanding the refactored solution

```ts
export type TodoAction =
  | { type: 'added'; text: string }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number }
  | { type: 'clearedDone' };
```

This is the **vocabulary**: every event that can happen to the todos, each carrying exactly its data. No `payload` wrapper, no optional anything. `'clearedDone'` carries nothing — so a dispatch that adds an `id` to it is an error (one of the type tests checks precisely that: payload fields can't cross actions).

```ts
case 'added':
  return {
    todos: [
      ...state.todos,
      { id: state.nextId, text: action.text, done: false },
    ],
    nextId: state.nextId + 1,
  };
```

Inside `case 'added'`, narrowing makes `action` the `'added'` variant: `.text` is a `string` — present, certain, no `payload.` guessing. Same for `.id` in `'toggled'`: it's a `number`, so the object-instead-of-id dispatch can't be written anymore.

```ts
  }
  // no default: the switch is EXHAUSTIVE over the union —
```

No `default`. Because `TodoAction` has exactly four variants and all four are handled, TypeScript knows every path returns `State`. Two payoffs: (1) an unknown action *cannot even be dispatched* — the runtime throw the JS original needed is now unnecessary, the bad dispatch never compiles; (2) add a fifth action to the vocabulary and the reducer *fails to compile* until you write its case. The compiler hands you a checklist.

There's also an editor-experience payoff worth knowing about: at a dispatch site, typing `{ type: '` pops up the four real action names (autocomplete reads the union); pick one, and the compiler demands its exact fields. The vocabulary is *discoverable* — no docs needed, and no way for docs to go stale.

The four type tests at the bottom pin the original's wrong dispatches as permanent compile errors: bare-string payload, the `'toggeld'` typo, object-as-id, and a stowaway field on `'clearedDone'`.

Big picture: this pattern isn't todo-specific. Any **command channel** — reducer actions, event buses (exercise 20 typed one!), messages to a web worker, RPC calls — deserves a discriminated-union vocabulary: every command name paired with exactly its payload. Senders get checked and autocompleted; receivers narrow and must be exhaustive. This is also exactly how Redux Toolkit (the standard Redux helper library) types its actions internally.

## 7. Words you learned (glossary)

- **Reducer**: a pure function `(state, action) => newState`; the single place state changes.
- **Action**: a plain object describing an event, named by its `type` field.
- **Dispatch**: sending an action to the reducer.
- **Payload**: the data an action carries (the refactor inlines it as named fields).
- **Pure function**: returns new data, never modifies its inputs.
- **Spread (`...`)**: copy an object/array into a new one, optionally overriding parts.
- **Discriminated union**: a union of shapes sharing a literal tag field (exercise 10).
- **Narrowing**: the compiler shrinking a union to one variant inside a checked branch.
- **Exhaustive switch**: a switch covering every variant, so no `default` is needed (exercise 12).
- **Silent no-op**: code that does nothing instead of failing — the least debuggable bug.
- **Vocabulary**: the complete, typed set of commands a channel accepts.
- **Command channel**: any pipe carrying "do this" messages — reducers, buses, workers, RPC.
- **Autocomplete/discoverability**: the editor offering valid names because the type lists them.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/actions.ts`, add a new action to the vocabulary: `| { type: 'renamed'; id: number; text: string }`. Expect: ❌ `todosReducer` stops compiling ("not all code paths return a value") until you add a `case 'renamed'`. Write it (map over todos, replace the matching one's text) and watch it go green.
2. Add a `default: return state;` back into the switch. Expect: ✅ compiles — and now repeat experiment 1. The missing-case error is gone; the new action silently no-ops again. Feel exactly what `default` costs you, then remove it.
3. In the `'toggled'` case, change `action.id` to `action.text`. Expect: ❌ error — `text` doesn't exist on the `'toggled'` variant. Narrowing works in both directions: each case can only touch its own fields.
4. Try dispatching `todosReducer(initial, { type: 'added', text: 'x', id: 5 })`. Expect: ❌ error — excess property `id` isn't on the `'added'` variant. Extra data can't stow away on the wrong action.
5. Change the vocabulary's `'toggled'` variant to `{ type: 'toggled'; id: number | string }`. Expect: ✅ everything still compiles — including `t.id === action.id` where `t.id` is a number. Is that comparison still safe at runtime for a string id? (It's never `true` for strings — a silent no-op sneaks back in through a *typed* door.) Lesson: types stop many bugs, but you still design them; undo this one.
