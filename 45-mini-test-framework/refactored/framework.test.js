// The framework's ASSERTIONS, tested with node:test — the real tool
// checking our small one. (Testing run() itself would need to capture
// stdout; the assertions are where the logic lives.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertEqual, assertThrows } from './framework.js';

test('assertEqual passes on deep-equal values', () => {
  assertEqual(1, 1);
  assertEqual({ a: [1, 2] }, { a: [1, 2] });
  assertEqual('x', 'x');
});

test('assertEqual throws with expected-vs-got in the message', () => {
  assert.throws(() => assertEqual(4, 5, 'answer'), /answer: expected 5, got 4/);
});

test('assertEqual is deep, not reference-based', () => {
  assert.doesNotThrow(() => assertEqual([1, [2]], [1, [2]]));
  assert.throws(() => assertEqual([1, [2]], [1, [3]]));
});

test('assertThrows passes when the function throws a matching error', () => {
  const err = assertThrows(() => { throw new Error('bad input'); }, /bad input/);
  assert.equal(err.message, 'bad input');
});

test('assertThrows fails when nothing throws', () => {
  assert.throws(() => assertThrows(() => 42), /expected the function to throw/);
});

test('assertThrows fails when the WRONG error throws', () => {
  assert.throws(
    () => assertThrows(() => { throw new Error('other'); }, /bad input/),
    /wrong error/,
  );
});
