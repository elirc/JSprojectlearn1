import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize, parse, referencesOf, computeOrder, evaluateSheet,
  CYCLE, BAD_FORMULA, DIVIDE_BY_ZERO,
} from './engine.js';

test('plain numbers and empty cells', () => {
  const values = evaluateSheet({ A1: '5', B1: '2.5', C1: '', D1: '  7  ' });
  assert.equal(values.A1, 5);
  assert.equal(values.B1, 2.5);
  assert.equal(values.C1, 0); // an empty cell counts as zero
  assert.equal(values.D1, 7);
});

test('THE precedence test: =A1+B2*2 means A1 + (B2*2), not (A1+B2)*2', () => {
  const values = evaluateSheet({ A1: '3', B2: '4', C1: '=A1+B2*2' });
  assert.equal(values.C1, 11); // 3 + 8, not 14
  assert.deepEqual(parse(tokenize('A1+B2*2')), {
    type: 'binary',
    op: '+',
    left: { type: 'ref', name: 'A1' },
    right: {
      type: 'binary',
      op: '*',
      left: { type: 'ref', name: 'B2' },
      right: { type: 'number', value: 2 },
    },
  });
});

test('parentheses, unary minus and division', () => {
  const values = evaluateSheet({
    A1: '2', B1: '3',
    C1: '=(A1+B1)*2',
    D1: '=-A1+10',
    E1: '=B1/A1',
  });
  assert.equal(values.C1, 10);
  assert.equal(values.D1, 8);
  assert.equal(values.E1, 1.5);
});

test('THE original bug: a chain is right in ONE pass, whatever the grid order', () => {
  // A1 sits FIRST in the sheet but depends on B1, which depends on C1.
  // The original walked the grid top-to-bottom and needed three keystrokes
  // to settle; the order here is computed from the dependencies, not the grid.
  const cells = { A1: '=B1+1', B1: '=C1*2', C1: '5' };
  assert.deepEqual(evaluateSheet(cells), { A1: 11, B1: 10, C1: 5 });

  const { order } = computeOrder(cells);
  assert.ok(order.indexOf('C1') < order.indexOf('B1'), 'C1 must be computed before B1');
  assert.ok(order.indexOf('B1') < order.indexOf('A1'), 'B1 must be computed before A1');
});

test('a longer chain still settles in one pass', () => {
  const values = evaluateSheet({
    E5: '=D5+1', D5: '=C5+1', C5: '=B5+1', B5: '=A5+1', A5: '1',
  });
  assert.equal(values.E5, 5);
});

test('cycles are detected and marked, not looped forever', () => {
  const values = evaluateSheet({ D1: '=E1+1', E1: '=D1+1', A1: '9' });
  assert.equal(values.D1, CYCLE);
  assert.equal(values.E1, CYCLE);
  assert.equal(values.A1, 9); // the rest of the sheet is unaffected
});

test('a cell that reads a cycle is marked too, and self-reference is a cycle', () => {
  const values = evaluateSheet({ A1: '=A1+1', B1: '=D1', D1: '=E1', E1: '=D1' });
  assert.equal(values.A1, CYCLE);
  assert.equal(values.B1, CYCLE);
});

test('computeOrder reports exactly which cells are stuck', () => {
  const { order, cyclic } = computeOrder({ A1: '1', B1: '=A1', C1: '=D1', D1: '=C1' });
  assert.deepEqual(order, ['A1', 'B1']);
  assert.deepEqual(cyclic.sort(), ['C1', 'D1']);
});

test('referencesOf finds each cell once, in order', () => {
  assert.deepEqual(referencesOf('A1+B2*2'), ['A1', 'B2']);
  assert.deepEqual(referencesOf('A1+A1+C3'), ['A1', 'C3']);
  assert.deepEqual(referencesOf('1+2'), []);
});

test('A11 is ONE reference — the original spliced it into "51"', () => {
  assert.deepEqual(tokenize('A11'), [{ type: 'ref', name: 'A11' }]);
  assert.equal(evaluateSheet({ A1: '5', B1: '=A11' }).B1, 0); // off-sheet: empty
});

test('broken formulas become #ERROR!, never a silent wrong number', () => {
  const values = evaluateSheet({
    A1: '=1+', B1: '=(2+3', C1: '=2 $ 3', D1: 'hello', E1: '=2 3',
  });
  assert.equal(values.A1, BAD_FORMULA);
  assert.equal(values.B1, BAD_FORMULA);
  assert.equal(values.C1, BAD_FORMULA);
  assert.equal(values.D1, BAD_FORMULA);
  assert.equal(values.E1, BAD_FORMULA);
});

test('division by zero says so, and errors travel downstream', () => {
  const values = evaluateSheet({ A1: '1', B1: '0', C1: '=A1/B1', D1: '=C1+1' });
  assert.equal(values.C1, DIVIDE_BY_ZERO);
  assert.equal(values.D1, DIVIDE_BY_ZERO); // D1 can't be a number if C1 isn't
});

test('a formula is DATA, not code — nothing is ever eval-ed', () => {
  const values = evaluateSheet({
    A1: '=alert(1)',
    B1: "=(document.title='pwned')",
    C1: '=constructor',
  });
  assert.equal(values.A1, BAD_FORMULA);
  assert.equal(values.B1, BAD_FORMULA);
  assert.equal(values.C1, BAD_FORMULA);
  assert.throws(() => tokenize('alert(1)'), SyntaxError);
});

test('lowercase references work, and whitespace is ignored', () => {
  assert.equal(evaluateSheet({ A1: '4', B1: '=  a1 * 2  ' }).B1, 8);
});
