/**
 * MyPromise — a real Promise implementation: settle-once state
 * machine, microtask-scheduled handlers, chaining, error
 * propagation, and thenable adoption. (The core of the Promises/A+
 * spec; `finally`/`all`/cancellation left as exercises.)
 *
 * The mental model that makes it all click:
 *
 *   A promise is a STATE MACHINE (project 40):
 *     pending -> fulfilled(value)     (one way, one time)
 *     pending -> rejected(reason)
 *
 *   `then` NEVER runs anything now. It registers a REACTION and
 *   returns a NEW promise that the reaction will settle later.
 *   Chaining is just promises settling promises.
 */

const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

export class MyPromise {
  #state = PENDING;
  #result = undefined;   // value when fulfilled, reason when rejected
  #reactions = [];       // queued {onFulfilled, onRejected, settleNext}

  constructor(executor) {
    // Bind once; guard so resolve/reject TOGETHER can only win once.
    let settled = false;
    const resolve = (value) => {
      if (settled) return; // Problem 1's fix: settling is final
      settled = true;
      this.#resolveWith(value);
    };
    const reject = (reason) => {
      if (settled) return;
      settled = true;
      this.#settle(REJECTED, reason);
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err); // a throwing executor is just a rejection
    }
  }

  /**
   * Resolving is not the same as fulfilling: if `value` is itself a
   * promise (or any object with a callable .then — a "thenable"),
   * we ADOPT its eventual state instead of fulfilling with it.
   * This one rule is why `return anotherPromise` inside .then()
   * flattens instead of nesting.
   */
  #resolveWith(value) {
    const then = value !== null && (typeof value === 'object' || typeof value === 'function')
      ? value.then
      : undefined;

    if (typeof then !== 'function') return this.#settle(FULFILLED, value);

    let adopted = false; // a misbehaving thenable may call back twice
    try {
      then.call(
        value,
        (v) => { if (!adopted) { adopted = true; this.#resolveWith(v); } },
        (r) => { if (!adopted) { adopted = true; this.#settle(REJECTED, r); } },
      );
    } catch (err) {
      if (!adopted) this.#settle(REJECTED, err);
    }
  }

  #settle(state, result) {
    this.#state = state;
    this.#result = result;
    const reactions = this.#reactions;
    this.#reactions = []; // deliver each reaction exactly once
    for (const reaction of reactions) this.#schedule(reaction);
  }

  /**
   * Handlers ALWAYS run on the microtask queue — never synchronously
   * inside resolve() or inside then(). This is what makes
   * subscribe-before-settle and subscribe-after-settle behave
   * identically, and guarantees code after `.then(...)` runs before
   * the handler does.
   */
  #schedule(reaction) {
    queueMicrotask(() => {
      const handler = this.#state === FULFILLED ? reaction.onFulfilled : reaction.onRejected;
      if (typeof handler !== 'function') {
        // No handler for this outcome: pass the result THROUGH.
        // (This hole in the chain is how errors skip past .then(fn)
        // blocks and land in the .catch at the end.)
        reaction.settleNext(this.#state, this.#result);
        return;
      }
      try {
        reaction.settleNext(FULFILLED, handler(this.#result)); // may be a thenable -> adopted
      } catch (err) {
        reaction.settleNext(REJECTED, err); // a throwing handler rejects the NEXT promise
      }
    });
  }

  then(onFulfilled, onRejected) {
    let settleNext;
    const next = new MyPromise((resolve, reject) => {
      settleNext = (state, result) => (state === FULFILLED ? resolve(result) : reject(result));
    });

    const reaction = { onFulfilled, onRejected, settleNext };
    if (this.#state === PENDING) this.#reactions.push(reaction);
    else this.#schedule(reaction); // already settled: late subscribers still fire

    return next;
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  static resolve(value) {
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}
