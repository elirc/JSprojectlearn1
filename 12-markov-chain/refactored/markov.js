/**
 * Two phases, two functions:
 *
 *   buildChain(text)  — expensive, done once. Text in, model out.
 *   generateSentence(chain, options) — cheap, done many times.
 *
 * The chain is just data (a Map of word -> [words that followed it]),
 * so you can build it once from a novel and generate thousands of
 * sentences without re-parsing.
 */

export function buildChain(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chain = new Map();

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];
    if (!chain.has(current)) {
      chain.set(current, []);
    }
    chain.get(current).push(next);
  }
  return chain;
}

export function generateSentence(chain, {
  maxWords = 20,
  start,
  rng = Math.random,
} = {}) {
  if (chain.size === 0) return '';

  const pickFrom = (array) => array[Math.floor(rng() * array.length)];

  // Default to a random starting word so output doesn't always begin
  // the same way (a duplicated follower appears here in proportion to
  // its frequency, which nicely biases the start toward common words).
  let word = start ?? pickFrom([...chain.keys()]);
  const sentence = [word];

  while (sentence.length < maxWords) {
    const followers = chain.get(word);
    if (!followers) break; // dead end: last word of the source text
    word = pickFrom(followers);
    sentence.push(word);
  }

  return sentence.join(' ');
}
