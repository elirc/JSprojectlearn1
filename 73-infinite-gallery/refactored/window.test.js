import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleRange } from './window.js';

const base = { viewportHeight: 600, itemHeight: 100, totalItems: 1000, overscan: 3 };

test('at the top: renders the first screenful plus trailing overscan', () => {
  const r = visibleRange({ ...base, scrollTop: 0 });
  assert.equal(r.start, 0); // no overscan above row 0 (clamped)
  assert.equal(r.end, 10);  // 7 visible (+1 partial) + 3 overscan
  assert.equal(r.topPadding, 0);
  assert.equal(r.bottomPadding, (1000 - 10) * 100);
});

test('mid-list: window slides, paddings preserve total scroll height', () => {
  const r = visibleRange({ ...base, scrollTop: 50_000 }); // at item 500
  assert.equal(r.start, 497); // 500 - overscan
  assert.equal(r.end, 510);   // 500 + 7 + 3
  // The invariant that keeps the scrollbar honest:
  const contentHeight = (r.end - r.start) * 100;
  assert.equal(r.topPadding + contentHeight + r.bottomPadding, 1000 * 100);
});

test('partial scroll positions still cover the viewport', () => {
  const r = visibleRange({ ...base, scrollTop: 12_345 }); // mid-item
  assert.ok(r.start <= Math.floor(12_345 / 100));
  assert.ok(r.end >= Math.ceil((12_345 + 600) / 100)); // bottom edge covered
});

test('at the bottom: end clamps to totalItems', () => {
  const r = visibleRange({ ...base, scrollTop: 1000 * 100 - 600 });
  assert.equal(r.end, 1000);
  assert.equal(r.bottomPadding, 0);
});

test('a list shorter than the viewport renders everything, no padding', () => {
  const r = visibleRange({ ...base, totalItems: 4, scrollTop: 0 });
  assert.deepEqual(r, { start: 0, end: 4, topPadding: 0, bottomPadding: 0 });
});

test('the DOM stays ~constant no matter how many items exist', () => {
  for (const totalItems of [100, 10_000, 1_000_000]) {
    const r = visibleRange({ ...base, totalItems, scrollTop: 5_000 });
    assert.ok(r.end - r.start <= 14, `rendered ${r.end - r.start} of ${totalItems}`);
  }
});
