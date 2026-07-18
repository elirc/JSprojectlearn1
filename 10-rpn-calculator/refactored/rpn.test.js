import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRpn } from './rpn.js';

test('basic arithmetic', () => {
  assert.equal(evaluateRpn('3 4 +'), 7);
  assert.equal(evaluateRpn('10 4 -'), 6);
  assert.equal(evaluateRpn('6 7 *'), 42);
  assert.equal(evaluateRpn('15 4 /'), 3.75);
});

test('operand order matters for - and /', () => {
  assert.equal(evaluateRpn('2 8 -'), -6);
  assert.equal(evaluateRpn('2 8 /'), 0.25);
});

test('nested expression', () => {
  // (5 + ((1 + 2) * 4)) - 3
  assert.equal(evaluateRpn('5 1 2 + 4 * + 3 -'), 14);
});

test('the one-line operator works', () => {
  assert.equal(evaluateRpn('2 10 ^'), 1024);
});

test('extra whitespace is tolerated', () => {
  assert.equal(evaluateRpn('  3   4 + '), 7);
});

test('missing operands throw instead of returning NaN', () => {
  assert.throws(() => evaluateRpn('3 +'), /needs two operands/);
});

test('leftover operands throw instead of being dropped', () => {
  assert.throws(() => evaluateRpn('3 4'), /left on the stack/);
});

test('unknown tokens throw with the token named', () => {
  assert.throws(() => evaluateRpn('3 four +'), /"four"/);
});

test('empty input throws', () => {
  assert.throws(() => evaluateRpn('   '), /Empty/);
});
