# 📘 Learning Guide: Canvas Bar Chart

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A bar chart of six months of spending, drawn by hand on an HTML `<canvas>` — no chart library, no internet.

```
$1450 |           ███
      |  ███      ███       ███  ███
 $500 |  ███ ███  ███  ███  ███  ███
   $0 +--------------------------------
        Jan  Feb  Mar  Apr  May  Jun
```

Both versions produce that picture. The original produces it the way a *painter* would: by placing every rectangle where it looked right. The refactor produces it the way a *program* should: by computing where each rectangle belongs from the data, then painting.

The refactored page has buttons — "a 4200 spike", "13 months", "with refunds", "no data", "toggle size" — and the chart survives every one of them. Click the same buttons in your head while reading `original.html` and you'll see it can't survive any of them.

## 2. Concepts you need first

### The `<canvas>` element and its context

`<canvas>` is a rectangle of pixels you paint on with JavaScript. It has no memory of *what* you drew — only the resulting colours, like a real canvas.

```js
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d'); // the "brush"
ctx.fillStyle = '#4e79a7';           // pick a colour
ctx.fillRect(60, 90, 40, 150);       // x, y, width, height — a filled rectangle
ctx.fillText('Jan', 66, 258);        // text at a position
```

Three more brush commands appear in this project: `ctx.clearRect(...)` wipes an area, `ctx.beginPath() / moveTo(x, y) / lineTo(x, y) / stroke()` draws a line, and `ctx.font`, `ctx.textAlign`, `ctx.textBaseline` control text.

### Canvas coordinates: y grows DOWNWARD

This trips up everyone. `(0, 0)` is the **top-left** corner. Larger y means *further down*. So a bar that is 150 tall and sits on a baseline at y = 240 must be drawn starting at `240 - 150 = 90`:

```js
ctx.fillRect(60, 240 - 150, 40, 150); // that "240 - height" is why
```

Every `240 - something` in the original comes from this one fact. And a *negative* height (`fillRect(x, y, w, -30)`) doesn't error — canvas draws it upward from y, which is almost never what you meant.

### Scale: turning a value into a pixel

A chart's real job is one function: **value → pixel**. If the biggest value is 1450 and the tallest bar may be 222 pixels, then

```js
pixels = 222 * (value / 1450);
```

The original hard-codes this as "divide by 8" — which is only correct while the biggest number stays near 1450. Deriving the scale *from the data* is the whole fix.

### Pure functions vs I/O

A **pure function** takes values and returns values: same input, same output, no side effects, no talking to the outside world. `computeLayout` is pure. **I/O** ("input/output") is code that touches the world — the screen, files, the network. `draw` is I/O.

