import { buildTrie, Trie } from './trie.js';

// The entire I/O layer: ask the trie, print the answer. No searching,
// no ranking, no case rules live in this file.

const dictionary = buildTrie({
  car: 90, card: 40, care: 30, careful: 5, cart: 25, carton: 3,
  cat: 80, cast: 10, do: 70, does: 20, dog: 95, dodge: 4,
  door: 35, Doorbell: 6, dot: 15, double: 8, down: 60,
  download: 50, Downtown: 7, draw: 12,
});

const show = (prefix, limit = 5) =>
  console.log(`  ${prefix || '(empty)'} -> ${dictionary.suggest(prefix, limit).join(', ') || '(no matches)'}`);

console.log(`dictionary holds ${dictionary.size} words`);
console.log('--- typing "car" one letter at a time ---');
for (const prefix of ['c', 'ca', 'car']) show(prefix);

console.log('--- one search path, so case can no longer disagree ---');
show('doo');
show('DOO'); // same answer — the rule lives in one place

console.log('--- the corners the original mumbled through ---');
show('z'); // no matches, said out loud
show('', 3); // empty prefix = top of the whole dictionary

// The identical 50,000-word workload the original scanned 250,000 times.
const letters = 'abcdefghijklmnopqrstuvwxyz';
const words = [];
for (let i = 0; i < 50_000; i++) {
  let n = (i * 2654435761) % 11881376;
  let word = '';
  for (let c = 0; c < 5; c++) {
    word += letters[n % 26];
    n = Math.floor(n / 26);
  }
  words.push(word);
}

// Build ONCE (the trie's whole bet: pay at load, not per keystroke)...
const buildStarted = Date.now();
const big = new Trie();
words.forEach((word, i) => big.insert(word, i % 100));
const buildMs = Date.now() - buildStarted;

// ...then answer keystrokes forever.
const typed = words[4999];
const queryStarted = Date.now();
for (let k = 1; k <= typed.length; k++) big.suggest(typed.slice(0, k), 5);
const queryMs = Date.now() - queryStarted;

console.log(`\nbuilding the 50000-word trie: ${buildMs}ms (once, at startup)`);
console.log(`typing "${typed}" into it: ${queryMs}ms (the part the user waits for)`);

// WHY it wins — the candidate set collapses instead of being re-derived:
for (let k = 1; k <= typed.length; k++) {
  const prefix = typed.slice(0, k);
  console.log(`  "${prefix}" -> ${big.suggest(prefix, 50_000).length} matches (scan would examine 50000)`);
}
