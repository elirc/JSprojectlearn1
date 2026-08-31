# 🏋️ Practice: Caesar Cipher Solver

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Identity and wrap tests (warm-up)

Three facts about `caesarShift` that no current test states: shifting by 0 changes nothing, shifting by 26 changes nothing, and shifting by 27 is the same as shifting by 1. Add one test with those three asserts to `solver.test.js` and run `node --test 04-caesar-solver/`.
What it practices: pinning down the normalization behavior (`% 26`) as an explicit contract.
Hint: for the third fact, compare two calls to each other: `assert.equal(caesarShift('abc', 27), caesarShift('abc', 1))`.

### ⭐⭐ 2. decode (core)

Add `decode(text, shift)` to `caesar.js`: it undoes `caesarShift(text, shift)`. Don't write a new loop — express it *in terms of* `caesarShift`, the same way `rot13` is. Then test the round trip: `decode(caesarShift('Attack at dawn!', 9), 9)` must give back `'Attack at dawn!'`, and `decode('bcd', 1)` must be `'abc'`.
What it practices: building the special case out of the general function — and trusting the double-modulo to handle the negative number.
Hint: encoding by 9 and decoding by 9 means shifting by −9. One line.

### ⭐⭐ 3. crackWith — promote the scorer to a parameter (core)

`crack` hard-codes `englishScore`. Apply this project's own lesson one more time: write `crackWith(ciphertext, scorer)` that is `crack` with the scoring function passed in as a parameter. Test it with a scorer that only cares about one word: `crackWith(caesarShift('the fox ran off', 5), (text) => text.includes('fox') ? 1 : 0)` must return the plaintext `'the fox ran off'` with `shift` 21 (because 5 + 21 = 26).
What it practices: the "rule of three" move applied to *functions* — a function passed as a value, not just numbers as parameters.
Hint: copy `crack`'s body and change exactly one call: `englishScore(plaintext)` becomes `scorer(plaintext)`. Functions are values in JavaScript; pass them like any argument.

### ⭐⭐ 4. A confidence flag (core)

When nothing scores above zero (try cracking `'xyz'`), `crack` still returns *something* — a wrong guess that looks as authoritative as a right one. Write `crackConfident(ciphertext)` returning the best candidate plus a `confident` boolean that is true only when `score > 0`. Test both sides: `crackConfident('xyz').confident` is `false`; cracking an encoded `'the quick brown fox jumps over the lazy dog'` gives `confident: true`.
What it practices: making uncertainty part of the returned data instead of a silent wrong answer — the project 02 "fail loudly" idea, softened into a flag.
Hint: `const best = crackWith(ciphertext, englishScore); return { ...best, confident: best.score > 0 };` — spread copies the fields, then you add one.

### ⭐⭐⭐ 5. A letter-frequency scorer that cracks what englishScore can't (challenge)

The sentence `'zebras gallop past seventeen turquoise windmills every summer evening'` contains *none* of the 20 common words — `englishScore` gives it 0, so `crack` fails on it (it returns the untouched ciphertext, since shift 0 also scores 0 and nothing beats it). Write `frequencyScore(text)`: count how many characters of the lowercased text are common English letters (use the set `'etaoinshr'`). Then show that `crackWith(caesarShift(thatSentence, 9), frequencyScore)` recovers the sentence with `shift` 17, where plain `crack` on the same ciphertext does not.
What it practices: swapping in a smarter strategy without touching the search loop — the payoff of exercise 3's parameter.
Hint: `new Set('etaoinshr')` makes a set of single characters; loop `for (const char of text.toLowerCase())` and count hits. English text has far more e/t/a/o than any shifted gibberish does.

## Solutions

### 1. Identity and wrap tests

```js
test('shift 0 and 26 are identity; 27 equals 1', () => {
  assert.equal(caesarShift('abc', 0), 'abc');
  assert.equal(caesarShift('abc', 26), 'abc');
  assert.equal(caesarShift('abc', 27), caesarShift('abc', 1));
});
```

