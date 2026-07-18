/**
 * A pub/sub event emitter — the pattern under DOM events, Node
 * streams, and every framework's event system.
 *
 * The contract:
 *   - any number of listeners per event (no onComplete2)
 *   - on() returns an UNSUBSCRIBE function (closure over the exact
 *     listener — no bookkeeping for callers)
 *   - one throwing listener can't stop the others; failures are
 *     collected and rethrown together as an AggregateError
 */
export class EventEmitter {
  #listeners = new Map(); // event name -> Set of functions

  /** Subscribe. Returns a function that unsubscribes this listener. */
  on(event, listener) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(listener);
    return () => this.#listeners.get(event)?.delete(listener);
  }

  /** Subscribe for one delivery only. */
  once(event, listener) {
    const off = this.on(event, (...args) => {
      off(); // unsubscribe FIRST, so a throwing listener still detaches
      listener(...args);
    });
    return off;
  }

  emit(event, ...args) {
    // Copy before iterating: a listener that unsubscribes (or
    // subscribes) during emit must not corrupt this delivery round.
    const listeners = [...(this.#listeners.get(event) ?? [])];
    const failures = [];

    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (err) {
        failures.push(err); // isolate: the next listener still runs
      }
    }

    // Isolated is not swallowed: report every failure, loudly, after
    // every listener has had its delivery.
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        `${failures.length} listener(s) failed for "${event}"`,
      );
    }
    return listeners.length;
  }

  listenerCount(event) {
    return this.#listeners.get(event)?.size ?? 0;
  }
}
