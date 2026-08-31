# 🏋️ Practice: Canvas Bar Chart

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Every exercise here is checkable in node, without a browser — that is the whole point of the refactor. Work in `refactored/chart.js`, add your checks to `refactored/chart.test.js`, and run `node --test 82-canvas-bar-chart/refactored/chart.test.js`.

## Exercises

### ⭐ 1. Money labels on the axis (warm-up)

Write a pure `formatMoney(value)` that returns `'$1,450'`, `'$0'`, and `'-$300'` (note: the minus goes *outside* the dollar sign), then pass it as the `formatValue` option so the gridlines read in dollars. Then use it in `draw` to print each bar's value just above the bar.

What it practices: `formatValue` is a **seam** — a place where behaviour is injected instead of hard-coded. Changing how numbers *read* must not touch how they're *placed*.

Hint: `Math.abs(value).toLocaleString('en-US')` inserts the thousands separator for you. For the bar label, `bar.centerX` and `bar.y` are already computed — `bar.y - 8` sits just above the bar.

Check (in node): `formatMoney(-300)` → `'-$300'`; with `{ formatValue: formatMoney }` the tick labels are `['$0', '$500', '$1,000']`.

### ⭐⭐ 2. hitTest — which bar is under the mouse? (core)

Write `hitTest(layout, x, y)` returning the bar whose rectangle contains the point, or `null`. Wire it to `canvas.onmousemove` in `refactored/index.html` so hovering shows `Mar: $1450` in the readout. Then notice the flaw: a bar for value `0` has zero height and can never be hit. Write a second version, `hitColumn`, that finds the bar by *slot* instead, so the whole column is hoverable.

What it practices: the layout is queryable **data**, so "what did the user click?" is arithmetic — no invisible overlay `<div>`s, no re-deriving positions a second time (which is how tooltips drift away from their bars).

Hint: `layout.bars.find(...) ?? null`. For the column version, the slot width is `plot.width / bars.length`, so the index is `Math.floor((x - plot.x) / slot)`.

Check (in node): with the six months, `hitTest(layout, mar.centerX, mar.y + 1).label === 'Mar'`, and 5px above the bar's top gives `null`. With a dataset containing a `0`, `hitTest` misses that bar and `hitColumn` finds it.

### ⭐⭐ 3. An average line (core)

Add an `average` field to the layout: `null` for empty data, otherwise `{ value, label, y }` where `y` is the mean's pixel position. Draw it as a dashed line across the plot (`ctx.setLineDash([4, 4])`, and set it back to `ctx.setLineDash([])` afterwards).

What it practices: adding a *new* thing to the picture without inventing a new scale for it. The mean is just another value, so it goes through the same `yOf` as everything else — one scale, no drift.

Hint: compute the mean with `reduce`, then reuse `yOf(mean)` and `formatValue`. `yOf` is defined inside `computeLayout`, so the average must be computed there too — which is exactly where it belongs.

Check (in node): for the six months the average is 6500/6 ≈ 1083.33, its distance above the baseline is `1083.33 / 1450` of the tallest bar's height, and `computeLayout([]).average` is `null`.

### ⭐⭐ 4. Test `draw()` with a fake canvas (core)

`draw` is I/O, so we said it can't be tested. That's a half-truth: it can't be tested *against real pixels*, but you can hand it a **fake context** that records every call. Write `createFakeContext()` returning an object with `clearRect`, `fillRect`, `fillText`, `beginPath`, `moveTo`, `lineTo`, `stroke` methods that push their arguments into a `calls` array (plus writable `fillStyle` / `strokeStyle` / `font` / `textAlign` / `textBaseline` properties). Then assert that `draw` issues exactly the rectangles the layout describes — and nothing else.

What it practices: faking the boundary, the same trick project 61 plays with its fake DOM. It also *proves* the design claim: if `draw` ever computed anything itself, this test would catch it.

Hint: a tiny factory — `const record = (name) => (...args) => calls.push([name, ...args]);` — builds all seven methods.

