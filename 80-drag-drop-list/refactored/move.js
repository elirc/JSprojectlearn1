/**
 * Reordering a list, as one pure function.
 *
 *   moveItem(list, from, to) -> a NEW array with one item moved
 *
 * THE CONTRACT, stated once so nobody has to guess: `to` is the index the
 * item ENDS UP AT. Not "insert before the item currently at `to`" — that's a
 * different, equally defensible contract (project 64's board uses it), and it
 * needs the famous off-by-one when you move an item downwards past itself.
 * This version removes first and inserts second, so:
 *
 *   moveItem(['a','b','c','d'], 0, 2)  ->  ['b','c','a','d']
 *                                                 ^ 'a' really is at index 2
 *
 * Two nuisance cases are handled here instead of in five event handlers:
 *   - indexes outside the list are CLAMPED (dropping below the last row means
 *     "the end", not a crash or a hole),
 *   - from === to is a no-op that still returns a new array, so callers can
 *     always treat the result the same way.
 *
 * Non-integer indexes throw, because that means the caller's pointer math is
 * broken and a silent clamp would hide it (project 30's rule: fail loudly at
 * the boundary, forgive only what you can define).
 *
 * It's pure and immutable, so: it's testable in Node, undo is "keep the old
 * array", and the browser's drag events end up with nothing to decide.
 */
export function moveItem(list, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    throw new TypeError(`moveItem needs whole-number indexes, got (${from}, ${to})`);
  }
  if (list.length === 0) return [];

  const last = list.length - 1;
  const fromIndex = Math.min(Math.max(from, 0), last);
  const toIndex = Math.min(Math.max(to, 0), last);

  const next = [...list];
  if (fromIndex === toIndex) return next; // nothing to do, but still a copy

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
