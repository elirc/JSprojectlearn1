/**
 * Undo/redo as a tiny class with the invariant IN THE SHAPE:
 *
 *   #past  = [older ... newest]   states you can undo to
 *   present                        what's on screen
 *   #future = [next ... furthest]  states you can redo to
 *
 * The rule the original broke — "a new action kills the redo future" —
 * is one unmissable line here: `this.#future = []` inside push().
 *
 * Works on SNAPSHOTS (whole states), which is why immutable state
 * (projects 17/26/33) matters: snapshots only work if old states
 * can't be mutated later.
 */
export class History {
  #past = [];
  #future = [];
  #present;

  constructor(initialState) {
    this.#present = initialState;
  }

  get present() {
    return this.#present;
  }

  get canUndo() {
    return this.#past.length > 0;
  }

  get canRedo() {
    return this.#future.length > 0;
  }

  /** Perform a new action: the present becomes past, the future dies. */
  push(nextState) {
    this.#past.push(this.#present);
    this.#present = nextState;
    this.#future = []; // <- the line the original was missing
  }

  undo() {
    if (!this.canUndo) return this.#present; // harmless at the boundary
    this.#future.push(this.#present);
    this.#present = this.#past.pop();
    return this.#present;
  }

  redo() {
    if (!this.canRedo) return this.#present;
    this.#past.push(this.#present);
    this.#present = this.#future.pop();
    return this.#present;
  }
}
