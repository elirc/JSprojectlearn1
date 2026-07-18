/**
 * debounce(fn, waitMs) — returns a version of fn that fires only
 * after waitMs of silence. Rapid calls keep pushing the deadline
 * back; only the LAST call's arguments win.
 * Use for: search-as-you-type, resize handlers, autosave.
 *
 * Like project 27's memoize, this is a higher-order function whose
 * private state (`timeoutId`) lives in a closure — every debounced
 * function gets its own timer, so two debounced fields can never
 * cancel each other (the original's bug).
 */
export function debounce(fn, waitMs) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), waitMs);
  };
}

/**
 * throttle(fn, intervalMs) — returns a version of fn that fires at
 * most once per interval: the first call goes through immediately,
 * then a cooldown. Extra calls during cooldown are DROPPED.
 * Use for: scroll position updates, mousemove, rate-limiting clicks.
 *
 * Debounce = "wait for quiet". Throttle = "steady drumbeat".
 * A resize handler wants debounce (act when done); a scroll progress
 * bar wants throttle (update along the way).
 */
export function throttle(fn, intervalMs) {
  let lastFiredAt = -Infinity;
  return function (...args) {
    const now = Date.now();
    if (now - lastFiredAt >= intervalMs) {
      lastFiredAt = now;
      fn.apply(this, args);
    }
  };
}
