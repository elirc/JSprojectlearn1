/**
 * An external store: state that lives OUTSIDE React, plus the two
 * functions React needs to watch it.
 *
 *   subscribe(listener) -> unsubscribe
 *   getSnapshot()       -> the current value
 *
 * No React in this file — which is exactly the point. This is the
 * publish/subscribe object from js#38's EventEmitter and project 41's
 * challenge exercise, written to the contract `useSyncExternalStore`
 * expects, so store.test.js can prove every rule in Node without
 * rendering anything.
 *
 * The contract, in two rules:
 *
 *   1. `getSnapshot()` must return an Object.is-STABLE value when
 *      nothing has changed. React calls it constantly and compares
 *      the results; a fresh object every call means "changed" every
 *      call, and React re-renders forever.
 *   2. `subscribe` must be the SAME function identity across renders,
 *      or React tears down and re-creates the subscription each time.
 *      Defining the store once, at module level, gives that for free.
 */

/** Create an independent store holding `initialValue`. */
export function createStore(initialValue) {
  let state = initialValue;
  const listeners = new Set();

  return {
    /**
     * Rule 1 lives here: we return the stored reference itself, never
     * a copy. Call it a thousand times with no update in between and
     * you get the same value back a thousand times.
     */
    getSnapshot: () => state,

    /** Register a listener; the returned function removes it. */
    subscribe(listener) {
      listeners.add(listener);
      // Idempotent by construction: Set.delete on an already-removed
      // listener is a harmless false, and touches nobody else.
      return () => {
        listeners.delete(listener);
      };
    },

    /** How many listeners are live — the leak detector for tests. */
    listenerCount: () => listeners.size,

    /**
     * Set the next value (a value, or an updater function of the
     * current one) and notify everyone. Setting the value it already
     * holds notifies NOBODY: no change, no work.
     */
    update(next) {
      const value = typeof next === 'function' ? next(state) : next;
      if (Object.is(value, state)) return false;
      state = value;
      // Iterate a COPY: a listener is allowed to subscribe or
      // unsubscribe while it runs, and the current round of
      // notifications must not change shape underneath us. Anyone who
      // signed up during this round waits for the next one; anyone who
      // left during it is not called at all.
      for (const listener of Array.from(listeners)) {
        if (listeners.has(listener)) listener();
      }
      return true;
    },
  };
}

/** The one store this project's page shares. */
export const store = createStore(0);