WHY: these asserts turn the `((shift % 26) + 26) % 26` idiom from "trust me" into checked behavior. Note the third assert compares the function *to itself* with equivalent inputs — a handy pattern when the exact output doesn't matter, only the equivalence.

### 2. decode

```js
export function decode(text, shift) {
  return caesarShift(text, -shift);
}
```

Test:

```js
test('decode undoes caesarShift', () => {
  assert.equal(decode(caesarShift('Attack at dawn!', 9), 9), 'Attack at dawn!');
  assert.equal(decode('bcd', 1), 'abc');
});
```

WHY: this is the same shape as `rot13` — a one-line special case falling out of the general function. It only works because the double-modulo normalizes `-9` to `17`; without it, negative char codes would produce garbage (LEARN.md's experiment 2 shows exactly that failure). Round-trip tests like this catch whole classes of off-by-one bugs.

### 3. crackWith

```js
export function crackWith(ciphertext, scorer) {
  let best = { shift: 0, plaintext: ciphertext, score: -1 };
  for (let shift = 0; shift < 26; shift++) {
    const plaintext = caesarShift(ciphertext, shift);
    const score = scorer(plaintext);
    if (score > best.score) {
      best = { shift, plaintext, score };
    }
  }
  return best;
}
```

Test:

```js
test('crackWith accepts a custom scorer', () => {
  const foxScorer = (text) => (text.includes('fox') ? 1 : 0);
  const result = crackWith(caesarShift('the fox ran off', 5), foxScorer);
  assert.equal(result.plaintext, 'the fox ran off');
  assert.equal(result.shift, 21);
});
```

WHY: `crack` welded *how to search* (try 26 shifts, keep the best) to *how to judge* (count common words) — two separate ideas, just like the README says scoring and cracking are. Promoting the scorer to a parameter is the rule-of-three move again, except the parameter is a function. You can keep the old API too: `crack` becomes `(c) => crackWith(c, englishScore)`. Verified by running: only shift 21 makes `'fox'` appear.

### 4. crackConfident

```js
export function crackConfident(ciphertext) {
  const best = crackWith(ciphertext, englishScore);
  return { ...best, confident: best.score > 0 };
}
```

Test:

```js
test('reports low confidence on unscoreable input', () => {
  assert.equal(crackConfident('xyz').confident, false);
  const sentence = 'the quick brown fox jumps over the lazy dog';
  assert.equal(crackConfident(caesarShift(sentence, 3)).confident, true);
});
```

WHY: because `crack` returns *data*, upgrading its honesty is additive — one new field, no caller broken, and `cli.js` could now print "(low confidence)" without any change to the search logic. A wrong answer that admits it might be wrong is categorically safer than one that doesn't. Verified by running both asserts.

### 5. frequencyScore

```js
const COMMON_LETTERS = new Set('etaoinshr');

export function frequencyScore(text) {
  let score = 0;
  for (const char of text.toLowerCase()) {
    if (COMMON_LETTERS.has(char)) score++;
  }
  return score;
}
```

Test:

```js
test('frequencyScore cracks a sentence with no common words', () => {
  const sentence = 'zebras gallop past seventeen turquoise windmills every summer evening';
  const ciphertext = caesarShift(sentence, 9);
  assert.notEqual(crack(ciphertext).plaintext, sentence);      // word scorer fails
  const result = crackWith(ciphertext, frequencyScore);
  assert.equal(result.plaintext, sentence);                     // letter scorer wins
  assert.equal(result.shift, 17);
});
```

WHY: this is why exercise 3 mattered — a better strategy plugs into the *unchanged* search loop, because judging was separated from searching. Letter frequency is a weaker signal per character but it never goes fully blind: every English sentence is stuffed with e/t/a/o/i/n even when it dodges all 20 common words. Verified by actually running it: `englishScore` gives the sentence 0 and `crack` returns the ciphertext untouched, while `frequencyScore` picks shift 17 and recovers the plaintext exactly.
