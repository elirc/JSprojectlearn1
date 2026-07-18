/**
 * Color palettes by rotating hue on the color wheel.
 *
 * The whole point of this file: it does NOT re-implement any color
 * math. Project 19 already built (and tested) the conversions — we
 * import them. Building on your own tested code is the payoff for
 * having written it cleanly.
 */
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../../19-hsv-color/refactored/hsv.js';

/** Rotate a hex color around the color wheel, keeping s and v. */
export function rotateHue(hex, degrees) {
  const { h, s, v } = rgbToHsv(hexToRgb(hex));
  return rgbToHex(hsvToRgb({ h: h + degrees, s, v }));
}

/** The true complement: opposite side of the wheel (180°). */
export function complementary(hex) {
  return [hex, rotateHue(hex, 180)];
}

/** Three colors evenly spaced (120° apart). */
export function triadic(hex) {
  return [hex, rotateHue(hex, 120), rotateHue(hex, 240)];
}

/** Neighbors on the wheel — calm, low-contrast palettes. */
export function analogous(hex, spread = 30) {
  return [rotateHue(hex, -spread), hex, rotateHue(hex, spread)];
}
