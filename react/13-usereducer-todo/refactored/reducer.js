/**
 * The todo app's ENTIRE rulebook, as one pure function:
 *
 *   nextState = reducer(state, action)
 *
 * No React in this file — which is exactly the point. It's js#17's
 * step(state, input) and js#40's transition(state, event), wearing
 * React's naming. Because it's pure, reducer.test.js unit-tests every
 * rule in Node without rendering anything.
 *
 * state:  { todos: [{id, text, done}], nextId }
 * action: { type: 'added'|'toggled'|'deleted'|'clearedDone'|'toggledAll', ... }
 */
export const initialState = { todos: [], nextId: 1 };

export function todosReducer(state, action) {
  switch (action.type) {
    case 'added': {
      const text = action.text.trim();
      if (text === '') return state; // rejecting bad input is a RULE — it lives here
      return {
        todos: [...state.todos, { id: state.nextId, text, done: false }],
        nextId: state.nextId + 1,
      };
    }
    case 'toggled':
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

    case 'toggledAll': {
      const anyNotDone = state.todos.some((t) => !t.done);
      return { ...state, todos: state.todos.map((t) => ({ ...t, done: anyNotDone })) };
    }
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
