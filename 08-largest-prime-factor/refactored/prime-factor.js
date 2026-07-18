/**
 * Largest prime factor, by dividing factors OUT instead of testing
 * primality at all.
 *
 * Key insight: if you divide out every 2, then every 3, then every 4
 * (which can't divide anymore — its 2s are gone), and so on, then any
 * factor you find is automatically prime. No isPrime needed.
 *
 * Second insight: you only need to try factors up to sqrt(remaining).
 * If anything bigger were a factor, its partner would be smaller than
 * sqrt and we'd have found it already. Whatever remains at the end is
 * either 1 or one final (large) prime factor.
 *
 * 600851475143 -> 6857, in microseconds.
 */
export function largestPrimeFactor(n) {
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`Need an integer >= 2, got ${n}`);
  }

  let remaining = n;
  let largest = 1;

  for (let factor = 2; factor * factor <= remaining; factor++) {
    while (remaining % factor === 0) {
      largest = factor;
      remaining = remaining / factor;
    }
  }

  // Either everything divided out (remaining === 1), or what's left
  // is a prime bigger than sqrt — and that's the largest factor.
  return remaining > 1 ? remaining : largest;
}
