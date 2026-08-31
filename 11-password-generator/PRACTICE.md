# 🏋️ Practice: Password Generator

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Prove determinism with a test (warm-up)

The `rng` parameter exists so tests can control randomness — but no test actually proves the whole function is deterministic. Add a test to `password.test.js`: calling `generatePassword({ length: 10, rng: () => 0 })` twice returns the *same* string, and `generatePassword()` with no options has length 16. Your test should pass as-is, and would fail if someone replaced an `rng()` inside `pick` or `shuffle` with `Math.random()`.

What it practices: dependency injection is only a guarantee if a test pins it down.

Hint: `() => 0` has no state, so both calls see identical "randomness"; `assert.equal` on the two results is enough.

### ⭐⭐ 2. A startWithLetter option (core)

Many sites require passwords to begin with a letter. Add a `startWithLetter = false` option: when true, the returned password's first character is always a letter, the pool guarantees still hold, and asking for it with both letter pools disabled throws. Check with a 200-run loop test: every password matches `/^[a-zA-Z]/`; and `generatePassword({ lowercase: false, uppercase: false, startWithLetter: true })` throws.

What it practices: constructing a guarantee (the project's core lesson) instead of rerolling until lucky.

Hint: shuffle first; if position 0 isn't a letter, swap it with the first letter you find — one is guaranteed to exist because an enabled letter pool always contributes a character.

### ⭐⭐ 3. A passphrase generator (core)

Write a new function `generatePassphrase({ wordList, count = 4, separator = '-', rng = Math.random } = {})` that joins `count` randomly picked words from `wordList`, and throws if `wordList` is missing or empty. Check: with `rng: () => 0` and `wordList: ['correct', 'horse', 'battery', 'staple']`, `count: 3` returns `'correct-correct-correct'`; with `rng: () => 0.9` and `wordList: ['a', 'b']`, `count: 2, separator: ' '` returns `'b b'`.

What it practices: writing a fresh function in the project's style — options object, defaults, injectable rng, loud errors.

Hint: `Array.from({ length: count }, pickWord).join(separator)` is the whole body once you have a `pickWord` helper.

### ⭐⭐ 4. How big is the pool? (core)

Write `poolSize(options)` that returns how many distinct characters `generatePassword` would draw from, given the same `lowercase/uppercase/digits/symbols/excludeAmbiguous` options. Check: `poolSize()` returns `70`, `poolSize({ excludeAmbiguous: true })` returns `66`, `poolSize({ symbols: false })` returns `62`, and digits-only with `excludeAmbiguous: true` returns `8`.

What it practices: reusing the exact pool-building pipeline (filter enabled → filterPool → join) so two functions can never disagree about what the pool is.

Hint: it's the first ten lines of `generatePassword` with `.length` at the end instead of picking.

### ⭐⭐⭐ 5. A seeded rng (challenge)

`rng: () => 0` is predictable but boring — every pick is character 0. Write `makeSeededRng(seed)` returning a function that produces a *different-looking but repeatable* sequence in `[0, 1)`, using the classic linear congruential step: `state = (state * 1664525 + 1013904223) >>> 0`, then return `state / 4294967296`. Check: two calls of `generatePassword({ length: 12, rng: makeSeededRng(42) })` return the identical password; seed `7` gives a different one; and 1000 outputs of the rng all satisfy `0 <= v < 1`.

What it practices: the payoff of dependency injection — reproducible "randomness" without touching `generatePassword` at all.

Hint: keep `state` in a closure; `>>> 0` clamps to an unsigned 32-bit integer so the division can never reach 1.

### ⭐⭐⭐ 6. A unique option (challenge)

Add `unique = false`: when true, no character may appear twice in the password. The one-per-pool guarantee must still hold, and impossible requests must throw — with all four pools on there are only 70 distinct characters, so `length: 71` is impossible. Check with a loop test: 100 passwords of `length: 20` each have `new Set(password).size === 20` and still match all four pool regexes; `length: 70` works; `length: 71, unique: true` throws.

What it practices: constructing two guarantees at once, and rejecting impossible requests loudly instead of looping forever.

Hint: keep a `Set` of used characters and write `pickUnique(pool)` that filters them out before picking. The guaranteed one-per-pool picks can't collide with each other — the four pools share no characters.

## Solutions

### 1. Prove determinism with a test

```js
test('a fixed rng makes the whole function deterministic', () => {
  const first = generatePassword({ length: 10, rng: () => 0 });
  const second = generatePassword({ length: 10, rng: () => 0 });
  assert.equal(first, second);
  assert.equal(first.length, 10);
  assert.equal(generatePassword().length, 16);
});
```

WHY: injecting `rng` only helps if *every* random decision flows through it — the picks *and* the shuffle. This test locks that in: one stray `Math.random()` anywhere in the pipeline and the two passwords diverge. It also pins the default length, an edge no existing test covers.

### 2. A startWithLetter option

```js
// add to the destructured options:  startWithLetter = false,
// after the existing guard clauses:
  if (startWithLetter && !lowercase && !uppercase) {
    throw new Error('startWithLetter needs the lowercase or uppercase pool enabled');
  }
// replace the return line:
  const shuffled = shuffle(chars, rng);
  if (startWithLetter && !/[a-zA-Z]/.test(shuffled[0])) {
    const i = shuffled.findIndex((c) => /[a-zA-Z]/.test(c));
    [shuffled[0], shuffled[i]] = [shuffled[i], shuffled[0]];
  }
  return shuffled.join('');
```

WHY: like the digit guarantee, this is *constructed*, not hoped for — a letter is certain to exist (an enabled letter pool always contributes one guaranteed pick), so one swap always succeeds. The impossible combination is rejected up front, following the project's "throw on impossible requests" rule. Verified with a 200-run loop: every password starts with a letter and all four pool guarantees still hold.

### 3. A passphrase generator

```js
export function generatePassphrase({
  wordList, count = 4, separator = '-', rng = Math.random,
} = {}) {
  if (!Array.isArray(wordList) || wordList.length === 0) {
    throw new Error('wordList must be a non-empty array');
  }
  const pickWord = () => wordList[Math.floor(rng() * wordList.length)];
  return Array.from({ length: count }, pickWord).join(separator);
}
```

WHY: every house rule of the project in one small function — named options with defaults so call sites read as configuration, an injectable `rng` so the checks in the exercise are exact, and a loud throw for the one request that can't be honored. `Array.from({ length: n }, fn)` is the same "do this n times" tool the refactor uses for fill characters.

### 4. How big is the pool?

```js
export function poolSize({
  lowercase = true, uppercase = true, digits = true,
  symbols = true, excludeAmbiguous = false,
} = {}) {
  const enabled = { lowercase, uppercase, digits, symbols };
  return Object.keys(POOLS)
    .filter((name) => enabled[name])
    .map((name) => filterPool(POOLS[name], excludeAmbiguous))
    .join('').length;
}
```

WHY: because `POOLS` and `filterPool` are shared data and a shared helper, this function *cannot* drift out of sync with `generatePassword` — add a pool or another ambiguous character and both functions update together. That's the payoff of pools-as-data: 70, 66, 62 and 8 all fall out of the same pipeline. (26+26+10+8 = 70; minus the four ambiguous = 66; digits minus `1` and `0` = 8.)

### 5. A seeded rng

```js
export function makeSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
```

WHY: `generatePassword` needed zero changes — that is dependency injection paying off. The closure keeps `state` between calls, so the sequence looks random but replays identically for the same seed (verified: seed 42 twice gives the same 12-character password, seed 7 differs, and 1000 outputs all landed in `[0, 1)`). Note this is repeatable, not *secure* — fine for tests and demos, not for real secrets.

### 6. A unique option

```js
// add to the destructured options:  unique = false,
// replace the picking block:
  const allChars = activePools.join('');
  let chars;
  if (unique) {
    if (length > allChars.length) {
      throw new Error(`length ${length} exceeds the ${allChars.length} distinct characters available`);
    }
    const used = new Set();
    const pickUnique = (pool) => {
      const available = [...pool].filter((c) => !used.has(c));
      const char = available[Math.floor(rng() * available.length)];
      used.add(char);
      return char;
    };
    chars = [
      ...activePools.map(pickUnique),
      ...Array.from({ length: length - activePools.length }, () => pickUnique(allChars)),
    ];
  } else {
    const pick = (pool) => pool[Math.floor(rng() * pool.length)];
    chars = [
      ...activePools.map(pick),
      ...Array.from({ length: length - activePools.length }, () => pick(allChars)),
    ];
  }
  return shuffle(chars, rng).join('');
```

WHY: uniqueness is constructed the same way the digit guarantee was — by *removing* used characters from the pool before picking, not by rerolling and hoping. The guard clause makes the impossible request (`length: 71` from 70 distinct characters) fail loudly instead of `pickUnique` eventually picking from an empty list and producing `undefined`. Verified by running: 100 passwords of length 20 had 20 distinct characters each and still contained all four pool types, length 70 consumed the entire pool, and 71 threw.
