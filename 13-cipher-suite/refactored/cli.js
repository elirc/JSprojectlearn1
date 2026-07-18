// Usage:
//   node cli.js encrypt caesar "hello world" 3
//   node cli.js decrypt vigenere "rijvs" key
//
// Note: this file mentions no cipher by name. Add a cipher to the
// registry and the CLI supports it with zero changes here.
import { getCipher, CIPHERS } from './ciphers.js';

const [mode, cipherName, text, key] = process.argv.slice(2);

if (!['encrypt', 'decrypt'].includes(mode) || !text) {
  console.log('Usage: node cli.js <encrypt|decrypt> <cipher> <text> [key]');
  console.log(`Ciphers: ${CIPHERS.map((c) => c.name).join(', ')}`);
  process.exit(1);
}

const cipher = getCipher(cipherName);
if (cipher.needsKey && key === undefined) {
  console.log(`The ${cipher.name} cipher needs a key.`);
  process.exit(1);
}

console.log(cipher[mode](text, key));
