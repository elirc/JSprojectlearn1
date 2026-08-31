/**
 * The menu's ENTIRE keyboard rulebook, as pure functions:
 *
 *   nextActive = nextIndex(current, key, count, options)
 *
 * No React and no DOM in this file — which is exactly the point. A key
 * press is `(state, event) => nextState`: the js track's `step(state,
 * input)` and project 13's reducer, wearing a keyboard's clothes. The
 * *decision* ("item 2 is now active") is arithmetic and lives here,
 * unit-tested in Node; the *doing* ("call .focus() on that node") is
 * one line of imperative code in the component.
 *
 * current: index of the active item, or -1 for "nothing active yet"
 * key:     an `event.key` string — 'ArrowDown' | 'ArrowUp' | 'Home' | 'End' | anything
 * count:   how many items the menu has
 * options: { disabled, loop }
 *   disabled — array of indices, or a predicate (i) => boolean. Default: none.
 *   loop     — true (default): past the end wraps to the start.
 *              false: clamp; the ends are walls.
 */

/** The keys this rulebook understands — the ones a handler should preventDefault. */
export const MENU_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

/** Normalise the `disabled` option into a plain predicate. */
function disabledPredicate(disabled) {
  if (typeof disabled === 'function') return disabled;
  if (Array.isArray(disabled)) return (i) => disabled.includes(i);
  return () => false;
}

/**
 * Walk from `start` in `step` direction until an enabled index is found.
 * Bounded by `count` attempts, so an all-disabled menu terminates instead
 * of spinning forever. Returns -1 when every item is disabled.
 */
function seek(start, step, count, isDisabled, loop) {
  let i = start;
  for (let attempts = 0; attempts < count; attempts++) {
    if (i < 0 || i >= count) {
      if (!loop) return -1; // walked off a wall: no landing spot this way
      i = i < 0 ? count - 1 : 0;
    }
    if (!isDisabled(i)) return i;
    i += step;
  }
  return -1; // every item is disabled
}

export function nextIndex(current, key, count, options = {}) {
  if (count <= 0) return -1;

  const isDisabled = disabledPredicate(options.disabled);
  const loop = options.loop !== false; // default: wrap around

  switch (key) {
    case 'ArrowDown': {
      const from = current < 0 ? 0 : current + 1;
      const found = seek(from, 1, count, isDisabled, loop);
      return found === -1 ? current : found;
    }
    case 'ArrowUp': {
      const from = current < 0 ? count - 1 : current - 1;
      const found = seek(from, -1, count, isDisabled, loop);
      return found === -1 ? current : found;
    }
    case 'Home': {
      const found = seek(0, 1, count, isDisabled, false);
      return found === -1 ? current : found;
    }
    case 'End': {
      const found = seek(count - 1, -1, count, isDisabled, false);
      return found === -1 ? current : found;
    }
    default:
      return current; // the no-op contract: same value in, same value out
  }
}
