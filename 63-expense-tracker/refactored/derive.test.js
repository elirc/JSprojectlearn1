import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAmount, deriveTotals, chartData, loadState, formatCents, SCHEMA_VERSION,
} from './derive.js';

test('parseAmount: dollars and cents to integer cents', () => {
  assert.equal(parseAmount('12.50'), 1250);
  assert.equal(parseAmount('$3'), 300);
  assert.equal(parseAmount('0.1'), 10);   // one decimal = tens of cents
  assert.equal(parseAmount(' 7.05 '), 705);
});

test('parseAmount: garbage is REJECTED, not NaN-ed into the ledger', () => {
  for (const bad of ['abc', '', '12.345', '-5', '0', '1e3', '12,50']) {
    assert.equal(parseAmount(bad), null, `should reject "${bad}"`);
  }
});

test('THE FLOAT BUG, fixed: 0.10 + 0.20 is exactly 30 cents', () => {
  const expenses = [
    { description: 'a', cents: parseAmount('0.10'), category: 'food' },
    { description: 'b', cents: parseAmount('0.20'), category: 'food' },
  ];
  assert.equal(deriveTotals(expenses).totalCents, 30); // not 30.000000000000004
});

test('total and category breakdown come from ONE derivation and agree', () => {
  const expenses = [
    { description: 'lunch', cents: 1250, category: 'food' },
    { description: 'bus', cents: 300, category: 'transport' },
    { description: 'coffee', cents: 450, category: 'food' },
  ];
  const { totalCents, byCategory } = deriveTotals(expenses);
  assert.equal(totalCents, 2000);
  assert.deepEqual(byCategory, { food: 1700, transport: 300 });
  const sumOfCats = Object.values(byCategory).reduce((a, b) => a + b, 0);
  assert.equal(sumOfCats, totalCents); // the original's double-count broke this
});

test('chartData: sorted largest-first with fractions that sum to 1', () => {
  const rows = chartData([
    { description: 'a', cents: 100, category: 'fun' },
    { description: 'b', cents: 300, category: 'food' },
  ]);
  assert.deepEqual(rows.map((r) => r.category), ['food', 'fun']);
  assert.equal(rows[0].fraction, 0.75);
  assert.equal(rows.reduce((s, r) => s + r.fraction, 0), 1);
});

test('chartData on an empty ledger: no division by zero', () => {
  assert.deepEqual(chartData([]), []);
});

test('loadState: empty / corrupt / wrong-version input all give fresh state', () => {
  const fresh = { version: SCHEMA_VERSION, expenses: [] };
  assert.deepEqual(loadState(null), fresh);
  assert.deepEqual(loadState('not json {'), fresh);
  assert.deepEqual(loadState('{"expenses": []}'), fresh);          // no version
  assert.deepEqual(loadState('{"version": 99, "expenses": []}'), fresh); // future version
});

test('loadState: malformed RECORDS are dropped, good ones kept (stored data is input)', () => {
  const raw = JSON.stringify({
    version: SCHEMA_VERSION,
    expenses: [
      { description: 'good', cents: 500, category: 'food' },
      { description: 'float ghost', cents: 5.5, category: 'food' }, // old float data
      { desc: 'renamed field', cents: 100, category: 'food' },      // old schema
      null,
    ],
  });
  assert.deepEqual(loadState(raw).expenses, [
    { description: 'good', cents: 500, category: 'food' },
  ]);
});

test('formatCents uses real currency formatting', () => {
  assert.equal(formatCents(1250), '$12.50');
  assert.equal(formatCents(30), '$0.30');
  assert.equal(formatCents(123456), '$1,234.56');
});
