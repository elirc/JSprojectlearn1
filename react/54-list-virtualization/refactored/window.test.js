// The windowing rules, tested in Node — no browser, no scrollbar, no
// 5,000 rows. Every edge that would take a minute of careful scrolling
// to reproduce by hand is one assertion here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWindow } from './window.js';

// The dimensions both HTML pages use, so these numbers are the real ones.
const ROW = 40;
const VIEWPORT = 400;
const TOTAL = 5000;

test('at the top: starts at row 0 and cannot go negative', () => {
  const w = computeWindow(0, ROW, VIEWPORT, TOTAL, 3);
  assert.equal(w.startIndex, 0);
  assert.equal(w.offsetY, 0);
  // 11 viewport rows + 3 overscan below, none above (clamped away).
  assert.equal(w.endIndex, 13);
  assert.equal(w.visibleCount, 14);
});

test('mid-scroll: the worked example from the guide', () => {
  // firstVisible = floor(1234 / 40)   = 30
  // visibleRows  = ceil(400 / 40) + 1 = 11
  // start        = max(0, 30 - 3)     = 27
  // end          = min(4999, 30 + 11 - 1 + 3) = 43
  const w = computeWindow(1234, ROW, VIEWPORT, TOTAL, 3);
  assert.deepEqual(w, {
    startIndex: 27,
    endIndex: 43,
    visibleCount: 17,
    offsetY: 1080,
    totalHeight: 200000,
  });
});

test('overscan is clamped at the top edge', () => {
  // firstVisible = 1, so 1 - 3 would be -2. Rows below still get theirs.
  const w = computeWindow(40, ROW, VIEWPORT, TOTAL, 3);
  assert.equal(w.startIndex, 0, 'never a negative index');
  assert.equal(w.endIndex, 14);
  assert.equal(w.offsetY, 0);
});

test('overscan is clamped at the bottom edge', () => {
  const maxScroll = TOTAL * ROW - VIEWPORT; // 199600 — scrolled all the way down
  const w = computeWindow(maxScroll, ROW, VIEWPORT, TOTAL, 3);
  assert.equal(w.endIndex, TOTAL - 1, 'ends exactly on the last row');
  assert.equal(w.startIndex, 4987);
  assert.equal(w.visibleCount, 13);
});

test('bounce scrolling (negative scrollTop) behaves like the top', () => {
  const bounced = computeWindow(-120, ROW, VIEWPORT, TOTAL, 3);
  const top = computeWindow(0, ROW, VIEWPORT, TOTAL, 3);
  assert.deepEqual(bounced, top);
});

test('an empty list produces an empty range, not a crash', () => {
  const w = computeWindow(0, ROW, VIEWPORT, 0, 3);
  assert.deepEqual(w, {
    startIndex: 0,
    endIndex: -1,
    visibleCount: 0,
    offsetY: 0,
    totalHeight: 0,
  });
  // endIndex < startIndex is the "nothing here" signal, and the slice
  // the component writes still does the right thing:
  assert.deepEqual([].slice(w.startIndex, w.endIndex + 1), []);
});

test('a list shorter than the viewport renders all of it', () => {
  const w = computeWindow(0, ROW, VIEWPORT, 4, 3);
  assert.equal(w.startIndex, 0);
  assert.equal(w.endIndex, 3);
  assert.equal(w.visibleCount, 4);
  assert.equal(w.totalHeight, 160, 'shorter than the 400px viewport: no scrollbar');
});

test('a scrollTop past the end of a shrunken list still renders real rows', () => {
  // The filter case: the user was at row 4000, then typed and the list
  // became 12 rows long. The browser has not reset scrollTop yet, so this
  // render is asked about a position that no longer exists.
  const w = computeWindow(160000, ROW, VIEWPORT, 12, 3);
  assert.equal(w.endIndex, 11, 'ends on the real last row');
  assert.equal(w.startIndex, 8);
  assert.ok(w.visibleCount > 0, 'never an inverted, empty range');
  assert.equal(w.totalHeight, 480);
});

test('a rowHeight of zero is refused instead of dividing by it', () => {
  const w = computeWindow(500, 0, VIEWPORT, TOTAL, 3);
  assert.equal(w.visibleCount, 0);
  assert.ok(Number.isFinite(w.offsetY), 'no Infinity leaking downstream');
});

test('overscan 0 renders exactly the viewport rows', () => {
  const w = computeWindow(1234, ROW, VIEWPORT, TOTAL, 0);
  assert.equal(w.startIndex, 30);
  assert.equal(w.endIndex, 40);
  assert.equal(w.visibleCount, 11, 'ceil(400/40) + 1');
});

test('offsetY and totalHeight are plain arithmetic', () => {
  const w = computeWindow(2000, ROW, VIEWPORT, TOTAL, 3);
  assert.equal(w.offsetY, w.startIndex * ROW);
  assert.equal(w.totalHeight, TOTAL * ROW);
});

test('every claimed index stays inside the array, at every scroll position', () => {
  for (let scrollTop = -200; scrollTop <= TOTAL * ROW + 200; scrollTop += 37) {
    const w = computeWindow(scrollTop, ROW, VIEWPORT, TOTAL, 3);
    assert.ok(w.startIndex >= 0, `startIndex ${w.startIndex} at ${scrollTop}`);
    assert.ok(w.endIndex <= TOTAL - 1, `endIndex ${w.endIndex} at ${scrollTop}`);
    assert.ok(w.startIndex <= w.endIndex + 1, `range inverted at ${scrollTop}`);
    assert.equal(w.visibleCount, w.endIndex - w.startIndex + 1);
    assert.equal(w.offsetY, w.startIndex * ROW);
  }
});

test('the window always covers the viewport it is scrolled to', () => {
  // The real guarantee: no matter where you stop, the rows under the
  // viewport are inside [startIndex, endIndex] — that's what "no blank
  // gaps" means, expressed as arithmetic.
  for (let scrollTop = 0; scrollTop <= TOTAL * ROW - VIEWPORT; scrollTop += 613) {
    const w = computeWindow(scrollTop, ROW, VIEWPORT, TOTAL, 3);
    const firstOnScreen = Math.floor(scrollTop / ROW);
    const lastOnScreen = Math.floor((scrollTop + VIEWPORT - 1) / ROW);
    assert.ok(w.startIndex <= firstOnScreen, `gap at the top, scrollTop ${scrollTop}`);
    assert.ok(w.endIndex >= lastOnScreen, `gap at the bottom, scrollTop ${scrollTop}`);
  }
});
