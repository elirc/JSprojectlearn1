/**
 * memoize(fn) — wrap any function so repeated calls with the same
 * arguments return the cached answer instead of recomputing.
 *
 * THE CLOSURE LESSON: `cache` is a local variable of memoize(), yet
 * the returned function still sees it after memoize() has finished —
 * that captured, private, per-wrapper variable is a closure. Each
 * call to memoize() creates a FRESH cache, so wrapped functions can
 * never collide (the original's shared-cache bug is structurally
 * impossible).
 *
 * Only memoize PURE functions: same args -> same result, no side
 * effects. Memoizing Math.random() gives you a very fast wrong answer.
 */
export function memoize(fn, keyOf = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function (...args) {
    const key = keyOf(...args);
    if (!cache.has(key)) {
      cache.set(key, fn.apply(this, args));
    }
    return cache.get(key);
  };
}

/**
 * Fibonacci, memoized against itself: each subtree is computed once.
 * Note the definition stays the pure two-line recurrence — the caching
 * is entirely the wrapper's job. fib(80) is instant (and exact-ish);
 * the naive version wouldn't finish before the heat death of your CPU.
 */
export const fib = memoize((n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2)));
