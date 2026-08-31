# 🏋️ Practice: FizzBuzz

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Test the edges of the range (warm-up)

`fizzbuzzRange` has two edge cases nobody has tested yet: a range with a single number in it, and a "backwards" range where `start` is bigger than `end`. Add two tests to `fizzbuzz.test.js` that pin down what happens in each case.
What it practices: writing tests for edge cases before you *need* them.
Hint: `fizzbuzzRange(15, 15)` should give a one-element array, and `fizzbuzzRange(5, 1)` should give `[]` — the loop body simply never runs. Use `assert.deepEqual` for arrays.

### ⭐⭐ 2. fizzbuzzStats (core)

Write a new pure function `fizzbuzzStats(start, end)` in `fizzbuzz.js` that returns an object like `{ fizz: 4, buzz: 2, fizzbuzz: 1, plain: 8 }` — how many of each kind of line the range produces. Reuse `fizzbuzz(n)` instead of re-checking divisibility. Check yourself: for the range 1–15 you should get exactly the object above, and for 1–100 you should get `{ fizz: 27, buzz: 14, fizzbuzz: 6, plain: 53 }`.
What it practices: building a new pure function on top of an existing one, and returning data instead of printing.
Hint: loop like `fizzbuzzRange` does, but instead of pushing lines, `if/else if` on the *returned string* to bump one of four counters.

### ⭐⭐ 3. A CLI that takes a range (core)

Create a new file `refactored/run-range.js` that works like `cli.js` but reads the range from the command line: `node run-range.js 14 16` prints `14`, `FizzBuzz`, `16` (one per line), and plain `node run-range.js` still prints 1–100. Command-line arguments live in the array `process.argv` — index 2 is the first one after the script name, and they arrive as *strings*.
What it practices: keeping the I/O layer thin — all new code is argument handling, zero new rule code.
Hint: `const start = Number(process.argv[2] ?? 1);` — `??` supplies the default when the argument is missing, `Number()` converts the string.

### ⭐⭐ 4. Generalize the rules (core)

Write `fizzbuzzWith(n, rules)` where `rules` is an array of `[divisor, word]` pairs, e.g. `[[3, 'Fizz'], [7, 'Bazz']]`. Then show that classic FizzBuzz is just a special case: `fizzbuzzWith(n, [[3, 'Fizz'], [5, 'Buzz']])` must equal `fizzbuzz(n)` for every n from 1 to 100 (write that as a loop in a test). Also check: `fizzbuzzWith(21, [[3, 'Fizz'], [7, 'Bazz']])` is `'FizzBazz'` and `fizzbuzzWith(105, [[3,'Fizz'],[5,'Buzz'],[7,'Bazz']])` is `'FizzBuzzBazz'`.
What it practices: the "promote the hard-coded thing to a parameter" move — the same step project 04 takes with ROT13.
Hint: the body is `fizzbuzz` almost unchanged; replace the two hard-coded `if`s with a `for (const [divisor, word] of rules)` loop.

### ⭐⭐⭐ 5. A property test (challenge)

Instead of testing hand-picked examples, test a *rule that must hold for every input*: `fizzbuzz(n)` returns `'FizzBuzz'` exactly when `n % 15 === 0`. Write one test that loops n from 1 to 300 and asserts this equivalence for each n. It should pass as-is, and fail if you sabotage `fizzbuzz` (try changing `% 5` to `% 6` — the test must go red, then restore it).
What it practices: property-style testing — one loop that checks 300 cases beats 300 hand-written asserts.
Hint: both sides of the property are booleans, so one line does it: `assert.equal(fizzbuzz(n) === 'FizzBuzz', n % 15 === 0);`.

### ⭐⭐⭐ 6. firstMatches — search the sequence (challenge)

Write `firstMatches(word, count)` returning the first `count` numbers n (starting at 1) for which `fizzbuzz(n)` equals `word`. Expected: `firstMatches('FizzBuzz', 3)` → `[15, 30, 45]` and `firstMatches('Buzz', 4)` → `[5, 10, 20, 25]`. Careful: a word that never occurs (like `'Qux'`) must not loop forever — add a safety limit and return whatever you found, so `firstMatches('Qux', 2)` → `[]`.
What it practices: loops with a stop condition you choose, plus defending against infinite loops.
Hint: a `for` loop with *two* conditions: `matches.length < count && n <= 100000`.

