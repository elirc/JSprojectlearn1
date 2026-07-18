import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countCharacters, sortedByCount } from './count-characters.js';

test('counts simple text', () => {
  const counts = countCharacters('hello');
  assert.equal(counts.get('h'), 1);
  assert.equal(counts.get('l'), 2);
  assert.equal(counts.get('z'), undefined);
});

test('empty string gives an empty Map', () => {
  assert.equal(countCharacters('').size, 0);
});

test('emoji count as one character, not two surrogate halves', () => {
  const counts = countCharacters('💩💩');
  assert.equal(counts.get('💩'), 2);
  assert.equal(counts.size, 1);
});

test('"__proto__" is just a normal key in a Map', () => {
  const counts = countCharacters('_');
  assert.equal(counts.get('__proto__'), undefined);
  assert.equal(counts.get('_'), 1);
});

test('ignoreCase folds cases together', () => {
  const counts = countCharacters('AaA', { ignoreCase: true });
  assert.equal(counts.get('a'), 3);
});

test('non-strings are rejected loudly, not silently', () => {
  assert.throws(() => countCharacters(42), TypeError);
});

test('sortedByCount puts the most frequent first', () => {
  const sorted = sortedByCount(countCharacters('aabbbc'));
  assert.deepEqual(sorted[0], ['b', 3]);
});
