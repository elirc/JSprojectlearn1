// react#13's reducer, ported with the action typed as "anything with
// a type field, payload optional any". The reducer works; every
// dispatch is on the honor system.

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

interface State {
  todos: Todo[];
  nextId: number;
}

// The action type that isn't one:
interface Action {
  type: string;
  payload?: any;
}

export function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'added':
      return {
        todos: [
          ...state.todos,
          { id: state.nextId, text: action.payload.text, done: false },
          //                        ^ payload.text — hope it's there
        ],
        nextId: state.nextId + 1,
      };
    case 'toggled':
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.payload ? { ...t, done: !t.done } : t,
          //       ^ here payload is the raw id. Each case invents
          //         its own payload shape; nothing records them.
        ),
      };
    default:
      return state;
  }
}

const initial: State = { todos: [], nextId: 1 };

// Every one of these dispatches compiles. Three are wrong:
export const s1 = todosReducer(initial, { type: 'added', payload: { text: 'buy milk' } });
export const s2 = todosReducer(initial, { type: 'added', payload: 'buy milk' });
// payload.text of a string -> undefined -> a todo with no text
export const s3 = todosReducer(initial, { type: 'toggeld', payload: 1 });
// typo'd type -> default -> silent no-op (react#13 threw; this can't
// even tell)
export const s4 = todosReducer(initial, { type: 'toggled', payload: { id: 1 } });
// object where the id should be -> t.id === {id:1} is never true ->
// silent no-op again
