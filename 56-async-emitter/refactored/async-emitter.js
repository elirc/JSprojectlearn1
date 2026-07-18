/**
 * AsyncEmitter — project 38's emitter, grown up for async apps:
 *
 *   on(event, fn, {signal})   — AbortSignal tears down WHOLE GROUPS of
 *                               subscriptions at once (the leak fix)
 *   waitFor(event, {timeoutMs}) — the next event as a PROMISE
 *                               (replaces polling loops)
 *   emitAsync(event, ...args) — runs listeners (sync or async) to
 *                               completion; failures collected, never
 *                               lost to the unhandled-rejection void
 *
 * Plus the leak smoke-alarm: exceeding maxListeners warns once —
 * loudly, with the event name — because a climbing listener count is
 * almost always a forgotten unsubscribe in a re-run setup path.
 */
export class AsyncEmitter {
  #listeners = new Map(); // event -> Set of fns
  #warned = new Set();
  #maxListeners;
  #warn;

  constructor({ maxListeners = 10, warn = console.warn } = {}) {
    this.#maxListeners = maxListeners;
    this.#warn = warn; // injectable, so tests can assert the warning
  }

  /**
   * Subscribe. Still returns an unsubscribe fn (38's contract), but
   * also accepts an AbortSignal — the DOM's own cleanup pattern.
   * One controller can own every subscription of a session:
   * abort() on disconnect and they ALL detach. You can't forget a
   * handle you never had to keep.
   */
  on(event, listener, { signal } = {}) {
    if (signal?.aborted) return () => {};

    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    const set = this.#listeners.get(event);
    set.add(listener);

    if (set.size > this.#maxListeners && !this.#warned.has(event)) {
      this.#warned.add(event);
      this.#warn(
        `Possible listener leak: ${set.size} listeners on "${event}" ` +
        `(max ${this.#maxListeners}). Forgotten unsubscribe in a reconnect path?`,
      );
    }

    const off = () => {
      set.delete(listener);
      signal?.removeEventListener('abort', off); // don't leak into the signal either
    };
    signal?.addEventListener('abort', off, { once: true });
    return off;
  }

  once(event, listener, opts) {
    const off = this.on(event, (...args) => {
      off();
      listener(...args);
    }, opts);
    return off;
  }

  /**
   * The next occurrence of `event`, as a promise. This is what kills
   * the polling loop: `await bus.waitFor('connected')` — no spin, no
   * lag, and with `timeoutMs` set it can't wait forever (project 43's
   * deadline lesson: hangs are worse than errors).
   */
  waitFor(event, { timeoutMs, signal } = {}) {
    return new Promise((resolve, reject) => {
      let timer;
      const off = this.once(event, (...args) => {
        clearTimeout(timer);
        resolve(args.length <= 1 ? args[0] : args);
      }, { signal });

      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          off();
          reject(new Error(`Timed out after ${timeoutMs}ms waiting for "${event}"`));
        }, timeoutMs);
      }
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error(`Aborted while waiting for "${event}"`));
      }, { once: true });
    });
  }

  /**
   * Deliver to every listener and AWAIT the async ones. allSettled
   * semantics (project 52's lesson): every listener gets its
   * delivery, then all failures surface together in one
   * AggregateError — none evaporate as unhandled rejections.
   */
  async emitAsync(event, ...args) {
    const listeners = [...(this.#listeners.get(event) ?? [])];
    const results = await Promise.allSettled(
      listeners.map(async (fn) => fn(...args)), // async wrapper: sync throws become rejections
    );
    const failures = results.filter((r) => r.status === 'rejected').map((r) => r.reason);
    if (failures.length > 0) {
      throw new AggregateError(failures, `${failures.length} listener(s) failed for "${event}"`);
    }
    return listeners.length;
  }

  listenerCount(event) {
    return this.#listeners.get(event)?.size ?? 0;
  }
}
