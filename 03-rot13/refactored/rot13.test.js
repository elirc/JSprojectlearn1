import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rot13 } from './rot13.js';

test('rotates lowercase letters', () => {
  assert.equal(rot13('abc'), 'nop');
});

test('rotates uppercase letters, preserving case', () => {
  assert.equal(rot13('Hello'), 'Uryyb');
});

test('wraps around the end of the alphabet', () => {
  assert.equal(rot13('nz'), 'am');
});

test('leaves punctuation, digits and spaces alone', () => {
  assert.equal(rot13('a1! b?'), 'n1! o?');
});

test('is its own inverse', () => {
  const text = 'The quick brown fox, 123!';
  assert.equal(rot13(rot13(text)), text);
});

test('empty string is fine', () => {
  assert.equal(rot13(''), '');
});
