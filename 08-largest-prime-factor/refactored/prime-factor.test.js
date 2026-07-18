import { test } from 'node:test';
import assert from 'node:assert/strict';
import { largestPrimeFactor } from './prime-factor.js';

test('small composites', () => {
  assert.equal(largestPrimeFactor(6), 3);
  assert.equal(largestPrimeFactor(13195), 29);
});

test('a prime is its own largest prime factor', () => {
  assert.equal(largestPrimeFactor(2), 2);
  assert.equal(largestPrimeFactor(97), 97);
});

test('powers of two', () => {
  assert.equal(largestPrimeFactor(1024), 2);
});

test('the Project Euler input finishes instantly', () => {
  assert.equal(largestPrimeFactor(600851475143), 6857);
});

test('rejects bad input', () => {
  assert.throws(() => largestPrimeFactor(1), RangeError);
  assert.throws(() => largestPrimeFactor(3.5), RangeError);
});
