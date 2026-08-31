import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, computeTicks, niceStep } from './chart.js';

// Not a single canvas in this file. The layout is arithmetic, and
// arithmetic can be checked in milliseconds without a browser.

const MONTHS = [
  { label: 'Jan', value: 1200 },
  { label: 'Feb', value: 940 },
  { label: 'Mar', value: 1450 },
  { label: 'Apr', value: 780 },
  { label: 'May', value: 1120 },
  { label: 'Jun', value: 1010 },
];

const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

/** Every bar must live inside the plot box — the original's headline bug. */
function assertInsidePlot(layout) {
  const { plot } = layout;
  for (const bar of layout.bars) {
    assert.ok(bar.x >= plot.x - 1e-9, `${bar.label} starts left of the plot`);
    assert.ok(
      bar.x + bar.width <= plot.x + plot.width + 1e-9,
      `${bar.label} runs off the right edge`,
    );
    assert.ok(bar.y >= plot.y - 1e-9, `${bar.label} runs off the top`);
    assert.ok(
      bar.y + bar.height <= plot.y + plot.height + 1e-9,
      `${bar.label} runs off the bottom`,
    );
    assert.ok(bar.height >= 0, `${bar.label} has a negative height`);
  }
}

test('bar heights are proportional to the values', () => {
  const layout = computeLayout(MONTHS);
  const tallest = layout.bars[2]; // Mar, the max
  assert.ok(close(tallest.height, layout.plot.height), 'the max fills the plot');
  for (const bar of layout.bars) {
    assert.ok(
      close(bar.height / tallest.height, bar.value / 1450),
      `${bar.label}: height ratio ${bar.height / tallest.height} != value ratio`,
    );
  }
  assertInsidePlot(layout);
});

test('the y axis always includes zero, so bars measure real size', () => {
  // 940 vs 1010 is a 7% difference. An axis starting at 940 would draw
  // it as 100% — the classic lying chart.
  const layout = computeLayout([
    { label: 'a', value: 940 },
    { label: 'b', value: 1010 },
  ]);
  assert.equal(layout.min, 0);
  assert.ok(close(layout.bars[0].height / layout.bars[1].height, 940 / 1010));
});

test('THE original failure: a big value rescales instead of overflowing', () => {
  const spiky = MONTHS.map((m) => (m.label === 'Mar' ? { ...m, value: 4200 } : m));
  const layout = computeLayout(spiky);
  assert.ok(close(layout.max, 4200));
  assert.ok(close(layout.bars[2].height, layout.plot.height));
  assertInsidePlot(layout); // in the original, Mar was 525px on a 280px canvas
});

test('THE other original failure: more months just get narrower', () => {
  const thirteen = Array.from({ length: 13 }, (_, i) => ({
    label: `m${i}`,
    value: 100 + i * 10,
  }));
  const layout = computeLayout(thirteen);
  assert.equal(layout.bars.length, 13);
  assertInsidePlot(layout);
  const slot = layout.plot.width / 13;
  assert.ok(close(layout.bars[0].width, slot * 0.68));
});

test('scaling every value by 10 produces the identical picture', () => {
  const small = computeLayout([{ label: 'a', value: 1 }, { label: 'b', value: 3 }]);
  const big = computeLayout([{ label: 'a', value: 10 }, { label: 'b', value: 30 }]);
  assert.deepEqual(
    small.bars.map((b) => [b.x, b.y, b.width, b.height]),
    big.bars.map((b) => [b.x, b.y, b.width, b.height]),
  );
});

test('zero values give zero-height bars sitting on the baseline — not NaN', () => {
  const layout = computeLayout([
    { label: 'a', value: 0 },
    { label: 'b', value: 0 },
  ]);
  for (const bar of layout.bars) {
    assert.equal(bar.height, 0);
    assert.ok(Number.isFinite(bar.y));
    assert.ok(close(bar.y, layout.baselineY));
  }
  assert.ok(close(layout.baselineY, layout.plot.y + layout.plot.height));
});