Check (in node): with two bars, there are `1 + bars.length` `fillRect` calls (the first is the background), the rest deep-equal the bars' `x, y, width, height`, the `fillText` strings are the tick labels followed by the bar labels, and there is one `stroke` per tick.

### ⭐⭐⭐ 5. Horizontal bars (challenge)

Add an `orientation: 'vertical' | 'horizontal'` option. Horizontal bars grow *rightward* from a baseline at `baselineX`, categories run down the y axis, and ticks carry an `x` instead of a `y`. Every existing test must still pass untouched, and an unknown orientation must throw a `RangeError`.

What it practices: generalising a scale. The value axis and the category axis are two different jobs that happened to be x and y; naming them apart is what makes the swap a small change instead of a rewrite.

Hint: write one `posOf(value)` that returns a y when vertical and an x when horizontal (note the direction flips: y grows *down* away from the max, x grows *right* toward it). Then build the bar rect with a ternary and derive `centerX` / `centerY` from the finished rect so both orientations get both.

Check (in node): with `[10, 20, -5]` horizontal, the 20-bar is `plot.width * 20/25` wide, the 10-bar is half of it, the −5 bar *ends* at `baselineX` while positives *start* there, every bar is inside the plot box, bar thickness is `(plot.height / 3) * 0.68`, and `{ orientation: 'sideways' }` throws.

### ⭐⭐⭐ 6. Fuzz the invariants (challenge)

Instead of guessing which dataset breaks the layout, state what must *always* be true and let the machine hunt: 500 trials, each with 0–12 bars of random values (including zeros and negatives) and a random canvas size, padding and `barRatio`. After each `computeLayout`, assert that every number is finite, no size is negative, every bar lies inside the plot box, every bar's height is `plot.height * |value| / span`, zero is always in range, and every tick's value and pixel are in range.

What it practices: property-based testing — the technique that finds the case you'd never think to write down. These six properties are exactly the promises the original broke.

Hint: guard the proportionality assertion for the all-zeros case (`span === 0` means every height is 0), and compare floats with a tolerance, never `===`.

Check (in node): 500 trials pass. Then sabotage `computeLayout` — replace `Math.abs(valueY - baselineY)` with `baselineY - valueY` — and the fuzz test must fail on the first dataset containing a negative value.

## Solutions

### 1. Money labels on the axis

```js
function formatMoney(value) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US')}`;
}

// computeLayout(data, { formatValue: formatMoney })
// and in draw(), after the fillRect:
ctx.fillText(formatMoney(bar.value), bar.centerX, bar.y - 8);
```

WHY: `formatValue` defaults to `String`, so the layout never had an opinion about currency — it just calls whatever you gave it. That's a seam: the tick's `value` (a number, for maths) and its `label` (a string, for humans) are computed once, side by side, and can never disagree. Putting the sign outside the `$` is the small correctness detail that separates a chart people trust from one they squint at. Verified by running: labels come out `['$0', '$500', '$1,000']`.

### 2. hitTest

```js
export function hitTest(layout, x, y) {
  return layout.bars.find((bar) =>
    x >= bar.x && x <= bar.x + bar.width &&
    y >= bar.y && y <= bar.y + bar.height) ?? null;
}

export function hitColumn(layout, x, y) {
  const { plot } = layout;
  if (y < plot.y || y > plot.y + plot.height) return null;
  const slot = layout.bars.length === 0 ? 0 : plot.width / layout.bars.length;
  return layout.bars[Math.floor((x - plot.x) / slot)] ?? null;
}
```

WHY: hover behaviour usually gets built by re-deriving positions in the event handler, and the second copy of the maths slowly drifts from the first — tooltips that point at the wrong bar are a genuinely common bug. Here there is only one copy: the layout. The zero-height discovery is the real lesson, though. `hitTest` is *geometrically* correct and *usefully* wrong: a month where you spent nothing is still a month the user wants to hover. Choosing the column version is a product decision that the pure function makes easy to see, test, and change. Verified by running: `Mar` on its bar, `null` 5px above it, and only `hitColumn` finds the zero bar.

### 3. An average line

```js
// inside computeLayout, just before the return:
const average = data.length === 0 ? null : (() => {
  const mean = data.reduce((sum, p) => sum + p.value, 0) / data.length;
  return { value: mean, label: formatValue(Math.round(mean)), y: yOf(mean) };
})();

