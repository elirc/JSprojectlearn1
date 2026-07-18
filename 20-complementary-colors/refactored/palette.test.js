import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotateHue, complementary, triadic, analogous } from './palette.js';

test('the complement of red is cyan (not "inverted red")', () => {
  assert.deepEqual(complementary('#ff0000'), ['#ff0000', '#00ffff']);
});

test('rotating 180 twice gets you home', () => {
  assert.equal(rotateHue(rotateHue('#3366cc', 180), 180), '#3366cc');
});

test('rotation preserves brightness and saturation (unlike inversion)', () => {
  // A dark red should complement to an equally dark cyan.
  assert.deepEqual(complementary('#800000'), ['#800000', '#008080']);
});

test('triadic of red is red, green, blue', () => {
  assert.deepEqual(triadic('#ff0000'), ['#ff0000', '#00ff00', '#0000ff']);
});

test('analogous straddles the base color', () => {
  const [left, base, right] = analogous('#ff0000', 30);
  assert.equal(base, '#ff0000');
  assert.deepEqual([left, right], ['#ff0080', '#ff8000']);
});

test('garbage input throws (inherited from hexToRgb — for free)', () => {
  assert.throws(() => complementary('red'), /Not a hex color/);
});