Pure code is easy to test (call it, compare the answer). I/O code is hard to test (you'd need a browser and a way to look at pixels). So the design rule: **put all the thinking in pure functions and keep the I/O layer thin and stupid.** You've met this split before — project 16's `game.js`, project 63's `derive.js`.

### Magic numbers

A **magic number** is a literal in the code whose meaning lives only in the author's head: `8`, `240`, `68`, `52.5`. They're not wrong, they're *unexplained* — and unexplained numbers can't be updated safely, because you don't know which other numbers depend on them.

### A layout object

Instead of drawing directly, we return a description of the picture:

```js
{ plot: { x: 52, y: 24, width: 412, height: 222 },
  baselineY: 246,
  bars:  [{ label: 'Jan', value: 1200, x: 58, y: 62.3, width: 46.7, height: 183.7 }, ...],
  ticks: [{ value: 0, label: '$0', y: 246 }, ...] }
```

This is *data*. You can print it, compare it, assert on it. Pixels can do none of that.

### Small syntax pieces used here

- Destructuring with defaults: `const { width = 480 } = options;` — "take `width` out of `options`, or use 480."
- Spread into a copy: `{ ...DEFAULT_PADDING, ...padding }` — later keys win, so partial overrides work.
- Optional chaining: `point?.value` is `undefined` instead of a crash when `point` is null.
- `Number.isFinite(x)` — true for real numbers, false for `NaN`, `Infinity`, and strings.
- `10 ** n` is "10 to the power n"; `Math.log10(x)` is its inverse.

## 3. Walking through the original code

It opens honestly:

```js
const ctx = document.getElementById("chart").getContext("2d");
```

Then draws four gridlines at hand-computed heights:

```js
ctx.beginPath(); ctx.moveTo(50, 177.5); ctx.lineTo(460, 177.5); ctx.stroke();
ctx.fillText("500", 18, 181);
```

Where does 177.5 come from? `240 - 500/8`. The author did that arithmetic once, in their head, and the result is now frozen in the file with no trace of how it was derived.

Then six near-identical blocks, one per month:

```js
ctx.fillStyle = "#4e79a7";
ctx.fillRect(60, 240 - 150, 40, 150);      // Jan: 1200 / 8 = 150
ctx.fillStyle = "#333";
ctx.fillText("Jan", 66, 258);
```

Read one and you've read all six. The month name appears twice (in a comment and in a string), the amount appears only in a comment, and the *actual* data — `1200` — has been erased, surviving only as the pixel height `150`.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the data doesn't exist any more.** Ask the program "what did we spend in March?" and there's no one to ask. The number was converted to pixels by a human and thrown away. Every question — the total, the average, a tooltip, a CSV export — is now unanswerable without re-typing the data somewhere else, where it will immediately drift out of sync with the picture.

**Flaw 2: the scale is a guess that expires.** `/ 8` works for numbers around 1450. Your first big month — a 4200 tax bill — produces a 525px bar on a 280px canvas. It doesn't crash. It doesn't warn. It draws off the top of the canvas, while the gridline still says 1500, and the chart is now *confidently wrong*. Charts that lie are worse than charts that break, because nobody goes looking.

**Flaw 3: every number depends on every other number.** The 68-pixel gap between bars, the 40-pixel bar width, the 460-pixel gridline end, the 258 label baseline — change the canvas size and all thirty are wrong at once. There is no single place to make the change, so "make the chart bigger" is a thirty-edit job with no way to check you got them all.

**Flaw 4: negative values draw in the wrong place.** `fillRect(x, 277.5, 40, -37.5)` paints *upward* from 277.5 rather than downward. Canvas has no opinion about your intent.

**Flaw 5: it can't be tested.** You cannot write `assert.equal(marchBarHeight, 222)` because there is no `marchBarHeight` — only paint. The only test is a human looking at the screen, which is exactly the test that stops happening when you're tired.

## 5. Try it yourself first!

1. **Vague hint:** the drawing code should not contain a single number you had to compute yourself. Where could those computations go instead?
2. **Warmer:** write `const data = [{ label: 'Jan', value: 1200 }, ...]` first. Now the amounts exist as numbers again. What does the drawing code need to know that it can't get from `data`?
3. **Warmer still:** it needs a **scale**. Write `const max = Math.max(...values)` and one function `yOf(value)` that returns a canvas y. Every position in the chart should come from `yOf` or from the plot box — nothing hand-computed.
4. **Almost the answer:** don't draw from that function. *Return* a list of rectangles: `{ label, value, x, y, width, height }`, plus the tick positions. Then write a separate `draw(ctx, layout)` that loops over the list and calls `fillRect` — with no arithmetic in it beyond centring a label.
5. **The test that proves it:** with your layout function in a `.js` file, `node -e` an assertion that the tallest bar's height equals the plot height, and that no bar's `y` is less than the plot's `y`. If you can write that test, you've done the refactor.
6. **Design question:** should the y axis always start at zero? Decide, write your reason in a comment, then look at what `computeLayout` does and why.

## 6. Understanding the refactored solution

**The split, in two exported functions.** `computeLayout(data, options)` is 60 lines of arithmetic that never mentions a canvas. `draw(ctx, layout, style)` is 25 lines of canvas calls that contain no arithmetic beyond `+ 16` to drop a label below the axis.

**The plot box** is computed once from the size and the padding:

```js
const plot = {
  x: pad.left, y: pad.top,
  width:  Math.max(0, width  - pad.left - pad.right),
  height: Math.max(0, height - pad.top  - pad.bottom),
};
```

The padding leaves room for tick labels on the left and month names at the bottom. `Math.max(0, ...)` means a silly-small canvas gives a zero-size plot rather than negative widths.

**The range always contains zero:**

```js
let min = 0;
let max = 0;
data.forEach((point, index) => { ... if (point.value > max) max = point.value; });
```

Starting both at 0 (instead of at the first value) is the anti-lying-chart decision: bars measure distance *from zero*, so their heights stay proportional to the values. It also means a chart of only negative numbers still shows the zero line.

**One function owns value → pixel:**

```js
const yOf = (value) =>
  span === 0 ? plot.y + plot.height : plot.y + plot.height * ((max - value) / span);
const baselineY = yOf(0);
```

Read it as: how far is this value from the top of the range, as a fraction of the whole range, times the plot height. The `span === 0` branch is the all-zeros case — dividing by zero would give `NaN`, and `NaN` pixels draw nothing at all, silently. Instead, a flat chart sits on the bottom line.

**Bars, including negative ones:**

```js
y: Math.min(valueY, baselineY),
height: Math.abs(valueY - baselineY),
```

A positive bar runs from its value down to the baseline; a negative one from the baseline down to its value. Taking the smaller y as the top and the absolute difference as the height handles both cases in two lines — and guarantees `height` is never negative, so canvas can't draw it backwards.

**Bar widths come from slots:** `slot = plot.width / data.length`, and each bar uses 68% of its slot, centred. Six months or thirteen, the bars simply get narrower; nothing can run off the edge.

**Nice ticks.** `niceStep` rounds a raw step up to 1, 2 or 5 times a power of ten, so gridlines land on 0 / 500 / 1000 rather than 0 / 362.5 / 725. Because every tick is a multiple of the step and the range always contains 0, a zero line is guaranteed.

**Validation at the boundary** (project 31): a non-array, a `NaN` value, a zero width all throw with a message naming the offender, because a chart that silently paints nothing is a bug report you'll get three months late from a user.

**The tests** read like the README's complaints, inverted: heights are proportional; a 4200 spike stays inside the plot; 13 months stay inside the plot; scaling all values by 10 produces the *identical* picture; zeros give zero-height bars instead of `NaN`; negatives hang below the baseline; empty data is a legal chart. None of them need a canvas.

## 7. Words you learned (glossary)

- **Canvas / context (`ctx`)** — a pixel rectangle you paint on / the brush object that paints.
- **`fillRect` / `fillText` / `stroke`** — draw a filled rectangle / draw text / draw the current path.
- **Canvas coordinates** — (0,0) is top-left and y grows downward.
- **Baseline** — the pixel row where value 0 lives.
- **Scale** — the rule that turns a data value into a pixel position.
- **Layout** — a data description of the picture: rectangles, ticks, positions.
- **Pure function** — same inputs, same outputs, no side effects.
- **I/O** — code that touches the outside world (screen, disk, network).
- **Magic number** — an unexplained literal whose meaning lives in the author's head.
- **Plot box** — the inner rectangle where data is drawn, inside the padding.
- **Padding** — the margin reserved for axis labels around the plot.
- **Tick** — one labelled gridline value on an axis.
- **Nice number** — a round tick step (1, 2 or 5 × a power of ten) humans read easily.
- **Range / span** — the min-to-max of the data / the distance between them.
- **Truncated axis** — an axis that doesn't start at zero, exaggerating differences.
- **Boundary validation** — checking inputs where they enter, so bad data can't spread.

## 8. Experiments to try on the plane (no internet needed)

1. **Break the original on purpose.** In `original.html`, change March's block to `ctx.fillRect(196, 240 - 525, 40, 525)` (that's 4200 / 8). Expected: a bar running off the top of the canvas with no error, while the "1500" gridline label still sits there. Then click "a 4200 spike" on the refactored page: everything rescales, and the 4200 bar fits.
2. **Print the layout instead of drawing it.** In node: `node -e "import('./82-canvas-bar-chart/refactored/chart.js').then(m => console.log(m.computeLayout([{label:'a',value:5},{label:'b',value:10}])))"`. Expected: a printed object where `b`'s height is exactly twice `a`'s. That's the whole chart, as data.
3. **Prove `draw` makes no decisions.** Write a fake context in node: an object whose `fillRect`, `fillText`, `clearRect`, `beginPath`, `moveTo`, `lineTo`, `stroke` methods just push their arguments into an array, plus writable `fillStyle` / `strokeStyle` / `font` / `textAlign` / `textBaseline` properties. Pass it to `draw`. Expected: it runs happily outside a browser and you can read back every command — this is the technique project 61 uses with its fake DOM.
4. **Delete the zero anchor.** In `chart.js`, change `let min = 0; let max = 0;` to start from `data[0].value`. Expected: with values 940 and 1010, the 940 bar collapses to nothing — a 7% difference drawn as 100%. Undo, and re-read the test named "the y axis always includes zero".
5. **Add a value label above each bar.** In `draw`, after `fillRect`, add `ctx.fillText(String(bar.value), bar.centerX, bar.y - 8)`. Expected: it works immediately for every dataset and size, because `centerX` and `y` were computed for you — no new magic numbers.
6. **Make the canvas sharp on a retina screen.** In `render()`, set `canvas.width = size.width * devicePixelRatio` and `ctx.scale(devicePixelRatio, devicePixelRatio)` before drawing, leaving the CSS size alone. Expected: crisper text, and *zero* changes to `computeLayout` — the layout is in logical units, and pixel density is the drawing layer's problem.
