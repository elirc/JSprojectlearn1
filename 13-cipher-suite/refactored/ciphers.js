/**
 * THE INTERFACE — every cipher is an object with the same shape:
 *
 *   {
 *     name:     string,
 *     needsKey: boolean,
 *     encrypt(text, key) -> string,
 *     decrypt(text, key) -> string,
 *   }
 *
 * Any object with that shape plugs in. Nothing else in the program
 * knows or cares which ciphers exist — the registry below is the ONLY
 * place a new cipher needs to be added, and the round-trip test in
 * ciphers.test.js will pick it up automatically.
 */

const ALPHABET_SIZE = 26;

function shiftLetters(text, shift) {
  const wrapped = ((shift % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE;
  return text.replace(/[a-z]/gi, (letter) => {
    const base = letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
    return String.fromCharCode(base + (letter.charCodeAt(0) - base + wrapped) % ALPHABET_SIZE);
  });
}

const caesar = {
  name: 'caesar',
  needsKey: true,
  encrypt: (text, key) => shiftLetters(text, Number(key)),
  decrypt: (text, key) => shiftLetters(text, -Number(key)),
};

const rot13 = {
  name: 'rot13',
  needsKey: false,
  encrypt: (text) => shiftLetters(text, 13),
  decrypt: (text) => shiftLetters(text, 13),
};

const atbash = {
  name: 'atbash',
  needsKey: false,
  encrypt: (text) =>
    text.replace(/[a-z]/gi, (letter) => {
      const base = letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
      return String.fromCharCode(base + 25 - (letter.charCodeAt(0) - base));
    }),
  decrypt(text) {
    return this.encrypt(text); // atbash is its own inverse
  },
};

const reverse = {
  name: 'reverse',
  needsKey: false,
  encrypt: (text) => [...text].reverse().join(''),
  decrypt: (text) => [...text].reverse().join(''),
};

// Vigenère: caesar, but the shift comes from a repeating keyword.
// Added AFTER the others — note it only touched this file.
const vigenere = {
  name: 'vigenere',
  needsKey: true,
  encrypt: (text, key) => vigenereShift(text, key, +1),
  decrypt: (text, key) => vigenereShift(text, key, -1),
};

function vigenereShift(text, key, direction) {
  const shifts = [...key.toLowerCase()].map((ch) => ch.charCodeAt(0) - 97);
  let letterIndex = 0; // only letters consume key characters
  return text.replace(/[a-z]/gi, (letter) => {
    const shift = shifts[letterIndex % shifts.length] * direction;
    letterIndex++;
    return shiftLetters(letter, shift);
  });
}

/** The registry. Adding a cipher = adding one entry. */
export const CIPHERS = [caesar, rot13, atbash, reverse, vigenere];

export function getCipher(name) {
  const cipher = CIPHERS.find((c) => c.name === name);
  if (!cipher) {
    const names = CIPHERS.map((c) => c.name).join(', ');
    throw new Error(`Unknown cipher "${name}". Available: ${names}`);
  }
  return cipher;
}
