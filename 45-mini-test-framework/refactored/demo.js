// Our framework, testing project 01's fizzbuzz — full circle.
// Run:  node demo.js          (all pass, exit code 0)
// Then break a case in the assertion below and run again: the output
// names the failure and the exit code is 1.
import { test, run, assertEqual, assertThrows } from './framework.js';
import { fizzbuzz, fizzbuzzRange } from '../../01-fizzbuzz/refactored/fizzbuzz.js';

test('multiples of 3 are Fizz', () => {
  assertEqual(fizzbuzz(3), 'Fizz');
  assertEqual(fizzbuzz(9), 'Fizz');
});

test('multiples of 5 are Buzz', () => {
  assertEqual(fizzbuzz(5), 'Buzz');
});

test('multiples of both are FizzBuzz', () => {
  assertEqual(fizzbuzz(15), 'FizzBuzz');
});

test('plain numbers pass through as strings', () => {
  assertEqual(fizzbuzz(7), '7');
});

test('ranges work (deep equality on arrays, thanks to project 25)', () => {
  assertEqual(fizzbuzzRange(1, 5), ['1', '2', 'Fizz', '4', 'Buzz']);
});

test('async tests just work', async () => {
  const value = await Promise.resolve('Fizz');
  assertEqual(value, fizzbuzz(3));
});

test('assertThrows catches expected explosions', () => {
  assertThrows(() => { throw new Error('kaboom'); }, /kaboom/);
});

run();
