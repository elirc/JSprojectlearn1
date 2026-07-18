/**
 * Structural equality: do two values have the same CONTENTS?
 *
 * The design decisions (every deep-equal must pick — ours match
 * Node's assert.deepStrictEqual):
 *   - NaN equals NaN            (we're asking "same value?", and it is)
 *   - {a: undefined} !== {}     (different keys are different shapes)
 *   - key ORDER doesn't matter  ({a,b} equals {b,a})
 *   - Dates compare by timestamp
 */
export function deepEqual(a, b) {
  // Object.is is === plus two fixes: NaN equals NaN, and 0 !== -0.
  if (Object.is(a, b)) return true;

  // Past this point, primitives had their chance — only two objects
  // of the same kind can still be equal.
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]),
  );
}