test('a zero among real values is still a zero-height bar', () => {
  const layout = computeLayout([
    { label: 'a', value: 0 },
    { label: 'b', value: 50 },
  ]);
  assert.equal(layout.bars[0].height, 0);
  assert.ok(close(layout.bars[1].height, layout.plot.height));
});

test('negative values hang below the baseline, with positive heights', () => {
  const layout = computeLayout([
    { label: 'refund', value: -10 },
    { label: 'spend', value: 20 },
  ]);
  const [refund, spend] = layout.bars;
  assert.equal(refund.negative, true);
  assert.equal(spend.negative, false);
  assert.ok(close(refund.y, layout.baselineY), 'a negative bar starts AT the baseline');
  assert.ok(close(refund.height, spend.height / 2), '-10 is half as tall as 20');
  assert.ok(close(spend.y + spend.height, layout.baselineY));
  assertInsidePlot(layout);
});

test('empty data is a legal chart, not a crash', () => {
  const layout = computeLayout([]);
  assert.deepEqual(layout.bars, []);
  assert.equal(layout.min, 0);
  assert.equal(layout.max, 0);
  assert.ok(Number.isFinite(layout.baselineY));
  for (const tick of layout.ticks) assert.ok(Number.isFinite(tick.y));
});

test('resizing moves everything, and only the layout knows the numbers', () => {
  const small = computeLayout(MONTHS, { width: 480, height: 280 });
  const large = computeLayout(MONTHS, { width: 960, height: 560 });
  assert.ok(large.plot.width > small.plot.width * 2 - 1);
  assert.ok(large.bars[0].width > small.bars[0].width);
  assert.ok(large.bars[2].height > small.bars[2].height);
  assertInsidePlot(large);
});

test('padding can be one number for all four sides', () => {
  const layout = computeLayout(MONTHS, { padding: 10 });
  assert.deepEqual(layout.plot, { x: 10, y: 10, width: 460, height: 260 });
});

test('ticks are round numbers, include zero, and stay in range', () => {
  const layout = computeLayout(MONTHS);
  const values = layout.ticks.map((t) => t.value);
  assert.deepEqual(values, [0, 500, 1000]);
  for (const tick of layout.ticks) {
    assert.ok(tick.y >= layout.plot.y - 1e-9 && tick.y <= layout.baselineY + 1e-9);
    assert.equal(tick.label, String(tick.value));
  }
});

test('ticks span negatives too, and 0 is always one of them', () => {
  assert.deepEqual(computeTicks(-10, 20, 4), [-10, 0, 10, 20]);
  assert.deepEqual(computeTicks(0, 1000, 4), [0, 500, 1000]);
  assert.deepEqual(computeTicks(0, 0, 4), [0]); // flat data: one line
});

test('niceStep rounds up to 1, 2 or 5 times a power of ten', () => {
  assert.equal(niceStep(362.5), 500);
  assert.equal(niceStep(1), 1);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(0.0362), 0.05);
  assert.equal(niceStep(0), 1); // degenerate input, still a usable step
});

test('formatValue customises tick labels without touching geometry', () => {
  const layout = computeLayout(MONTHS, { formatValue: (v) => `$${v}` });
  assert.deepEqual(layout.ticks.map((t) => t.label), ['$0', '$500', '$1000']);
});

test('garbage in, loud error out', () => {
  assert.throws(() => computeLayout('nope'), TypeError);
  assert.throws(() => computeLayout([{ label: 'a', value: 'twelve' }]), TypeError);
  assert.throws(() => computeLayout([{ label: 'a', value: NaN }]), /data\[0\]\.value/);
  assert.throws(() => computeLayout(MONTHS, { width: 0 }), RangeError);
  assert.throws(() => computeLayout(MONTHS, { height: -5 }), RangeError);
  assert.throws(() => computeLayout(MONTHS, { barRatio: 0 }), RangeError);
});
