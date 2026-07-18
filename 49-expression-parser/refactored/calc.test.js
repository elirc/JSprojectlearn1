import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { calculate } from './calc.js';

test('basic arithmetic', () => {
  assert.equal(calculate('2 + 3'), 5);
  assert.equal(calculate('10 - 4'), 6);
  assert.equal(calculate('6 * 7'), 42);
  assert.equal(calculate('15 / 4'), 3.75);
});

test('THE test: precedence — the original said 20', () => {
  assert.equal(calculate('2 + 3 * 4'), 14);
  assert.equal(calculate('2 * 3 + 4'), 10);
  assert.equal(calculate('10 - 2 * 3'), 4);
});

test('parentheses override precedence', () => {
  assert.equal(calculate('(2 + 3) * 4'), 20);
  assert.equal(calculate('2 * (3 + 4) * (1 + 1)'), 28);
  assert.equal(calculate('((2))'), 2);
});

test('left associativity: 10 - 4 - 3 is (10-4)-3, not 10-(4-3)', () => {
  assert.equal(calculate('10 - 4 - 3'), 3);
  assert.equal(calculate('100 / 10 / 2'), 5);
});

test('unary minus', () => {
  assert.equal(calculate('-5 + 8'), 3);
  assert.equal(calculate('2 * -3'), -6);
  assert.equal(calculate('-(2 + 3)'), -5);
});

test('decimals and spacing do not matter', () => {
  assert.equal(calculate('3.5*2'), 7);
  assert.equal(calculate('  2+3*4  '), 14);
});

test('the parse tree itself has the right shape', () => {
  // "2 + 3 * 4": the * must be NESTED under the + as its right child.
  assert.deepEqual(parse(tokenize('2 + 3 * 4')), {
    type: 'binary',
    op: '+',
    left: { type: 'number', value: 2 },
    right: {
      type: 'binary',
      op: '*',
      left: { type: 'number', value: 3 },
      right: { type: 'number', value: 4 },
    },
  });
});

test('errors are specific, not NaN (the original returned NaN for all of these)', () => {
  assert.throws(() => calculate('2 + + 3'), /Unexpected "\+"/);
  assert.throws(() => calculate('(2 + 3'), /Missing closing parenthesis/);
  assert.throws(() => calculate('2 + 3)'), /after expression/);
  assert.throws(() => calculate('2 $ 3'), /Unexpected character "\$" at position 2/);
  assert.throws(() => calculate(''), /Unexpected end of input/);
  assert.throws(() => calculate('1..2'), /Bad number/);
});

test('division by zero is an error, not Infinity', () => {
  assert.throws(() => calculate('1 / 0'), RangeError);
});

test('eval is nowhere: input is data, never code', () => {
  assert.throws(() => calculate('process.exit(1)'), SyntaxError);
});
