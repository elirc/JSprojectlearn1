/**
 * js#39's History (past / present / future), reshaped as a REDUCER —
 * because react#13 taught that reducers are where testable state
 * rules live, and undo/redo is nothing but state rules.
 *
 * It's generic: `present` can be ANY app state (a palette, a form, a
 * game board). The undoable() wrapper below turns any plain reducer
 * into an undoable one — a higher-order reducer, the same move as
 * js#27's memoize but for reducers.
 */
export function createHistory(initialPresent) {
  return { past: [], present: initialPresent, future: [] };
}

export function historyReducer(history, action) {
  const { past, present, future } = history;

  switch (action.type) {
    case 'did': // a new action happened: present -> past, future dies
      return { past: [...past, present], present: action.next, future: [] };

    case 'undid': {
      if (past.length === 0) return history;
      return {
        past: past.slice(0, -1),
        present: past[past.length - 1],
        future: [present, ...future],
      };
    }
    case 'redid': {
      if (future.length === 0) return history;
      const [next, ...restFuture] = future;
      return { past: [...past, present], present: next, future: restFuture };
    }
    default:
      throw new Error(`Unknown history action: ${action.type}`);
  }
}

/**
 * Lift a plain reducer into an undoable one:
 *   - 'undo' / 'redo' actions walk the timeline
 *   - anything else is delegated to the inner reducer, and the
 *     result becomes a new 'did' entry (if it actually changed)
 */
export function undoable(reducer) {
  return function (history, action) {
    if (action.type === 'undo') return historyReducer(history, { type: 'undid' });
    if (action.type === 'redo') return historyReducer(history, { type: 'redid' });

    const next = reducer(history.present, action);
    if (next === history.present) return history; // no-op: don't pollute history
    return historyReducer(history, { type: 'did', next });
  };
}
