import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoize, fib } from './memoize.js';

test('returns the same results as the wrapped function', () => {
  const square = memoize((n) => n * n);
  assert.equal(square(4), 16);
  assert.equal(square(5), 25);
});

test('the wrapped function runs once per distinct input', () => {
  let calls = 0;
  const square = memoize((n) => { calls++; return n * n; });

  square(4); square(4); square(4);
  assert.equal(calls, 1);
  square(5);
  assert.equal(calls, 2);
});

test('each memoized function gets its OWN cache (the original shared one)', () => {
  const square = memoize((n) => n * n);
  const double = memoize((n) => n * 2);
  assert.equal(square(4), 16);
  assert.equal(double(4), 8); // the original printed 16 here
});

test('multiple arguments are distinguished', () => {
  let calls = 0;
  const add = memoize((a, b) => { calls++; return a + b; });
  assert.equal(add(1, 2), 3);
  assert.equal(add(2, 1), 3);
  assert.equal(calls, 2); // (1,2) and (2,1) are different inputs
});

test('a custom keyOf handles arguments JSON cannot (e.g. objects by id)', () => {
  let calls = 0;
  const getLabel = memoize(
    (user) => { calls++; return `#${user.id} ${user.name}`; },
    (user) => user.id,
  );
  getLabel({ id: 7, name: 'Ada' });
  getLabel({ id: 7, name: 'Ada' }); // different object, same id -> cache hit
  assert.equal(calls, 1);
});

test('cached falsy results are still cache hits (the != undefined trap)', () => {
  let calls = 0;
  const isEven = memoize((n) => { calls++; return n % 2 === 0; });
  isEven(3); isEven(3); // result is `false` — must still be cached!
  assert.equal(calls, 1);
});

test('memoized fibonacci reaches n=80 instantly', () => {
  assert.equal(fib(10), 55);
  assert.equal(fib(80), 23416728348467685);
});
