/**
 * createStore — a mini Redux/Zustand. Four ideas, ~40 lines:
 *
 *   1. State is READ-ONLY from outside. The only door in is
 *      dispatch(action) — so "how did state end up like this?"
 *      has an answer: the action log.
 *   2. A REDUCER decides: (state, action) -> NEW state. Pure,
 *      immutable, all business rules in one testable place.
 *   3. subscribe() gets notified after every change — rendering
 *      can't be forgotten at a mutation site, because there are
 *      no mutation sites.
 *   4. MIDDLEWARE wraps dispatch: logging, async, crash reporting —
 *      cross-cutting concerns without touching the reducer.
 */

export function createStore(reducer, initialState, middlewares = []) {
  let state = initialState;
  const listeners = new Set();
  let dispatching = false;

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener); // project 38's contract
  }

  function baseDispatch(action) {
    if (action == null || typeof action.type !== 'string') {
      throw new TypeError('Actions must be objects with a string "type"');
    }
    // A reducer dispatching mid-reduce means state changed while we
    // were computing state from it. Refuse, loudly.
    if (dispatching) throw new Error('Reducers must not dispatch');

    dispatching = true;
    try {
      state = reducer(state, action);
    } finally {
      dispatching = false;
    }
    for (const listener of [...listeners]) listener(); // copy: 38's emit lesson
    return action;
  }

  // Build the middleware onion: each middleware receives the NEXT
  // dispatch and returns a wrapped one. [a, b] => a(b(baseDispatch)) —
  // a sees the action first, base last.
  const dispatch = middlewares
    .reduceRight((next, mw) => mw({ getState, dispatch: (a) => dispatch(a) })(next), baseDispatch);

  return { getState, dispatch, subscribe };
}
