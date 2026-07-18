import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unique, sortBy, groupBy, countBy, chunk } from './array-utils.js';

test('unique preserves first-seen order', () => {
  assert.deepEqual(unique(['ana', 'bo', 'ana', 'cy']), ['ana', 'bo', 'cy']);
  assert.deepEqual(unique([]), []);
});

test('sortBy sorts numbers numerically (the .sort() default does not!)', () => {
  assert.deepEqual(sortBy([100, 9, 80, 12], (n) => n), [9, 12, 80, 100]);
});

test('sortBy does NOT mutate the input', () => {
  const scores = [100, 9, 80];
  sortBy(scores, (n) => n);
  assert.deepEqual(scores, [100, 9, 80]); // untouched
});

test('sortBy descending, on a derived key', () => {
  const players = [{ name: 'bo', score: 12 }, { name: 'ana', score: 80 }];
  const top = sortBy(players, (p) => p.score, { descending: true });
  assert.deepEqual(top.map((p) => p.name), ['ana', 'bo']);
});

test('groupBy groups into a Map by derived key', () => {
  const players = [
    { name: 'ana', team: 'red' }, { name: 'bo', team: 'blue' },
    { name: 'cy', team: 'red' },
  ];
  const teams = groupBy(players, (p) => p.team);
  assert.deepEqual(teams.get('red').map((p) => p.name), ['ana', 'cy']);
  assert.deepEqual(teams.get('blue').map((p) => p.name), ['bo']);
});

test('groupBy is safe for hostile keys like "constructor"', () => {
  const groups = groupBy([{ team: 'constructor' }], (p) => p.team);
  assert.equal(groups.get('constructor').length, 1);
});

test('countBy', () => {
  const counts = countBy(['a', 'b', 'a', 'a'], (x) => x);
  assert.equal(counts.get('a'), 3);
  assert.equal(counts.get('b'), 1);
});

test('chunk splits into pages, last page short', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});

test('chunk rejects nonsense sizes', () => {
  assert.throws(() => chunk([1], 0), RangeError);
  assert.throws(() => chunk([1], 1.5), RangeError);
});
