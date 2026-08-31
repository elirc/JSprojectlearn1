# 🏋️ Practice: ASCII Digital Clock

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in the `refactored/` folder. For each exercise, add code to `render.js` (or a new file next to it) and tests to `render.test.js` (or your own `practice.test.js`), then run `node --test 23-ascii-clock/` from the repo root. Exercises 2 and 3 modify `renderText` — keep the existing tests passing.

## Exercises

### ⭐ 1. `formatDate` (warm-up)

Write a pure `formatDate(date)` returning `"2026-01-05"` style strings (year, dash, two-digit month, dash, two-digit day). Take the date as a parameter, exactly like `formatTime` — and watch out for JavaScript's month numbering.

What it practices: the injectable clock and `padStart`, plus a classic Date gotcha.

Hint: `date.getMonth()` returns 0 for January — you must add 1 before padding.

Check: your test `assert.equal(formatDate(new Date(2026, 0, 5)), '2026-01-05')` must pass, and `new Date(2026, 11, 31)` must give `'2026-12-31'`.

### ⭐⭐ 2. Close the empty-string hole (core)

`renderText('')` currently returns `'\n\n\n\n'` — five empty rows, silently. That's plausible garbage, not an answer (run it and look). Decide the behavior should be a loud failure: make `renderText` throw `'Nothing to render'` on empty input, and add a test for it.

What it practices: finding an uncovered edge case, choosing loud failure over silent nonsense, and pinning the choice with a test.

Hint: one `if` at the top of `renderText`, before the glyph check; `assert.throws(() => renderText(''), /Nothing to render/)`.

Check: your new test must FAIL against the unmodified `render.js` (no error is thrown today) and PASS once your guard is in. All five existing tests must still pass.

### ⭐⭐ 3. Make the gap a parameter (core)

The one-space gap between characters is hardcoded in `join(' ')`. Change the signature to `renderText(text, { gap = 1 } = {})` so callers can widen (or remove) the spacing, with the default behaving exactly as before. Add a test at a non-default gap.

What it practices: turning a buried constant into a parameter without breaking a single existing caller — the options-object-with-defaults idiom.

Hint: `' '.repeat(gap)` builds the separator; `= {}` in the parameter makes `renderText('10')` still work with no second argument.

Check: existing tests still pass untouched; `renderText('10', { gap: 3 })` rows must all be 9 characters wide, with row 0 equal to `'  #   ###'`; `{ gap: 0 }` gives row 0 `'  ####'`.

### ⭐⭐ 4. A 12-hour formatter (core)

Write `formatTime12(date)` returning strings like `"03:30:00 PM"`. The two traps live at the boundaries: hour 0 must display as `12 ... AM`, and hour 12 as `12 ... PM`. Write the tests for exactly those two traps first, then the easy cases.

What it practices: edge-case-first testing of a pure function — the boundaries are where the bugs are.

Hint: `hours24 % 12` gives 0 for both midnight and noon; map that 0 to 12. AM/PM depends only on `hours24 < 12`.

Check: `new Date(2026, 0, 1, 0, 5, 3)` → `'12:05:03 AM'`, `(..., 12, 0, 0)` → `'12:00:00 PM'`, `(..., 15, 30, 0)` → `'03:30:00 PM'`, `(..., 23, 59, 59)` → `'11:59:59 PM'`.

### ⭐⭐⭐ 5. `renderTextScaled` — double-size digits (challenge)

Write `renderTextScaled(text, scale)` that renders the same art `scale` times bigger: every character of every row is repeated `scale` times horizontally, and every row is repeated `scale` times vertically. Build it ON TOP of `renderText` — call it, transform its output string, touch no font data.

What it practices: extending a pipeline by adding a stage after an existing one, instead of reaching inside it.

Hint: split the art on `'\n'`; for each row build the widened row once with `[...row].map((ch) => ch.repeat(scale)).join('')`, then push it `scale` times.

Check: `renderTextScaled('1', 2)` must equal exactly 10 rows of `'    ##'` joined by newlines (the `'  #'` glyph doubled); `renderTextScaled('10', 2)` has 10 rows, each 14 wide; and scale 1 must return exactly `renderText(text)`.

## Solutions

### 1. `formatDate`

```js
export function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test('formatDate pads month and day', () => {
  assert.equal(formatDate(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(formatDate(new Date(2026, 11, 31)), '2026-12-31');
});
```

