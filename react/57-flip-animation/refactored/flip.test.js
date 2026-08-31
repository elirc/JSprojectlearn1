// An animation, tested in Node. Nothing renders, nothing moves, no
// browser is involved — because the only part of FLIP that DECIDES
// anything is the subtraction, and subtraction doesn't need a screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeInversions, diffKeys } from './flip.js';

const at = (left, top) => ({ left, top });

test('the inversion is previous minus current', () => {
  const prev = { a: at(0, 0) };
  const next = { a: at(40, 100) };
  // 'a' slid right and down, so the offset that hides the move is
  // up-and-left: negative on both axes.
  assert.deepEqual(computeInversions(prev, next), { a: { dx: -40, dy: -100 } });
});

test('moving the other way flips the signs', () => {
  const inversions = computeInversions({ a: at(40, 100) }, { a: at(0, 0) });
  assert.deepEqual(inversions, { a: { dx: 40, dy: 100 } });
});

test('items that did not move are left out entirely', () => {
  const prev = { a: at(0, 0), b: at(0, 60) };
  const next = { a: at(0, 60), b: at(0, 0) };
  const swappedOnly = computeInversions(prev, { ...next, c: at(9, 9) });
  assert.deepEqual(Object.keys(swappedOnly), ['a', 'b']);

  const nothingMoved = computeInversions(prev, prev);
  assert.deepEqual(nothingMoved, {});
});

test('sub-pixel jitter is not an animation', () => {
  const prev = { a: at(10, 10) };
  const next = { a: at(10.2, 9.8) };
  assert.deepEqual(computeInversions(prev, next), {});
  // ...unless you say otherwise
  assert.deepEqual(computeInversions(prev, next, 0.01), {
    a: { dx: -0.19999999999999929, dy: 0.19999999999999929 },
  });
});

test('a movement just over the threshold does count', () => {
  const inversions = computeInversions({ a: at(0, 0) }, { a: at(0, 0.6) });
  assert.deepEqual(Object.keys(inversions), ['a']);
});

test('items with no "before" are skipped — nothing to fly from', () => {
  assert.deepEqual(computeInversions({}, { fresh: at(0, 0) }), {});
});

test('items with no "after" are skipped — nothing left to animate', () => {
  assert.deepEqual(computeInversions({ gone: at(0, 0) }, {}), {});
});

test('a three-item list reversing itself', () => {
  const rowHeight = 50;
  const prev = { a: at(0, 0), b: at(0, 50), c: at(0, 100) };
  const next = { c: at(0, 0), b: at(0, 50), a: at(0, 100) };
  const inversions = computeInversions(prev, next);
  assert.deepEqual(inversions, {
    c: { dx: 0, dy: 100 },   // c is drawn at the top, offset back to the bottom
    a: { dx: 0, dy: -100 },  // a is drawn at the bottom, offset back to the top
  });
  assert.equal(inversions.b, undefined, 'the middle item never moved');
  assert.equal(inversions.a.dy, -2 * rowHeight);
});

test('a grid move produces both axes at once', () => {
  const inversions = computeInversions(
    { tile: at(0, 0) },
    { tile: at(120, 80) },
  );
  assert.deepEqual(inversions.tile, { dx: -120, dy: -80 });
});

test('computing inversions never touches the measurements', () => {
  const prev = { a: at(0, 0) };
  const next = { a: at(5, 5) };
  const snapshot = JSON.stringify([prev, next]);
  computeInversions(prev, next);
  assert.equal(JSON.stringify([prev, next]), snapshot);
});

test('diffKeys separates entering, leaving and staying ids', () => {
  const diff = diffKeys({ a: at(0, 0), b: at(0, 1) }, { b: at(0, 0), c: at(0, 1) });
  assert.deepEqual(diff, { entered: ['c'], exited: ['a'], stayed: ['b'] });
});