## Solutions

### 1. Edge-of-range tests

```js
test('a single-number range has one entry', () => {
  assert.deepEqual(fizzbuzzRange(15, 15), ['FizzBuzz']);
});

test('a backwards range is empty', () => {
  assert.deepEqual(fizzbuzzRange(5, 1), []);
});
```

WHY: the loop condition `n <= end` is false immediately when start > end, so the array stays empty — no crash, no special case needed. Writing that down as a test turns an accident of the implementation into a documented promise. This is the project's core idea: pure functions make checking behavior a one-liner.

### 2. fizzbuzzStats

```js
export function fizzbuzzStats(start, end) {
  const stats = { fizz: 0, buzz: 0, fizzbuzz: 0, plain: 0 };
  for (let n = start; n <= end; n++) {
    const result = fizzbuzz(n);
    if (result === 'Fizz') stats.fizz++;
    else if (result === 'Buzz') stats.buzz++;
    else if (result === 'FizzBuzz') stats.fizzbuzz++;
    else stats.plain++;
  }
  return stats;
}
```

WHY: because `fizzbuzz` *returns* its answer, other code can build on it — the stats function never repeats the `% 3` / `% 5` rules, so if the rules ever change, stats stays correct for free. Verified by running: 1–15 gives `{fizz:4, buzz:2, fizzbuzz:1, plain:8}` and 1–100 gives `{fizz:27, buzz:14, fizzbuzz:6, plain:53}`.

### 3. run-range.js

```js
import { fizzbuzzRange } from './fizzbuzz.js';

const start = Number(process.argv[2] ?? 1);
const end = Number(process.argv[3] ?? 100);
console.log(fizzbuzzRange(start, end).join('\n'));
```

WHY: the rules file didn't change at all — only the thin I/O layer grew by two lines. That's the README's point about `cli.js` being "too simple to contain bugs": argument parsing stays in the disposable outer shell, and `node --test` still passes untouched.

### 4. fizzbuzzWith

```js
export function fizzbuzzWith(n, rules) {
  const parts = [];
  for (const [divisor, word] of rules) {
    if (n % divisor === 0) parts.push(word);
  }
  return parts.length > 0 ? parts.join('') : String(n);
}
```

Test that the classic game is a special case:

```js
test('fizzbuzz is fizzbuzzWith with the classic rules', () => {
  const CLASSIC = [[3, 'Fizz'], [5, 'Buzz']];
  for (let n = 1; n <= 100; n++) {
    assert.equal(fizzbuzzWith(n, CLASSIC), fizzbuzz(n));
  }
  assert.equal(fizzbuzzWith(21, [[3, 'Fizz'], [7, 'Bazz']]), 'FizzBazz');
});
```

WHY: the "build up parts" pattern already treated each rule independently, so turning the rule list into a parameter is a five-line change — the combination explosion never comes back no matter how many rules the caller passes. This is exactly the generalization project 04 performs on the Caesar cipher, practiced a project early.

### 5. Property test

```js
test('FizzBuzz appears exactly for multiples of 15', () => {
  for (let n = 1; n <= 300; n++) {
    assert.equal(fizzbuzz(n) === 'FizzBuzz', n % 15 === 0);
  }
});
```

WHY: example tests check points; property tests check a *shape*. The `===` on the left and the `% 15` on the right are both booleans, so the assert says "these two facts must always agree" — sabotage either rule in `fizzbuzz` and some n in 1..300 exposes it. Compare with project 03's "rot13 is its own inverse" test: same idea.

### 6. firstMatches

```js
export function firstMatches(word, count, limit = 100000) {
  const matches = [];
  for (let n = 1; matches.length < count && n <= limit; n++) {
    if (fizzbuzz(n) === word) matches.push(n);
  }
  return matches;
}
```

WHY: the loop condition encodes both "am I done?" and "have I searched long enough?" — without the limit, `firstMatches('Qux', 1)` would spin forever because no number ever produces `'Qux'`. Verified by running: `('FizzBuzz', 3)` → `[15, 30, 45]`, `('Buzz', 4)` → `[5, 10, 20, 25]`, `('Qux', 2)` → `[]`. Returning data (an array) keeps it as testable as everything else in this project.