// in draw(), after the ticks:
if (layout.average) {
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#c33';
  ctx.beginPath();
  ctx.moveTo(layout.plot.x, layout.average.y);
  ctx.lineTo(layout.plot.x + layout.plot.width, layout.average.y);
  ctx.stroke();
  ctx.setLineDash([]); // canvas state is GLOBAL — always put it back
}
```

WHY: the average is drawn with the same `yOf` as the bars, so it can never sit at the wrong height — the failure mode you get the moment a second scale appears in a chart. `null` for empty data is deliberate: "there is no average of nothing" is a fact the type should state, rather than `NaN` quietly drawing a line at the top of the canvas. And `setLineDash([])` at the end is the canvas-specific gotcha: the context is one big mutable settings object, so anything you turn on stays on for whatever draws next. Verified by running: mean 1083.33, its height above the baseline is `1083.33/1450` of the tallest bar, and `null` for `[]`.

### 4. Test `draw()` with a fake canvas

```js
function createFakeContext() {
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    fillStyle: '', strokeStyle: '', font: '', textAlign: '', textBaseline: '',
    clearRect: record('clearRect'), fillRect: record('fillRect'),
    fillText: record('fillText'), beginPath: record('beginPath'),
    moveTo: record('moveTo'), lineTo: record('lineTo'), stroke: record('stroke'),
  };
}

test('draw makes no decisions', () => {
  const layout = computeLayout([{ label: 'a', value: 10 }, { label: 'b', value: 20 }]);
  const ctx = createFakeContext();
  draw(ctx, layout);

  const rects = ctx.calls.filter((c) => c[0] === 'fillRect');
  assert.equal(rects.length, 1 + layout.bars.length); // background + bars
  assert.deepEqual(
    rects.slice(1),
    layout.bars.map((b) => ['fillRect', b.x, b.y, b.width, b.height]),
  );
  const texts = ctx.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.deepEqual(texts, [...layout.ticks.map((t) => t.label), 'a', 'b']);
});
```

WHY: `deepEqual` against `layout.bars` is the assertion that matters — it says *`draw` copied the numbers, it did not invent any*. If someone "helpfully" adds `Math.round(bar.x)` or a 2px inset inside `draw`, this test goes red and the design conversation happens before the drift does. A fake object like this is called a **spy**, and it works because JavaScript doesn't care what type `ctx` is, only which methods you call — the same duck-typing that lets project 61 test a virtual DOM without a browser. Verified by running: 3 `fillRect`s for 2 bars, texts `['0','5','10','15','20','a','b']`, one `stroke` per tick.

### 5. Horizontal bars

```js
const { orientation = 'vertical' } = options;
if (orientation !== 'vertical' && orientation !== 'horizontal') {
  throw new RangeError(`orientation must be 'vertical' or 'horizontal', got ${orientation}`);
}
const vertical = orientation === 'vertical';
// value -> pixel ALONG THE VALUE AXIS (y downward, or x rightward)
const posOf = (value) => {
  if (span === 0) return vertical ? plot.y + plot.height : plot.x;
  return vertical
    ? plot.y + plot.height * ((max - value) / span)
    : plot.x + plot.width  * ((value - min) / span);
};
const baseline = posOf(0);

const categoryLength = vertical ? plot.width : plot.height;
const slot = data.length === 0 ? 0 : categoryLength / data.length;
const thickness = slot * barRatio;
const bars = data.map((point, index) => {
  const valuePos = posOf(point.value);
  const along = (vertical ? plot.x : plot.y) + index * slot + (slot - thickness) / 2;
  const rect = vertical
    ? { x: along, width: thickness,
        y: Math.min(valuePos, baseline), height: Math.abs(valuePos - baseline) }
    : { y: along, height: thickness,
        x: Math.min(valuePos, baseline), width: Math.abs(valuePos - baseline) };
  return {
    label: String(point.label ?? ''), value: point.value, ...rect,
    centerX: rect.x + rect.width / 2,
    centerY: rect.y + rect.height / 2,
    negative: point.value < 0,
  };
});

