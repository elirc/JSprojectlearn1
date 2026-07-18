import { caesarShift } from './caesar.js';

// The 20 most common English words. If a decoded candidate contains
// several of these, it's almost certainly the right shift.
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
]);

/** How English-looking is this text? Higher = more likely English. */
export function englishScore(text) {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.filter((word) => COMMON_WORDS.has(word)).length;
}

/**
 * Try all 26 shifts, score each candidate, return the best one.
 * Returns { shift, plaintext, score } — data, so the caller can
 * print it, test it, or show runners-up.
 */
export function crack(ciphertext) {
  let best = { shift: 0, plaintext: ciphertext, score: -1 };
  for (let shift = 0; shift < 26; shift++) {
    const plaintext = caesarShift(ciphertext, shift);
    const score = englishScore(plaintext);
    if (score > best.score) {
      best = { shift, plaintext, score };
    }
  }
  return best;
}
