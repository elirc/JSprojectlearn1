const ALPHABET_SIZE = 26;
const ROTATION = 13;

/**
 * ROT13: rotate every ASCII letter 13 places; leave everything else alone.
 * Applying it twice returns the original text (13 + 13 = 26 = full circle).
 */
export function rot13(text) {
  return text.replace(/[a-z]/gi, (letter) => {
    // 'A' and 'a' are the start of the two alphabet blocks in the
    // character table. Everything is measured as an offset from there.
    const base = letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
    const offset = letter.charCodeAt(0) - base;
    const rotated = (offset + ROTATION) % ALPHABET_SIZE;
    return String.fromCharCode(base + rotated);
  });
}
