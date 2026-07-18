import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIPHERS, getCipher } from './ciphers.js';

// THE payoff of a shared interface: one test loop covers every cipher,
// including ciphers that haven't been written yet.
for (const cipher of CIPHERS) {
  test(`${cipher.name}: decrypt(encrypt(x)) === x`, () => {
    const key = cipher.needsKey ? 'key' : undefined;
    const numericKey = cipher.needsKey ? 7 : undefined;
    for (const text of ['Hello, World!', 'attack at dawn', '', 'A1 b2 C3!']) {
      const k = cipher.name === 'caesar' ? numericKey : key;
      assert.equal(
        cipher.decrypt(cipher.encrypt(text, k), k),
        text,
        `${cipher.name} failed to round-trip "${text}"`,
      );
    }
  });
}

test('caesar with shift 3 matches the classic example', () => {
  assert.equal(getCipher('caesar').encrypt('abc', 3), 'def');
});

test('vigenere shifts by the repeating keyword', () => {
  // a+b=b, b+c=d, c+d=f — keyword "bcd" shifts by 1,2,3
  assert.equal(getCipher('vigenere').encrypt('abc', 'bcd'), 'bdf');
});

test('vigenere skips punctuation without consuming key letters', () => {
  const c = getCipher('vigenere');
  assert.equal(c.decrypt(c.encrypt('a b!c', 'bcd'), 'bcd'), 'a b!c');
});

test('unknown cipher names throw with the available list', () => {
  assert.throws(() => getCipher('enigma'), /Available:/);
});
