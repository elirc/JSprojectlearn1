/**
 * The client's sync brain — pure functions, aggressively tested,
 * because "two browsers editing the same list" is where bugs breed.
 *
 * The architecture (server-authoritative event log):
 *
 *   - The SERVER owns truth: every change becomes a numbered EVENT
 *     { version, type, todo, originTag } broadcast to all clients.
 *   - Clients apply their own edits OPTIMISTICALLY (instant UI),
 *     tagged with a random originTag.
 *   - Every client's state is rebuilt from events IN SERVER ORDER —
 *     including your own edits, which come back to you through the
 *     same pipe as everyone else's. One code path, guaranteed
 *     convergence: same events, same order, same final state.
 *   - originTag lets a returning event REPLACE your optimistic
 *     placeholder instead of duplicating it.
 *
 * Conflicts resolve last-write-wins in server order — honest and
 * simple. (Real-time text needs OT/CRDTs; a todo list does not.)
 */

export function initialState() {
  return { todos: [], version: 0 };
}

/** Your own edit, applied instantly, marked as not-yet-confirmed. */
export function optimisticAdd(state, { tag, title }) {
  return {
    ...state,
    todos: [...state.todos, { id: `pending-${tag}`, title, done: false, pending: true }],
  };
}

export function optimisticToggle(state, id) {
  return {
    ...state,
    todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done, pending: true } : t)),
  };
}

/**
 * The single entry point for server truth. Handles, in order:
 *   - stale/duplicate events (version <= ours): ignored
 *   - an event echoing OUR optimistic edit (originTag match):
 *     the placeholder is replaced in place — no duplicate, no flicker
 *   - everyone else's events: upsert/delete by id
 */
export function applyEvent(state, event, myTags = new Set()) {
  if (event.version <= state.version) return state; // replays are harmless

  let todos;
  if (event.type === 'deleted') {
    todos = state.todos.filter((t) => t.id !== event.todoId);
  } else if (myTags.has(event.originTag)) {
    // our own edit, confirmed: swap the placeholder for the real row
    const placeholderId = `pending-${event.originTag}`;
    let replaced = false;
    todos = state.todos.map((t) => {
      if (t.id === placeholderId || t.id === event.todo.id) {
        replaced = true;
        return event.todo;
      }
      return t;
    });
    if (!replaced) todos = [...todos, event.todo];
    // a toggle-confirm can produce two rows with the same id — dedupe:
    todos = todos.filter((t, i) => todos.findIndex((u) => u.id === t.id) === i);
  } else {
    const exists = state.todos.some((t) => t.id === event.todo.id);
    todos = exists
      ? state.todos.map((t) => (t.id === event.todo.id ? event.todo : t))
      : [...state.todos, event.todo];
  }

  return { todos, version: event.version };
}

/** Reconnect catch-up: replay everything after our version. */
export function applyEvents(state, events, myTags) {
  return events.reduce((s, e) => applyEvent(s, e, myTags), state);
}
