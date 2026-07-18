/**
 * HSV <-> RGB conversion.
 *
 * Shapes (documented once, used everywhere):
 *   hsv: { h: 0-360 (any number is normalized), s: 0-1, v: 0-1 }
 *   rgb: { r: 0-255, g: 0-255, b: 0-255 }
 *
 * Objects instead of positional arrays: rgbToHsv(color).h reads
 * itself; result[0] does not.
 */

/** Any angle -> [0, 360). normalizeHue(360) = 0, normalizeHue(-30) = 330. */
export function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
}

export function hsvToRgb({ h, s, v }) {
  const hue = normalizeHue(h);
  const chroma = v * s;                 // color intensity
  const hPrime = hue / 60;              // which sixth of the wheel
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1)); // ramp within it

  // The six branches are DATA now: which channel gets chroma/x/0.
  const sector = Math.floor(hPrime) % 6;
  const [r1, g1, b1] = [
    [chroma, x, 0], // 0: red -> yellow
    [x, chroma, 0], // 1: yellow -> green
    [0, chroma, x], // 2: green -> cyan
    [0, x, chroma], // 3: cyan -> blue
    [x, 0, chroma], // 4: blue -> magenta
    [chroma, 0, x], // 5: magenta -> red
  ][sector];

  const m = v - chroma; // lift everything to match the brightness
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHsv({ r, g, b }) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h;
  if (delta === 0) h = 0; // grey: hue is meaningless, use 0
  else if (max === rNorm) h = 60 * (((gNorm - bNorm) / delta) % 6);
  else if (max === gNorm) h = 60 * ((bNorm - rNorm) / delta + 2);
  else h = 60 * ((rNorm - gNorm) / delta + 4);

  return {
    h: normalizeHue(h),
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

// -- hex helpers so the other color projects can build on this file --

export function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Not a hex color: "${hex}"`);
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
