# 🏋️ Practice: Cipher Suite

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Who needs a key? (warm-up)

Write a function `keylessNames()` (in a new file, or temporarily at the bottom of `refactored/ciphers.js`) that returns an array with the names of every cipher that does **not** need a key. Don't type any cipher names — derive the answer from the `CIPHERS` registry, so it stays correct when the registry grows.

What it practices: treating the registry as the single source of truth and querying it with `filter` and `map`.

Hint: `needsKey` is already on every cipher object; `!c.needsKey` selects the keyless ones.

Check: it must return exactly `['rot13', 'atbash', 'reverse']` (in registry order). Add any keyless cipher to `CIPHERS` and the result should update by itself.

### ⭐⭐ 2. Pin atbash down (core)

The round-trip loop proves atbash *undoes itself*, but not that it mirrors correctly — a cipher that did nothing would also round-trip. Add a pinned-example test to `ciphers.test.js`: atbash encrypt of `'Hello, World!'` must equal `'Svool, Dliow!'` exactly (case and punctuation preserved). Work the expected string out on paper first (a↔z, b↔y, ...).

What it practices: pairing property tests with concrete pinned examples, exactly like the existing caesar and vigenère tests.

Hint: position p mirrors to 25 − p. H is position 7, and 25 − 7 = 18 = S.

Check: `node --test 13-cipher-suite/` passes; change the expected string by one letter and it must fail.

### ⭐⭐ 3. Strict vigenère (core)

Right now vigenère silently accepts a key like `'k3y'` — the digit turns into a weird shift instead of an error. Make vigenère's `encrypt` and `decrypt` throw an `Error` mentioning "letters only" when the key contains anything except letters. Then add a test using `assert.throws`.

What it practices: `throw new Error(...)` — failing loudly instead of returning quietly-wrong data (same idea as `getCipher`).

Hint: test the key with the regex `/^[a-zA-Z]+$/` before doing any shifting.

Check: `getCipher('vigenere').encrypt('abc', 'k3y')` throws; `encrypt('abc', 'bcd')` still returns `'bdf'` and the round-trip suite stays green.

### ⭐⭐ 4. The impostor detector (core)

A lazy cipher `{ encrypt: (t) => t, decrypt: (t) => t }` passes every round-trip test while encrypting nothing. Write one new registry-loop test asserting that every cipher **changes** the sample text `'Hello, World!'` when encrypting (use key `7` for caesar, `'key'` for other keyed ciphers).

What it practices: property tests over the whole registry — writing a rule once that automatically covers future ciphers.

Hint: `assert.notEqual(cipher.encrypt(SAMPLE, key), SAMPLE)` inside a `for (const cipher of CIPHERS)` loop.

Check: the suite passes now; temporarily add the identity cipher above to `CIPHERS` and your new test (and only the new behavior it guards) must fail. Remove the impostor afterwards.

### ⭐⭐⭐ 5. Compose two ciphers (challenge)

Write `compose(a, b)` — it takes two **keyless** cipher objects and returns a new object with the same interface: `name` is `'a+b'` (e.g. `'rot13+reverse'`), `needsKey` is false, `encrypt` applies a then b, and `decrypt` undoes them in reverse order. The returned object should be good enough to drop into `CIPHERS` and pass the round-trip test.

What it practices: the whole point of interfaces — code that builds *new* conforming objects out of old ones without knowing what they do inside.

Hint: to undo "a then b" you must undo b **first**, then a — like taking off shoes and socks.

Check: with `combo = compose(getCipher('rot13'), getCipher('reverse'))`, `combo.encrypt('abc')` is `'pon'` (rot13 gives `'nop'`, reversed), and `combo.decrypt('pon')` is `'abc'`.

### ⭐⭐⭐ 6. A whole family from one factory (challenge)

Write `makeRotCipher(n)` that returns a keyless cipher named `` `rot${n}` `` which shifts letters by n. Don't re-implement any letter math — build it *on top of* the existing caesar entry via `getCipher('caesar')`. Then add `makeRotCipher(5)` to `CIPHERS`.

What it practices: factory functions — generating many registry entries from one recipe, reusing existing ciphers as parts.

Hint: encrypt is caesar's encrypt with the key pre-filled to n; decrypt likewise.

Check: `makeRotCipher(5).encrypt('abc')` is `'fgh'`; `makeRotCipher(13).encrypt('abc')` equals `getCipher('rot13').encrypt('abc')`; after registering rot5, `node --test` shows a new passing round-trip test with zero test-file edits.

