const ALPHABET_SIZE = 26;

/**
 * The generalization of project 03's rot13. Same body — the shift
 * became a parameter. Negative shifts and shifts > 26 both work
 * because of the double-modulo trick below.
 */
export function caesarShift(text, shift) {
  const wrapped = ((shift % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE;
  return text.replace(/[a-z]/gi, (letter) => {
    const base = letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
    const offset = letter.charCodeAt(0) - base;
    return String.fromCharCode(base + (offset + wrapped) % ALPHABET_SIZE);
  });
}

export function rot13(text) {
  return caesarShift(text, 13);
}
