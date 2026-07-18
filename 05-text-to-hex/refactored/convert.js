/**
 * Three tiny functions that compose, instead of one function with a
 * mode switch. Each one is independently testable and reusable.
 */

/** "Hi" -> [72, 105]. Uses code points, so emoji stay whole. */
export function toCodePoints(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }
  return [...text].map((char) => char.codePointAt(0));
}

/** 72 -> "48" (radix 16, width 2) or "01001000" (radix 2, width 8). */
export function formatCodePoint(codePoint, { radix, width }) {
  return codePoint.toString(radix).padStart(width, '0');
}

export function textToHex(text) {
  return toCodePoints(text)
    .map((cp) => formatCodePoint(cp, { radix: 16, width: 2 }))
    .join(' ');
}

export function textToBinary(text) {
  return toCodePoints(text)
    .map((cp) => formatCodePoint(cp, { radix: 2, width: 8 }))
    .join(' ');
}