WHY: same two moves as `formatTime` — the date arrives as a parameter (so the test can pin it) and `padStart` replaces would-be ternaries. The `+ 1` is the exercise's real payload: month numbering is exactly the kind of off-by-one a fixed-date test catches instantly and a "looks right when I run it" check misses for eleven months of the year.

### 2. Empty-string guard

```js
export function renderText(text, { gap = 1 } = {}) {   // signature from ex. 3
  if (text.length === 0) throw new Error('Nothing to render');
  // ... rest unchanged
}

test('empty input fails loudly', () => {
  assert.throws(() => renderText(''), /Nothing to render/);
});
```

WHY: today the per-character glyph check never runs on `''` (no characters to check), so the hole slips through validation and out comes shapeless whitespace — plausible garbage, the expensive kind of wrong. The guard applies the project's loud-failure principle to an input the original validation never considered, and the test run against the old code *proves* the hole existed before you closed it.

### 3. Gap parameter

```js
export function renderText(text, { gap = 1 } = {}) {
  if (text.length === 0) throw new Error('Nothing to render');
  for (const char of text) {
    if (!(char in FONT)) throw new Error(`No glyph for "${char}"`);
  }
  const rows = [];
  for (let r = 0; r < FONT_HEIGHT; r++) {
    rows.push([...text].map((char) => FONT[char][r]).join(' '.repeat(gap)));
  }
  return rows.join('\n');
}

test('gap is adjustable, default unchanged', () => {
  assert.equal(renderText('10', { gap: 3 }).split('\n')[0], '  #   ###');
  assert.ok(renderText('10', { gap: 3 }).split('\n').every((r) => r.length === 9));
  assert.equal(renderText('10', { gap: 0 }).split('\n')[0], '  ####');
});
```

WHY: `{ gap = 1 } = {}` is the whole trick — the inner `= 1` defaults the property, the outer `= {}` defaults the missing object, so every existing call site (including `clock.js` and all five tests) compiles to the old behavior untouched. The buried `' '` became a named knob, the same move project 24 makes with its character ramp.

### 4. `formatTime12`

```js
export function formatTime12(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const hours24 = date.getHours();
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${pad(hours12)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${suffix}`;
}

test('12-hour clock handles midnight and noon', () => {
  assert.equal(formatTime12(new Date(2026, 0, 1, 0, 5, 3)), '12:05:03 AM');
  assert.equal(formatTime12(new Date(2026, 0, 1, 12, 0, 0)), '12:00:00 PM');
  assert.equal(formatTime12(new Date(2026, 0, 1, 15, 30, 0)), '03:30:00 PM');
  assert.equal(formatTime12(new Date(2026, 0, 1, 23, 59, 59)), '11:59:59 PM');
});
```

WHY: the naive `hours24 % 12` renders midnight and noon as `00` — a bug that only shows up twice a day, which is why injected fixed dates beat watching a live clock by roughly 43,000 to 2. Both formatters can now feed the same `renderText`, because the pipeline stages only agreed on "a string of digits and colons", not on which clock convention produced it.

### 5. `renderTextScaled`

```js
import { formatTime, renderText } from './render.js'; // if in a new file

export function renderTextScaled(text, scale) {
  const art = renderText(text);
  const scaledRows = [];
  for (const row of art.split('\n')) {
    const wide = [...row].map((ch) => ch.repeat(scale)).join('');
    for (let i = 0; i < scale; i++) scaledRows.push(wide);
  }
  return scaledRows.join('\n');
}

test('scaling doubles every pixel', () => {
  assert.equal(renderTextScaled('1', 2), Array(10).fill('    ##').join('\n'));
  const rows = renderTextScaled('10', 2).split('\n');
  assert.equal(rows.length, 10);
  assert.ok(rows.every((r) => r.length === 14));
  assert.equal(renderTextScaled('23:59', 1), renderText('23:59'));
});
```

WHY: this is a new pipeline stage bolted after an existing one — `text → renderText → art → scale → bigger art` — and it needed zero knowledge of `FONT`, because `renderText` already returns plain data (a string). Note the gap scales too (`' '` between glyphs doubles like any other character), which the width check 14 = (3+1+3)×2 confirms. The scale-1 identity test is the cheapest kind of property test: a transformation's "do nothing" setting should actually do nothing.