const axisKey = vertical ? 'y' : 'x';
const ticks = computeTicks(min, max, tickCount)
  .map((value) => ({ value, label: formatValue(value), [axisKey]: posOf(value) }));

return { width, height, orientation, padding: pad, plot, min, max, bars, ticks,
  ...(vertical ? { baselineY: baseline } : { baselineX: baseline }) };
```

WHY: the whole exercise is a renaming exercise. Once you stop thinking "x and y" and start thinking "**value axis** and **category axis**", horizontal is the same arithmetic with the two axes swapped and one sign flipped — because y counts downward from the max while x counts rightward from the min. Deriving `centerX` and `centerY` from the finished rect (rather than writing them twice) means the label positions come out right in both modes for free. This is the payoff of the pure-layout design: a change this structural touches zero lines of drawing code and breaks zero existing tests. Verified by running: all 16 original tests still pass, plus the horizontal assertions above.

### 6. Fuzz the invariants

```js
test('FUZZ: the layout invariants hold for any data and any size', () => {
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const close = (a, b, t = 1e-6) => Math.abs(a - b) <= t;

  for (let trial = 0; trial < 500; trial++) {
    const data = Array.from({ length: Math.floor(rand(0, 13)) }, (_, i) => ({
      label: `m${i}`,
      value: Math.random() < 0.2 ? 0 : Math.round(rand(-1000, 2000)),
    }));
    const layout = computeLayout(data, {
      width: Math.round(rand(120, 1200)),
      height: Math.round(rand(120, 800)),
      padding: Math.random() < 0.5 ? undefined : Math.round(rand(0, 30)),
      barRatio: rand(0.1, 1),
    });
    const { plot } = layout;
    const span = layout.max - layout.min;

    assert.equal(layout.bars.length, data.length);
    assert.ok(layout.min <= 0 && layout.max >= 0, 'zero is always in range');

    for (const bar of layout.bars) {
      for (const n of [bar.x, bar.y, bar.width, bar.height, bar.centerX]) {
        assert.ok(Number.isFinite(n), `non-finite ${n} in trial ${trial}`);
      }
      assert.ok(bar.height >= 0 && bar.width >= 0, 'no negative sizes');
      assert.ok(bar.x >= plot.x - 1e-6 && bar.x + bar.width <= plot.x + plot.width + 1e-6);
      assert.ok(bar.y >= plot.y - 1e-6 && bar.y + bar.height <= plot.y + plot.height + 1e-6);
      const expected = span === 0 ? 0 : plot.height * (Math.abs(bar.value) / span);
      assert.ok(close(bar.height, expected), 'height is proportional to |value|');
    }
    for (const tick of layout.ticks) {
      assert.ok(Number.isFinite(tick.y));
      assert.ok(tick.value >= layout.min - 1e-9 && tick.value <= layout.max + 1e-9);
      assert.ok(tick.y >= plot.y - 1e-6 && tick.y <= plot.y + plot.height + 1e-6);
    }
  }
});
```

WHY: read the five properties out loud and you have read the README's list of the original's bugs, turned into machine-checkable promises — "stays inside the box" was flaw 2, "no negative sizes" was flaw 4, "proportional to |value|" was flaw 1, "finite numbers" was the all-zeros division by zero. Example tests check the cases you thought of; a fuzz test checks the cases you didn't, and the reason it's *possible at all* is that the layout is pure data. You could never fuzz a canvas. Note the two details that make it honest: floats are compared with a tolerance (`0.1 + 0.2 !== 0.3`), and the proportionality property is guarded for `span === 0`, because a flat chart has no scale to be proportional to. Verified by running: 500 trials pass; flipping `Math.abs(valueY - baselineY)` to `baselineY - valueY` makes it fail on the first negative value.
