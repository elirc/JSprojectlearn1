/**
 * A bar chart, split down the middle:
 *
 *   computeLayout(data, options) -> plain numbers   (pure: MATH)
 *   draw(ctx, layout, style)     -> pixels          (thin: I/O)
 *
 * Every position, size and tick in the picture is decided by
 * computeLayout, which never mentions a canvas. That is why the layout
 * can be tested in node — the hard part of a chart is arithmetic, and
 * arithmetic doesn't need a screen (projects 16 and 63, same move).
 *
 * The layout it returns:
 *
 *   {
 *     width, height, padding, plot: { x, y, width, height },
 *     min, max, baselineY,
 *     bars:  [{ label, value, x, y, width, height, centerX, negative }],
 *     ticks: [{ value, label, y }],
 *   }
 *
 * Coordinates are canvas coordinates: y grows DOWNWARD, so the top of a
 * bar has a SMALLER y than its bottom.
 */

/** Room for the tick labels (left) and the month labels (bottom). */
const DEFAULT_PADDING = { top: 24, right: 16, bottom: 34, left: 52 };

function normalizePadding(padding) {
  if (padding === undefined) return { ...DEFAULT_PADDING };
  if (typeof padding === 'number') {
    if (!Number.isFinite(padding) || padding < 0) {
      throw new RangeError(`padding must be a non-negative number, got ${padding}`);
    }
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return { ...DEFAULT_PADDING, ...padding };
}

/**
 * Round a step up to a number a human would pick: 1, 2 or 5 times a
 * power of ten. Gridlines at 0/250/500 read well; 0/237/474 do not.
 */
export function niceStep(rawStep) {
  if (!(rawStep > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude; // somewhere in [1, 10)
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Tick VALUES (not pixels) covering [min, max] on a nice step. Because
 * every tick is a multiple of the step and the range always contains 0,
 * a 0 tick is guaranteed whenever 0 is in range.
 */
export function computeTicks(min, max, count = 4) {
  if (max === min) return [min];
  const step = niceStep((max - min) / Math.max(1, count));
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let i = 0; start + i * step <= max + step * 1e-9; i++) {
    // Re-multiply instead of accumulating: 0.1+0.1+0.1 is not 0.3.
    ticks.push(Number((start + i * step).toPrecision(12)));
  }
  return ticks;
}

export function computeLayout(data, options = {}) {
  const {
    width = 480,
    height = 280,
    padding,
    barRatio = 0.68, // slice of each slot the bar itself uses
    tickCount = 4,
    formatValue = String,
  } = options;

  // Validate at the boundary (project 31): a chart that quietly draws
  // NaN pixels is worse than one that refuses to draw.
  if (!Array.isArray(data)) {
    throw new TypeError('data must be an array of { label, value }');
  }
  if (!Number.isFinite(width) || width <= 0) {
    throw new RangeError(`width must be a positive number, got ${width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new RangeError(`height must be a positive number, got ${height}`);
  }
  if (!(barRatio > 0 && barRatio <= 1)) {
    throw new RangeError(`barRatio must be in (0, 1], got ${barRatio}`);
  }

  const pad = normalizePadding(padding);
  const plot = {
    x: pad.left,
    y: pad.top,
    width: Math.max(0, width - pad.left - pad.right),
    height: Math.max(0, height - pad.top - pad.bottom),
  };

  // The range ALWAYS includes zero: bars measure distance from zero, so
  // an axis starting at 940 would make a 3% difference look like 100%.
  let min = 0;
  let max = 0;
  data.forEach((point, index) => {
    if (!Number.isFinite(point?.value)) {
      throw new TypeError(
        `data[${index}].value must be a finite number, got ${point?.value}`,
      );
    }
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  });

  const span = max - min;
  // Every "where does this number live on screen?" question, answered
  // in one place. When every value is 0 there is nothing to scale, so
  // the whole chart sits on the bottom line.
  const yOf = (value) =>
    span === 0 ? plot.y + plot.height : plot.y + plot.height * ((max - value) / span);
  const baselineY = yOf(0);

  const slot = data.length === 0 ? 0 : plot.width / data.length;
  const barWidth = slot * barRatio;

  const bars = data.map((point, index) => {
    const valueY = yOf(point.value);
    const x = plot.x + index * slot + (slot - barWidth) / 2;
    return {
      label: String(point.label ?? ''),
      value: point.value,
      x,
      width: barWidth,
      // A negative bar hangs BELOW the baseline. Sorting the two y's
      // means height is never negative — canvas draws those backwards.
      y: Math.min(valueY, baselineY),
      height: Math.abs(valueY - baselineY),
      centerX: x + barWidth / 2,
      negative: point.value < 0,
    };
  });

  const ticks = computeTicks(min, max, tickCount).map((value) => ({
    value,
    label: formatValue(value),
    y: yOf(value),
  }));

  return { width, height, padding: pad, plot, min, max, baselineY, bars, ticks };
}

/**
 * The ONLY function in this project that knows what a canvas is. It
 * makes no decisions: every number it uses was computed above. Swap it
 * for an SVG writer or an ASCII printer and the chart still works.
 */
export function draw(ctx, layout, style = {}) {
  const {
    barColor = '#4e79a7',
    negativeColor = '#e15759',
    gridColor = '#e6e6e6',
    axisColor = '#999',
    textColor = '#333',
    background = '#fff',
    font = '12px sans-serif',
  } = style;

  ctx.clearRect(0, 0, layout.width, layout.height);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  ctx.font = font;
  ctx.textBaseline = 'middle';

  for (const tick of layout.ticks) {
    ctx.strokeStyle = tick.value === 0 ? axisColor : gridColor;
    ctx.beginPath();
    ctx.moveTo(layout.plot.x, tick.y);
    ctx.lineTo(layout.plot.x + layout.plot.width, tick.y);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.fillText(tick.label, layout.plot.x - 8, tick.y);
  }

  for (const bar of layout.bars) {
    ctx.fillStyle = bar.negative ? negativeColor : barColor;
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(bar.label, bar.centerX, layout.plot.y + layout.plot.height + 16);
  }
}
