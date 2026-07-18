// Character pools as data. Adding a pool = adding a line here.
const POOLS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*',
};

const AMBIGUOUS = new Set(['l', '1', 'O', '0']);

/**
 * Generate a password.
 *
 * Every option is NAMED at the call site:
 *   generatePassword({ length: 16, symbols: false, excludeAmbiguous: true })
 *
 * Guarantees at least one character from every enabled pool — a password
 * generated with digits:true will actually contain a digit.
 *
 * `rng` is injectable for testing (see project 06 for the same trick).
 */
export function generatePassword({
  length = 16,
  lowercase = true,
  uppercase = true,
  digits = true,
  symbols = true,
  excludeAmbiguous = false,
  rng = Math.random,
} = {}) {
  const enabled = { lowercase, uppercase, digits, symbols };
  const activePools = Object.keys(POOLS)
    .filter((name) => enabled[name])
    .map((name) => filterPool(POOLS[name], excludeAmbiguous));

  if (activePools.length === 0) {
    throw new Error('At least one character pool must be enabled');
  }
  if (length < activePools.length) {
    throw new Error(
      `length ${length} can't fit one character from each of the ${activePools.length} enabled pools`,
    );
  }

  const pick = (pool) => pool[Math.floor(rng() * pool.length)];

  // One guaranteed character per enabled pool, then fill the rest
  // from all pools combined...
  const allChars = activePools.join('');
  const chars = [
    ...activePools.map(pick),
    ...Array.from({ length: length - activePools.length }, () => pick(allChars)),
  ];

  // ...then shuffle, so the guaranteed characters aren't always first.
  return shuffle(chars, rng).join('');
}

function filterPool(pool, excludeAmbiguous) {
  if (!excludeAmbiguous) return pool;
  return [...pool].filter((char) => !AMBIGUOUS.has(char)).join('');
}

/** Fisher–Yates shuffle (the standard unbiased way to shuffle). */
function shuffle(array, rng) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
