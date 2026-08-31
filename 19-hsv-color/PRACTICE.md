# 🏋️ Practice: HSV Color

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

**Setup:** create two new files in `refactored/`: `extras.js` (new functions, importing what they need from `./hsv.js`) and `practice.test.js` (your tests). Exercise 3 is the exception — it edits `hsv.js` itself. Run everything with `node --test 19-hsv-color/`.

## Exercises

### ⭐ 1. Test the inverse directly (warm-up)
Odd gap in the suite: `rgbToHsv` is only ever tested *through* the round trip — no test pins a single exact value. Add one test with four hand-computed conversions: yellow `{r:255, g:255, b:0}`, cyan `{r:0, g:255, b:255}`, magenta `{r:255, g:0, b:255}` (which h, s, v do the secondaries have?), and the grey `{r:128, g:128, b:128}`. Work each out on paper first (which channel is the max? what's delta?), then check with `assert.deepEqual`.
What it practices: reading the max/delta hue formula well enough to predict it, and spotting what a round-trip test *doesn't* cover (it can't tell you hue 60 is "yellow" — only that the pair is consistent).
Hint: the secondaries land exactly on h = 60, 180, 300 with s = 1, v = 1. For grey, delta is 0 — the code picks h = 0, s = 0, and v is `128/255` (write exactly that expression in the test).

### ⭐⭐ 2. `mix` — blend two colors (core)
Add `mix(a, b, t = 0.5)` to `extras.js`: blend two rgb objects channel by channel, where t = 0 gives `a`, t = 1 gives `b`, and 0.5 is the midpoint (round each channel). Tests: black and white mix to `{r:128, g:128, b:128}`; red and blue mix to `{r:128, g:0, b:128}`; t = 0 and t = 1 return the endpoints unchanged.
What it practices: writing a new function in the file's style — named `{r, g, b}` shapes in and out, rounding only at the end.
Hint: one channel is `Math.round(x + (y - x) * t)`; write that helper once and use it three times.

