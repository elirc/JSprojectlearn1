import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWindow } from './window.js';

// A 10,000-row list of 32px rows in a 400px viewport: the original page's shape.
const ROW = 32;
const VIEW = 400;
const TOTAL = 10_000;

test('at the top: the first screenful plus overscan below', () => {
  const w = computeWindow(0, ROW, VIEW, TOTAL);
  assert.equal(w.start, 0);           // nothing above row 0 to overscan into
  assert.equal(w.end, 16);            // ceil(400/32)+1 = 14 visible, +2 overscan
  assert.equal(w.topSpacer, 0);
  assert.equal(w.bottomSpacer, (TOTAL - 16) * ROW);
});

test('the DOM budget: ~16 rows exist instead of 10,000', () => {
  const w = computeWindow(0, ROW, VIEW, TOTAL);
  assert.ok(w.end - w.start <= 20, `rendered ${w.end - w.start} rows`);
});

test('mid-list: the window slides with the scroll', () => {
  const w = computeWindow(3200, ROW, VIEW, TOTAL); // exactly at row 100
  assert.equal(w.start, 98);   // 100 - overscan
  assert.equal(w.end, 116);    // 100 + 14 + 2
  assert.equal(w.topSpacer, 98 * ROW);
});

test('THE invariant: spacers + rendered rows are exactly the full height', () => {
  for (const scrollTop of [0, 1, 999, 3200, 51_237, 319_600]) {
    const w = computeWindow(scrollTop, ROW, VIEW, TOTAL);
    const rendered = (w.end - w.start) * ROW;
    assert.equal(w.topSpacer + rendered + w.bottomSpacer, TOTAL * ROW,
      `broken at scrollTop ${scrollTop}`);
  }
});

test('the window always covers what the eye can see', () => {
  for (const scrollTop of [0, 17, 1234, 55_555, 200_000]) {
    const w = computeWindow(scrollTop, ROW, VIEW, TOTAL);
    const firstNeeded = Math.floor(scrollTop / ROW);
    const lastNeeded = Math.ceil((scrollTop + VIEW) / ROW) - 1;
    assert.ok(w.start <= firstNeeded, `top gap at ${scrollTop}`);
    assert.ok(w.end - 1 >= lastNeeded, `bottom gap at ${scrollTop}`);
  }
});

test('at the bottom: end clamps to the last row and bottomSpacer is 0', () => {
  const w = computeWindow(TOTAL * ROW - VIEW, ROW, VIEW, TOTAL);
  assert.equal(w.end, TOTAL);
  assert.equal(w.bottomSpacer, 0);
});

test('over-scrolling past the end cannot push the window off the list', () => {
  const w = computeWindow(999_999, ROW, VIEW, TOTAL);
  assert.equal(w.end, TOTAL);
  assert.ok(w.start < w.end, 'start must never pass end');
  assert.equal(w.bottomSpacer, 0);
  assert.deepEqual(w, computeWindow(TOTAL * ROW - VIEW, ROW, VIEW, TOTAL));
});

test('a negative scrollTop (trackpad rubber-band) behaves like the top', () => {
  assert.deepEqual(computeWindow(-250, ROW, VIEW, TOTAL), computeWindow(0, ROW, VIEW, TOTAL));
});

test('an empty list is all zeroes, not a crash or a negative spacer', () => {
  assert.deepEqual(computeWindow(0, ROW, VIEW, 0), { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 });
  assert.deepEqual(computeWindow(5000, ROW, VIEW, 0), { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 });
});

test('a list shorter than the viewport renders everything, no spacers', () => {
  const w = computeWindow(0, ROW, VIEW, 5);
  assert.equal(w.start, 0);
  assert.equal(w.end, 5);
  assert.equal(w.topSpacer, 0);
  assert.equal(w.bottomSpacer, 0);
});

test('overscan 0 renders only what is visible', () => {
  const w = computeWindow(3200, ROW, VIEW, TOTAL, 0);
  assert.equal(w.start, 100);
  assert.equal(w.end, 114); // 13 full rows + 1 partial, nothing spare
});

test('bigger overscan means more rows, same invariant', () => {
  const small = computeWindow(3200, ROW, VIEW, TOTAL, 2);
  const big = computeWindow(3200, ROW, VIEW, TOTAL, 10);
  assert.ok(big.end - big.start > small.end - small.start);
  assert.equal(big.topSpacer + (big.end - big.start) * ROW + big.bottomSpacer, TOTAL * ROW);
});

test('the DOM cost does not grow with the list — 100 rows or a million', () => {
  for (const total of [100, 10_000, 1_000_000]) {
    const w = computeWindow(1600, ROW, VIEW, total, 3);
    assert.ok(w.end - w.start <= 21, `rendered ${w.end - w.start} of ${total}`);
  }
});
