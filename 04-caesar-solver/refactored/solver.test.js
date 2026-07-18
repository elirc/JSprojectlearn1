import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caesarShift, rot13 } from './caesar.js';
import { crack, englishScore } from './solver.js';

test('caesarShift shifts and wraps', () => {
  assert.equal(caesarShift('abc', 1), 'bcd');
  assert.equal(caesarShift('xyz', 3), 'abc');
});

test('a negative shift undoes a positive one', () => {
  assert.equal(caesarShift(caesarShift('Attack at dawn!', 7), -7), 'Attack at dawn!');
});

test('rot13 still works as a special case', () => {
  assert.equal(rot13('Hello'), 'Uryyb');
});

test('englishScore prefers English', () => {
  assert.ok(englishScore('the cat and the dog') > englishScore('wkh fdw dqg wkh grj'));
});

test('crack recovers the plaintext and the shift', () => {
  const plaintext = 'the quick brown fox jumps over the lazy dog';
  const result = crack(caesarShift(plaintext, 3));
  assert.equal(result.plaintext, plaintext);
  // caesarShift(x, 3) is decoded by shifting a further 23 (3 + 23 = 26).
  assert.equal(result.shift, 23);
});
