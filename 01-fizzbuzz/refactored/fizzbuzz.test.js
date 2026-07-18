import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fizzbuzz, fizzbuzzRange } from './fizzbuzz.js';

test('plain numbers come back as strings', () => {
  assert.equal(fizzbuzz(1), '1');
  assert.equal(fizzbuzz(7), '7');
});

test('multiples of 3 are Fizz', () => {
  assert.equal(fizzbuzz(3), 'Fizz');
  assert.equal(fizzbuzz(9), 'Fizz');
});

test('multiples of 5 are Buzz', () => {
  assert.equal(fizzbuzz(5), 'Buzz');
  assert.equal(fizzbuzz(20), 'Buzz');
});

test('multiples of both are FizzBuzz', () => {
  assert.equal(fizzbuzz(15), 'FizzBuzz');
  assert.equal(fizzbuzz(45), 'FizzBuzz');
});

test('range produces one entry per number', () => {
  assert.deepEqual(fizzbuzzRange(1, 5), ['1', '2', 'Fizz', '4', 'Buzz']);
});
