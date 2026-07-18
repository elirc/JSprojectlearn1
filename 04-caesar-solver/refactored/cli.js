import { crack } from './solver.js';

const ciphertext =
  process.argv[2] ?? 'Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj';

const { shift, plaintext } = crack(ciphertext);
console.log(`Decoded with shift ${shift}:`);
console.log(plaintext);
