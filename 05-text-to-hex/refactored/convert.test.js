import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCodePoints, textToHex, textToBinary } from './convert.js';

test('toCodePoints maps characters to numbers', () => {
  assert.deepEqual(toCodePoints('Hi'), [72, 105]);
});

test('emoji are one code point, not two halves', () => {
  assert.deepEqual(toCodePoints('💩'), [128169]);
});

test('textToHex pads to two digits and joins with spaces', () => {
  assert.equal(textToHex('Hi!'), '48 69 21');
});

test('textToBinary pads to eight bits', () => {
  assert.equal(textToBinary('Hi'), '01001000 01101001');
});

test('no trailing separator', () => {
  assert.ok(!textToHex('Hi').endsWith(' '));
});

test('empty string gives empty output, not a crash', () => {
  assert.equal(textToHex(''), '');
});

test('non-string input fails loudly at the boundary', () => {
  assert.throws(() => textToHex(42), TypeError);
});
