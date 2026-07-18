import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, normalizeHue } from './hsv.js';

test('primary colors land exactly', () => {
  assert.deepEqual(hsvToRgb({ h: 0, s: 1, v: 1 }), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hsvToRgb({ h: 120, s: 1, v: 1 }), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hsvToRgb({ h: 240, s: 1, v: 1 }), { r: 0, g: 0, b: 255 });
});

test('the hues the original crashed on', () => {
  assert.deepEqual(hsvToRgb({ h: 360, s: 1, v: 1 }), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hsvToRgb({ h: -30, s: 1, v: 1 }), hsvToRgb({ h: 330, s: 1, v: 1 }));
});

test('greys: zero saturation kills hue', () => {
  assert.deepEqual(hsvToRgb({ h: 200, s: 0, v: 0.5 }), { r: 128, g: 128, b: 128 });
  assert.deepEqual(hsvToRgb({ h: 0, s: 0, v: 0 }), { r: 0, g: 0, b: 0 });
});

test('normalizeHue', () => {
  assert.equal(normalizeHue(360), 0);
  assert.equal(normalizeHue(-30), 330);
  assert.equal(normalizeHue(725), 5);
});

test('round trip: rgb -> hsv -> rgb survives (within rounding)', () => {
  // The strongest possible check on a pair of converters, run on a
  // grid of colors across the whole cube.
  for (let r = 0; r <= 255; r += 51) {
    for (let g = 0; g <= 255; g += 51) {
      for (let b = 0; b <= 255; b += 51) {
        const back = hsvToRgb(rgbToHsv({ r, g, b }));
        for (const [channel, original] of [['r', r], ['g', g], ['b', b]]) {
          assert.ok(
            Math.abs(back[channel] - original) <= 1,
            `rgb(${r},${g},${b}) came back as ${JSON.stringify(back)}`,
          );
        }
      }
    }
  }
});

test('hex helpers round-trip too', () => {
  assert.equal(rgbToHex({ r: 255, g: 0, b: 128 }), '#ff0080');
  assert.deepEqual(hexToRgb('#ff0080'), { r: 255, g: 0, b: 128 });
  assert.deepEqual(hexToRgb('ff0080'), { r: 255, g: 0, b: 128 }); // # optional
  assert.throws(() => hexToRgb('#12345'), /Not a hex color/);
});