### ⭐⭐ 3. Guard the saturation and value doors (core)
`normalizeHue` guards the hue door, but s and v walk in unchecked: `hsvToRgb({h:0, s:2, v:1})` returns `{r:255, g:-255, b:-255}` — negative light, silently (try it!). Edit `hsvToRgb` in `hsv.js` to throw a `RangeError` unless s and v are both between 0 and 1. Tests: `s: 2` throws, `v: -0.1` throws, `s: NaN` throws, and the whole existing suite still passes.
What it practices: validation at the boundary (project 18's lesson) — every legal input normalized or accepted, every illegal one loud.
Hint: write the check as `if (!(s >= 0 && s <= 1) || !(v >= 0 && v <= 1)) throw ...` — the `!(...)` form is deliberate, because every comparison with `NaN` is false, so NaN fails into the throw too.

### ⭐⭐ 4. The other round trip (core)
The suite round-trips rgb → hsv → rgb, but never hsv → rgb → hsv — the two directions can hide different bugs. Add it: for every h in 0, 30, 60, ... 330 and every s and v in {0.25, 0.5, 0.75, 1}, convert to rgb and back, asserting h returns within ±1°, and s and v within ±0.01. (192 combinations. Measured honestly: the worst hue drift on this grid is about 0.32°, at low saturation — rounding to 0–255 integers quantizes the hue more when chroma is small.)
What it practices: designing a round-trip test yourself, including choosing which inputs to skip (s = 0 would collapse hue to 0 — that's correct behavior, not a bug, so the grid starts at 0.25) and an honest tolerance.
Hint: three nested loops, and put `h`, `s`, `v` in the assert message or you'll never know which combination failed.

### ⭐⭐⭐ 5. `hueLerp` — blend hues the short way around (challenge)
Blending hue 350 (red-pink) and hue 10 (orange-red) by averaging gives 180 — cyan, hilariously wrong. The wheel is a circle: the short way from 350 to 10 is 20° across the top. Write `hueLerp(a, b, t)` in `extras.js` that interpolates along the *shorter* arc. Tests: `hueLerp(350, 10, 0.5)` → 0, `hueLerp(10, 350, 0.5)` → 0, `hueLerp(0, 180, 0.5)` → 90 (exact half-circle: your rule must pick one side consistently), `hueLerp(300, 60, 0.25)` → 330, `hueLerp(300, 60, 1)` → 60.
What it practices: circular arithmetic on top of `normalizeHue` — the same "angles wrap" insight that fixed the original, pushed one level further.
Hint: `normalizeHue(b - a)` tells you how far b is ahead of a, as 0–360. If that's more than 180, the short way is negative: subtract 360. Then walk `a + d * t` and normalize once more.

## Solutions

### 1. Test the inverse directly
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToHsv, hsvToRgb } from './hsv.js';

test('rgbToHsv: exact values for secondaries and grey', () => {
  assert.deepEqual(rgbToHsv({ r: 255, g: 255, b: 0 }), { h: 60, s: 1, v: 1 });
  assert.deepEqual(rgbToHsv({ r: 0, g: 255, b: 255 }), { h: 180, s: 1, v: 1 });
  assert.deepEqual(rgbToHsv({ r: 255, g: 0, b: 255 }), { h: 300, s: 1, v: 1 });
  assert.deepEqual(rgbToHsv({ r: 128, g: 128, b: 128 }), { h: 0, s: 0, v: 128 / 255 });
});
```
**Why:** a round trip only proves the two functions agree with *each other* — they could both be wrong the same way (imagine both swapping green and blue: every round trip still passes). Exact anchor values pin the functions to reality. Tracing them by hand (yellow: max is r *and* g, so the `max === rNorm` branch fires, h = 60·(1−0)/1 = 60) is how you learn the formula.

### 2. `mix`
```js
// extras.js
export function mix(a, b, t = 0.5) {
  const channel = (x, y) => Math.round(x + (y - x) * t);
  return { r: channel(a.r, b.r), g: channel(a.g, b.g), b: channel(a.b, b.b) };
}
```
```js
test('mix blends channels linearly', () => {
  assert.deepEqual(mix({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), { r: 128, g: 128, b: 128 });
  assert.deepEqual(mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }), { r: 128, g: 0, b: 128 });
  assert.deepEqual(mix({ r: 10, g: 20, b: 30 }, { r: 90, g: 80, b: 70 }, 0), { r: 10, g: 20, b: 30 });
  assert.deepEqual(mix({ r: 10, g: 20, b: 30 }, { r: 90, g: 80, b: 70 }, 1), { r: 90, g: 80, b: 70 });
});
```
**Why:** same shapes in, same shapes out — `mix(red, blue).g` reads itself, which is the file's objects-over-positional-arrays rule. The one-line `channel` helper is the anti-copy-paste move: the interpolation formula exists once, not three times, so it can't drift between channels. (255 · 0.5 = 127.5 rounds to 128 — that's why the midpoint of black and white is 128, not 127.)

### 3. Guard the saturation and value doors
```js
// in hsv.js, first lines of hsvToRgb:
export function hsvToRgb({ h, s, v }) {
  if (!(s >= 0 && s <= 1) || !(v >= 0 && v <= 1)) {
    throw new RangeError(`s and v must be between 0 and 1, got s=${s} v=${v}`);
  }
  const hue = normalizeHue(h);
  // ... rest unchanged
```
```js
test('out-of-range saturation or value throws instead of negative light', () => {
  assert.throws(() => hsvToRgb({ h: 0, s: 2, v: 1 }), RangeError);
  assert.throws(() => hsvToRgb({ h: 0, s: 1, v: -0.1 }), RangeError);
  assert.throws(() => hsvToRgb({ h: 0, s: NaN, v: 1 }), RangeError);
});
```
**Why:** hue got `normalizeHue` because any angle *means* something; s = 2 means nothing, so the right response is a loud `RangeError`, not a guess — normalize what has meaning, reject what doesn't. The `!(x >= 0 && x <= 1)` shape matters: `NaN >= 0` is false, so NaN falls into the throw, where the "positive" spelling `x < 0 || x > 1` would wave NaN through (both comparisons false). That's the same NaN-poison lesson as the original bug, caught at the door this time.

### 4. The other round trip
```js
test('hsv -> rgb -> hsv survives (within honest tolerance)', () => {
  for (let h = 0; h < 360; h += 30) {
    for (const s of [0.25, 0.5, 0.75, 1]) {
      for (const v of [0.25, 0.5, 0.75, 1]) {
        const back = rgbToHsv(hsvToRgb({ h, s, v }));
        const hueError = Math.min(Math.abs(back.h - h), 360 - Math.abs(back.h - h));
        assert.ok(hueError <= 1, `hsv(${h},${s},${v}) came back h=${back.h}`);
        assert.ok(Math.abs(back.s - s) <= 0.01, `hsv(${h},${s},${v}) came back s=${back.s}`);
        assert.ok(Math.abs(back.v - v) <= 0.01, `hsv(${h},${s},${v}) came back v=${back.v}`);
      }
    }
  }
});
```
**Why:** inverse pairs deserve round trips in *both* directions — a bug that maps two different hues onto the same rgb would pass rgb→hsv→rgb but fail here. The grid deliberately avoids s = 0 and v = 0, where hue legitimately collapses to 0; a test that "fails" on correct behavior teaches you to choose inputs, not to loosen asserts. The `Math.min(..., 360 - ...)` line measures hue distance *around the circle*, so h = 0 coming back as 359.9 counts as 0.1 off, not 359.9.

### 5. `hueLerp`
```js
// extras.js
import { normalizeHue } from './hsv.js';

export function hueLerp(a, b, t) {
  let d = normalizeHue(b - a); // how far b is ahead of a: 0-360
  if (d > 180) d -= 360;       // more than half a turn? go the other way
  return normalizeHue(a + d * t);
}
```
```js
test('hueLerp takes the short way around the wheel', () => {
  assert.equal(hueLerp(350, 10, 0.5), 0);
  assert.equal(hueLerp(10, 350, 0.5), 0);
  assert.equal(hueLerp(0, 180, 0.5), 90);   // exact tie: clockwise wins
  assert.equal(hueLerp(300, 60, 0.25), 330);
  assert.equal(hueLerp(300, 60, 1), 60);
});
```
**Why:** this is `normalizeHue` promoted from bug-fix to building block: it converts "which direction is shorter?" into one comparison (`d > 180`), and then makes the possibly-negative result presentable again at the end. The tie case (exactly 180° apart) is a real spec decision — `d` stays 180, so this implementation always goes clockwise, and the `hueLerp(0, 180, 0.5) === 90` row *documents* that choice. Averaging naively would give 180 for the 350/10 blend; the tests exist precisely to kill that wrong-but-plausible version.
