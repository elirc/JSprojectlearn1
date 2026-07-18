import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword } from './password.js';

test('respects the requested length', () => {
  assert.equal(generatePassword({ length: 20 }).length, 20);
});

test('guarantees one character from every enabled pool', () => {
  // Run it many times — the guarantee must hold every single time.
  for (let i = 0; i < 200; i++) {
    const password = generatePassword({ length: 8 });
    assert.match(password, /[a-z]/, `no lowercase in ${password}`);
    assert.match(password, /[A-Z]/, `no uppercase in ${password}`);
    assert.match(password, /[0-9]/, `no digit in ${password}`);
    assert.match(password, /[!@#$%^&*]/, `no symbol in ${password}`);
  }
});

test('disabled pools never appear', () => {
  for (let i = 0; i < 100; i++) {
    const password = generatePassword({ length: 12, symbols: false, digits: false });
    assert.match(password, /^[a-zA-Z]+$/, `unexpected char in ${password}`);
  }
});

test('excludeAmbiguous removes l, 1, O, 0', () => {
  for (let i = 0; i < 100; i++) {
    const password = generatePassword({ length: 12, excludeAmbiguous: true });
    assert.doesNotMatch(password, /[l1O0]/, `ambiguous char in ${password}`);
  }
});

test('all pools disabled is an error, not an infinite loop', () => {
  assert.throws(() =>
    generatePassword({ lowercase: false, uppercase: false, digits: false, symbols: false }),
  );
});

test('length too small to satisfy the guarantees is an error', () => {
  assert.throws(() => generatePassword({ length: 2 }));
});
