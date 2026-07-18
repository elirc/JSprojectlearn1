/**
 * Solve Towers of Hanoi. Returns the list of moves as data:
 *   [{ disc: 1, from: 'A', to: 'C' }, ...]
 *
 * The recursion reads exactly like the insight that solves the puzzle:
 *   1. move the n-1 smaller discs out of the way (onto the spare peg)
 *   2. move the biggest disc to the target
 *   3. move the n-1 smaller discs onto the biggest disc
 *
 * Base case: zero discs need zero moves. That's it — no special-casing
 * n === 1, no global counters. The move count is just moves.length.
 */
export function solveHanoi(discs, from = 'A', to = 'C', via = 'B') {
  if (!Number.isInteger(discs) || discs < 0) {
    throw new RangeError(`discs must be a non-negative integer, got ${discs}`);
  }
  if (discs === 0) return [];

  return [
    ...solveHanoi(discs - 1, from, via, to),
    { disc: discs, from, to },
    ...solveHanoi(discs - 1, via, to, from),
  ];
}

/** Turn one move into a human sentence. Kept out of solveHanoi on purpose. */
export function describeMove({ disc, from, to }) {
  return `Move disc ${disc} from ${from} to ${to}`;
}
