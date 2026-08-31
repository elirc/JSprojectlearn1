# 🏋️ Practice: Complementary Colors

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

**Setup:** add new functions to `refactored/palette.js` (it already imports everything you need from project 19) and put your tests in a new file `refactored/practice.test.js`. Run with `node --test 20-complementary-colors/`.

## Exercises

### ⭐ 1. Tetradic — the square palette (warm-up)
Designers also use **tetradic** palettes: four colors at the corners of a square on the wheel — the base plus rotations of 90°, 180°, and 270°. Add `tetradic(hex)` to `palette.js` in the style of the existing one-liners, returning all four hex strings. Test: `tetradic('#ff0000')` must deep-equal `['#ff0000', '#80ff00', '#00ffff', '#8000ff']`, and `tetradic('red')` must throw `/Not a hex color/` — without you writing any validation.
What it practices: extending a family of one-liners built on `rotateHue`, and noticing you inherit project 19's guarantees again.
Hint: it's the `triadic` line with one more rotation. The expected hex values come from 19's math: rotating red 90° gives `{r:128, g:255, b:0}`.

### ⭐⭐ 2. Shades — vary brightness instead of hue (core)
Every palette so far rotates h. Build one that walks v instead: `shades(hex, steps = 3)` returns `steps` colors with the same hue and saturation, with value scaled by 1, then (steps−1)/steps, ... down to 1/steps. Tests: `shades('#ff0000')` deep-equals `['#ff0000', '#aa0000', '#550000']`, and `shades('#3366cc', 4)` has length 4 and starts with `'#3366cc'` unchanged.
What it practices: the same unpack-change-repack composition as `rotateHue`, but on a different HSV axis — proving you understand *why* the chain is shaped that way.
Hint: `Array.from({ length: steps }, (_, i) => ...)` with `v * (1 - i / steps)`. For red, v = 1, so the three values are 255, 170 (`aa`), 85 (`55`).

### ⭐⭐ 3. The definition, as a property test (core)
The suite's "killer test" checks one dark red. Generalize it into a property: for several base colors (say `'#ff0000'`, `'#3366cc'`, `'#804020'`, `'#00ff80'`) and several rotations (30, 90, 180, 270, −60, 400), converting the rotated color back to HSV must show s and v within 0.01 of the base color's s and v. Import `rgbToHsv` and `hexToRgb` from project 19 in the test file, same as `palette.js` does. It should pass as-is; then temporarily make `rotateHue` also do `s: s * 0.9` and watch every combination fail.
What it practices: turning the project's headline sentence — "rotation preserves saturation and brightness, unlike inversion" — into an executable fact over many inputs.
Hint: two nested `for...of` loops. Compute `rgbToHsv(hexToRgb(hex))` once per base color, outside the inner loop.