## Solutions

### 1. Who needs a key?

```js
import { CIPHERS } from './ciphers.js';

const keylessNames = () => CIPHERS.filter((c) => !c.needsKey).map((c) => c.name);

console.log(keylessNames()); // ['rot13', 'atbash', 'reverse']
```

WHY: "which ciphers exist and what are they like?" should always be *asked of the registry*, never hardcoded. `filter` picks the keyless ones, `map` extracts names — the same derive-don't-duplicate move the CLI uses for its help text.

### 2. Pin atbash down

```js
test('atbash mirrors the alphabet, keeping case and punctuation', () => {
  assert.equal(getCipher('atbash').encrypt('Hello, World!'), 'Svool, Dliow!');
});
```

WHY: round-trip tests prove *consistency*, pinned examples prove *correctness* — you need both, because a do-nothing cipher is perfectly consistent. H(7)→S(18), e(4)→v(21), l(11)→o(14), o(14)→l(11); case and the comma survive because the regex only touches letters.

### 3. Strict vigenère

In `ciphers.js`, guard both directions (a tiny helper keeps it in one place):

```js
function checkVigenereKey(key) {
  if (!/^[a-zA-Z]+$/.test(key)) {
    throw new Error(`Vigenère key must be letters only, got "${key}"`);
  }
}

const vigenere = {
  name: 'vigenere',
  needsKey: true,
  encrypt: (text, key) => { checkVigenereKey(key); return vigenereShift(text, key, +1); },
  decrypt: (text, key) => { checkVigenereKey(key); return vigenereShift(text, key, -1); },
};
```

And the test:

```js
test('vigenere rejects keys with non-letters', () => {
  assert.throws(() => getCipher('vigenere').encrypt('abc', 'k3y'), /letters only/);
});
```

WHY: a digit in the key produced a legal-looking but surprising shift — the worst kind of bug, because nothing complains. Throwing turns silent nonsense into a loud, named failure, the same choice `getCipher` makes for unknown names.

### 4. The impostor detector

```js
test('every cipher actually changes the text when encrypting', () => {
  const SAMPLE = 'Hello, World!';
  for (const cipher of CIPHERS) {
    const key = cipher.name === 'caesar' ? 7 : cipher.needsKey ? 'key' : undefined;
    assert.notEqual(cipher.encrypt(SAMPLE, key), SAMPLE,
      `${cipher.name} returned its input unchanged`);
  }
});
```

WHY: this closes the exact loophole the round-trip property leaves open. Because it loops over `CIPHERS`, an identity impostor added next month is caught automatically — the registry-plus-property-test pattern doing its job. (Key 7, not 26: caesar with shift 26 legitimately changes nothing, so the pinned key matters.)

### 5. Compose two ciphers

```js
function compose(a, b) {
  return {
    name: `${a.name}+${b.name}`,
    needsKey: false,
    encrypt: (text) => b.encrypt(a.encrypt(text)),
    decrypt: (text) => a.decrypt(b.decrypt(text)),
  };
}

const combo = compose(getCipher('rot13'), getCipher('reverse'));
console.log(combo.encrypt('abc'));  // 'pon'
console.log(combo.decrypt('pon')); // 'abc'
```

WHY: `compose` never looks inside a or b — it only trusts their shape, which is exactly what an interface buys you. Decrypt reverses the *order* as well as the operations (undo b, then undo a); get that backwards and the round-trip test catches it, which is a nice way to convince yourself the test loop earns its keep.

### 6. A whole family from one factory

```js
function makeRotCipher(n) {
  return {
    name: `rot${n}`,
    needsKey: false,
    encrypt: (text) => getCipher('caesar').encrypt(text, n),
    decrypt: (text) => getCipher('caesar').decrypt(text, n),
  };
}

// in ciphers.js:  export const CIPHERS = [caesar, rot13, atbash, reverse, vigenere, makeRotCipher(5)];
console.log(makeRotCipher(5).encrypt('abc')); // 'fgh'
```

WHY: a factory turns "a cipher" into "a recipe for ciphers" — one function can mint rot1 through rot25, and every one it mints plugs into the registry, the CLI, and the tests untouched. Reusing caesar underneath means the letter math still lives in exactly one place (`shiftLetters`), so a wrap bug could never hide in just one family member.
