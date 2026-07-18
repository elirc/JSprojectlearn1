import { buildChain, generateSentence } from './markov.js';

const text =
  'the cat sat on the mat the cat ate the fish the dog sat on the log ' +
  'a cat on a mat is a happy cat the fish saw the dog and the dog saw the cat';

// Build ONCE...
const chain = buildChain(text);

// ...generate many times.
for (let i = 0; i < 5; i++) {
  console.log(generateSentence(chain, { maxWords: 12 }));
}
