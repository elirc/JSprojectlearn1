# 🏋️ Practice: Count Characters

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Pin down the default case behavior (warm-up)

The tests check that `ignoreCase: true` folds `'AaA'` together — but no test proves the *default* keeps cases apart. Add a test: `countCharacters('Hh')` has `.size === 2`, with `'H'` and `'h'` each counted once, while `countCharacters('Hh', { ignoreCase: true })` has `.size === 1` and `.get('h') === 2`.
What it practices: testing the default of an option, not just the switched-on path.
Hint: three or four `assert.equal` lines; remember `.get` on a missing key returns `undefined`, which you can also assert.

### ⭐⭐ 2. mostFrequent (core)

Add `mostFrequent(text, options)` to `count-characters.js`: it returns the single `[character, count]` pair with the highest count, or `null` for an empty string. Reuse the two functions the module already exports instead of writing a new loop. Check yourself: `mostFrequent('aabbbc')` → `['b', 3]`, `mostFrequent('')` → `null`, `mostFrequent('AaA', { ignoreCase: true })` → `['a', 3]`.
What it practices: composing small pure functions instead of duplicating logic.
Hint: `sortedByCount(countCharacters(text, options))[0]` is almost the whole answer — you just need the empty-array guard.

### ⭐⭐ 3. countWords (core)

Write `countWords(text)` in the same file and style: a `Map` of word → count, split on runs of whitespace, with the same loud `TypeError` guard for non-strings. Check yourself: `countWords('the cat the')` gives `the → 2, cat → 1`; `countWords('')` and `countWords('   ')` both give an empty Map; `countWords(42)` throws a `TypeError`.
What it practices: transferring a pattern (guard → Map → `?? 0` counting) to a new unit of input.
Hint: `text.split(/\s+/).filter(Boolean)` gives you clean words — `filter(Boolean)` drops the empty strings that splitting `'  '` produces.

### ⭐⭐ 4. A lettersOnly option (core)

Add a second option next to `ignoreCase`: `lettersOnly` (default `false`). When true, only characters matching `/[a-zA-Z]/` are counted; spaces, digits and punctuation are skipped. All seven existing tests must still pass unchanged. Check yourself: `countCharacters('a1 b2!', { lettersOnly: true }).size === 2`, but without the option `.size === 6`.
What it practices: extending an options object without breaking existing callers — why named options beat positional booleans.
Hint: at the top of the loop body: `if (lettersOnly && !/[a-zA-Z]/.test(char)) continue;`.

### ⭐⭐⭐ 5. isAnagram (challenge)

Two texts are anagrams if they use exactly the same letters the same number of times, ignoring case, spaces, and punctuation. Write `isAnagram(a, b)` using `countCharacters`, then compare the two Maps yourself (Maps have no built-in equality!). Check yourself: `isAnagram('Listen', 'Silent')` → `true`, `isAnagram('Dormitory', 'Dirty room!!')` → `true`, `isAnagram('hello', 'world')` → `false`, `isAnagram('ab', 'abb')` → `false`.
What it practices: comparing two Maps entry by entry — and discovering that "are these equal?" is code you must write.
Hint: lowercase and strip with `.replace(/[^a-z]/g, '')` first. Then: if sizes differ → false; otherwise loop `for (const [char, n] of countsA)` and check `countsB.get(char) === n`.

### ⭐⭐⭐ 6. Text histogram (challenge)

Write `histogram(counts)` — it takes a Map (the output of `countCharacters`) and returns an *array of strings*, most frequent first, each like `'b ###'` (the character, a space, then one `#` per occurrence). It must not print anything — the caller decides what to do with the lines. Check yourself: `histogram(countCharacters('aabbbc'))` → `['b ###', 'a ##', 'c #']`.
What it practices: keeping formatting pure — a display function that returns data is as testable as a math function.
Hint: `sortedByCount` already orders the entries; then `.map()` them with `'#'.repeat(count)`.

## Solutions

### 1. Default case-sensitivity test

```js
test('default is case-sensitive', () => {
  const counts = countCharacters('Hh');
  assert.equal(counts.size, 2);
  assert.equal(counts.get('H'), 1);
  assert.equal(counts.get('h'), 1);
  assert.equal(countCharacters('Hh', { ignoreCase: true }).get('h'), 2);
});
```

WHY: an option has *two* behaviors — on and off — and the off side is the one callers rely on without thinking. This test makes the default part of the module's contract, exactly like the README's "tests document the edge cases forever."

### 2. mostFrequent

```js
export function mostFrequent(text, options) {
  const sorted = sortedByCount(countCharacters(text, options));
  return sorted.length > 0 ? sorted[0] : null;
}
```

WHY: three lines, zero new counting logic — `countCharacters` counts, `sortedByCount` orders, this function only picks. Passing `options` straight through means `ignoreCase` (and your `lettersOnly`) work here for free. Returning `null` for "no answer" is honest: there is no most-frequent character of an empty string.

### 3. countWords

```js
export function countWords(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }
  const counts = new Map();
  for (const word of text.split(/\s+/).filter(Boolean)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}
```

WHY: it's the same skeleton as `countCharacters` — guard loudly, `Map` for hostile keys (a word could literally be `__proto__`), `?? 0` instead of an if/else dance. Only the *unit* changed, from characters to words. `filter(Boolean)` handles the edge case where splitting `'  '` yields empty strings.

### 4. lettersOnly

```js
export function countCharacters(text, { ignoreCase = false, lettersOnly = false } = {}) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }
  const counts = new Map();
  for (const char of text) {
    if (lettersOnly && !/[a-zA-Z]/.test(char)) continue;
    const key = ignoreCase ? char.toLowerCase() : char;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
```

WHY: because options are *named*, adding one is backwards-compatible — every existing call site (and all seven tests) keeps working, since the default `false` preserves old behavior. With positional booleans this change would have broken or confused every caller. Verified: `('a1 b2!', { lettersOnly: true })` counts only `a` and `b`.

### 5. isAnagram

```js
export function isAnagram(a, b) {
  const clean = (s) => countCharacters(s.toLowerCase().replace(/[^a-z]/g, ''));
  const countsA = clean(a);
  const countsB = clean(b);
  if (countsA.size !== countsB.size) return false;
  for (const [char, n] of countsA) {
    if (countsB.get(char) !== n) return false;
  }
  return true;
}
```

WHY: the counting problem was already solved — the new work is *Map equality*, which JavaScript doesn't give you (`===` on two Maps compares identity, not contents). Same size plus every A-entry matching in B is enough: B can't hide an extra key, because that would make the sizes differ. Verified by running: Listen/Silent → true, Dormitory/"Dirty room!!" → true, hello/world → false.

### 6. histogram

```js
export function histogram(counts) {
  return sortedByCount(counts).map(([char, n]) => `${char} ${'#'.repeat(n)}`);
}
```

WHY: this is the FizzBuzz lesson applied to display code — the function *builds* the lines and returns them; whoever calls it decides whether to `console.log` them, write them to a file, or assert on them in a test. One `assert.deepEqual` against `['b ###', 'a ##', 'c #']` proves it, no console-scraping needed.