### ⭐⭐ 4. A guarded palette registry (core)
The demo has a `PALETTES` table; the library deserves one too. Export `const PALETTES = { complementary, triadic, analogous, tetradic }` from `palette.js` and a function `paletteOf(name, hex)` that looks the name up and calls it — throwing an error that *lists all valid names* when the name is unknown (project 18's `score` guard, transplanted). Tests: `paletteOf('triadic', '#ff0000')` deep-equals `['#ff0000', '#00ff00', '#0000ff']`; `paletteOf('triadc', '#ff0000')` throws a message matching both `/Unknown palette "triadc"/` and `/complementary, triadic, analogous, tetradic/`.
What it practices: the registry pattern plus loud failure — a typo'd palette name should never silently return `undefined`.
Hint: `Object.keys(PALETTES).join(', ')` builds the "Known: ..." part of the message.

### ⭐⭐⭐ 5. Name that color (challenge)
Write `nearestNamed(hex)`: convert to HSV and return the name whose wheel position is closest in hue, from a 12-name table (`red: 0, orange: 30, yellow: 60, chartreuse: 90, green: 120, spring: 150, cyan: 180, azure: 210, blue: 240, violet: 270, magenta: 300, rose: 330`). Two traps: hue distance is *circular* — h = 352 is 8° from red, not 352° — and greys have no hue at all, so if s is 0 return `'grey'`. Tests: `'#ff2000'` → `'red'`, `'#00ffee'` → `'cyan'`, `'#ff0020'` → `'red'` (the wrap case), `'#ff8000'` → `'orange'`, `'#808080'` → `'grey'`.
What it practices: circular distance (the flip side of project 19's `normalizeHue`), a lookup table walked with `Object.entries`, and honoring the "grey has no hue" edge case the demo experiment only observed.
Hint: for the circular distance, take `raw = Math.abs(h - hue)` and use `Math.min(raw, 360 - raw)`.

## Solutions

### 1. Tetradic
```js
// palette.js
/** Four colors at the corners of a square (90° apart). */
export function tetradic(hex) {
  return [hex, rotateHue(hex, 90), rotateHue(hex, 180), rotateHue(hex, 270)];
}
```
```js
// practice.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotateHue, tetradic, shades, paletteOf, nearestNamed } from './palette.js';
import { rgbToHsv, hexToRgb } from '../../19-hsv-color/refactored/hsv.js';

test('tetradic is four corners of a square', () => {
  assert.deepEqual(tetradic('#ff0000'), ['#ff0000', '#80ff00', '#00ffff', '#8000ff']);
  assert.throws(() => tetradic('red'), /Not a hex color/);
});
```
**Why:** one more palette costs one more one-liner because all the machinery lives in `rotateHue` and, below it, project 19. The throw test passes with zero new code — the inherited-guarantee point made again, on code *you* added.

### 2. Shades
```js
// palette.js
/** Same hue and saturation, stepping the value down toward black. */
export function shades(hex, steps = 3) {
  const { h, s, v } = rgbToHsv(hexToRgb(hex));
  return Array.from({ length: steps }, (_, i) =>
    rgbToHex(hsvToRgb({ h, s, v: v * (1 - i / steps) })),
  );
}
```
```js
test('shades keeps the hue and dims the value', () => {
  assert.deepEqual(shades('#ff0000'), ['#ff0000', '#aa0000', '#550000']);
  assert.equal(shades('#3366cc', 4).length, 4);
  assert.equal(shades('#3366cc', 4)[0], '#3366cc');
});
```
**Why:** the palettes-so-far edit h; this one edits v; the *shape* — hex → hsv → change one field → hex — is identical, which shows the shape was the point, not the particular field. The first shade uses factor 1, so the base color round-trips through the whole chain untouched — a free mini round-trip test hiding inside the feature.

### 3. The definition, as a property test
```js
test('rotateHue never changes saturation or value', () => {
  for (const hex of ['#ff0000', '#3366cc', '#804020', '#00ff80']) {
    const before = rgbToHsv(hexToRgb(hex));
    for (const degrees of [30, 90, 180, 270, -60, 400]) {
      const after = rgbToHsv(hexToRgb(rotateHue(hex, degrees)));
      assert.ok(Math.abs(after.s - before.s) <= 0.01,
        `${hex} rotated ${degrees}: s ${before.s} -> ${after.s}`);
      assert.ok(Math.abs(after.v - before.v) <= 0.01,
        `${hex} rotated ${degrees}: v ${before.v} -> ${after.v}`);
    }
  }
});
```
**Why:** this is the dark-red killer test generalized from one example to 24 combinations, including the wrap-arounds (270 on a red already near 360, −60, 400) that only work because `normalizeHue` sits in the foundation. RGB inversion fails this for nearly every row — the test *is* the definition of "complement" the original got wrong. The 0.01 tolerance covers integer rounding; in fact these colors come back bit-identical.

### 4. A guarded palette registry
```js
// palette.js
export const PALETTES = { complementary, triadic, analogous, tetradic };

export function paletteOf(name, hex) {
  const build = PALETTES[name];
  if (!build) {
    throw new Error(`Unknown palette "${name}". Known: ${Object.keys(PALETTES).join(', ')}`);
  }
  return build(hex);
}
```
```js
test('paletteOf looks up by name and fails loudly on typos', () => {
  assert.deepEqual(paletteOf('triadic', '#ff0000'), ['#ff0000', '#00ff00', '#0000ff']);
  assert.throws(() => paletteOf('triadc', '#ff0000'), /Unknown palette "triadc"/);
  assert.throws(() => paletteOf('triadc', '#ff0000'), /complementary, triadic, analogous, tetradic/);
});
```
**Why:** without the guard, `PALETTES['triadc']` is `undefined` and calling it crashes with a useless `build is not a function` — or worse, gets optional-chained into silence. This is project 18's unknown-category lesson recurring one project later: registries need bouncers, and the error message that lists the valid names turns a typo from a hunt into a ten-second fix.

### 5. Name that color
```js
// palette.js
const NAMED_HUES = {
  red: 0, orange: 30, yellow: 60, chartreuse: 90, green: 120, spring: 150,
  cyan: 180, azure: 210, blue: 240, violet: 270, magenta: 300, rose: 330,
};

/** Closest color name on the wheel; greys have no hue at all. */
export function nearestNamed(hex) {
  const { h, s } = rgbToHsv(hexToRgb(hex));
  if (s === 0) return 'grey';
  let best = null;
  for (const [name, hue] of Object.entries(NAMED_HUES)) {
    const raw = Math.abs(h - hue);
    const distance = Math.min(raw, 360 - raw); // around the circle, not through it
    if (!best || distance < best.distance) best = { name, distance };
  }
  return best.name;
}
```
```js
test('nearestNamed snaps to the closest wheel name', () => {
  assert.equal(nearestNamed('#ff2000'), 'red');   // h ≈ 7.5
  assert.equal(nearestNamed('#00ffee'), 'cyan');  // h ≈ 176
  assert.equal(nearestNamed('#ff0020'), 'red');   // h ≈ 352.5 — wraps past 360
  assert.equal(nearestNamed('#ff8000'), 'orange');
  assert.equal(nearestNamed('#808080'), 'grey');
});
```
**Why:** the `'#ff0020'` row is the whole exercise: naive `Math.abs(352.5 - 0)` calls it 352.5° from red and names it "rose"; circular distance calls it 7.5° and names it red. That's the wheel-is-a-circle insight from `normalizeHue`, reused as a *distance* instead of a normalization. The `s === 0` early return respects what LEARN.md's grey experiment showed — greys aren't on the wheel — and the table-plus-`Object.entries` walk is the registry pattern doing data lookup instead of dispatch.
