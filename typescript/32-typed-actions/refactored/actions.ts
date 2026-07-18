// Actions as a discriminated union (ts#10): each action type carries
// EXACTLY its payload, dispatches are checked end to end, and the
// reducer narrows per case — react#13's architecture, fully typed.

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export interface State {
  todos: Todo[];
  nextId: number;
}

// The action VOCABULARY — every event that can happen, with its data:
export type TodoAction =
  | { type: 'added'; text: string }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number }
  | { type: 'clearedDone' };

export function todosReducer(state: State, action: TodoAction): State {
  switch (action.type) {
    case 'added':
      // action narrowed: .text is a string, present, certain
      return {
        todos: [
          ...state.todos,
          { id: state.nextId, text: action.text, done: false },
        ],
        nextId: state.nextId + 1,
      };
    case 'toggled':
      // action narrowed: .id is a number — not a raw payload guess
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t,
        ),
      };
    case 'deleted':
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) };
    case 'clearedDone':
      return { ...state, todos: state.todos.filter((t) => !t.done) };
  }
  // no default: the switch is EXHAUSTIVE over the union (ts#12) —
  // add an action to the vocabulary and this function won't compile
  // until it's handled. react#13's throw-on-unknown became
  // can't-even-write-unknown.
}

const initial: State = { todos: [], nextId: 1 };

export const s1 = todosReducer(initial, { type: 'added', text: 'buy milk' });
export const s2 = todosReducer(s1, { type: 'toggled', id: 1 });

// ==== type tests: the original's three wrong dispatches ===========
// @ts-expect-error — 'added' requires text as a string, not a bare payload
todosReducer(initial, { type: 'added', payload: 'buy milk' });

// @ts-expect-error — typo'd action types can't be dispatched (the silent no-op)
todosReducer(initial, { type: 'toggeld', id: 1 });

// @ts-expect-error — toggled takes an id: number, not an object
todosReducer(initial, { type: 'toggled', id: { id: 1 } });

// @ts-expect-error — payload fields can't cross actions: clearedDone carries nothing
todosReducer(initial, { type: 'clearedDone', id: 3 });
