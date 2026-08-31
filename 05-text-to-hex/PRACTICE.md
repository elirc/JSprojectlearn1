# 🏋️ Practice: Text to Hex/Binary Converter

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Test the padding on tiny code points (warm-up)
The existing tests use `'Hi!'`, whose characters all happen to have two-digit hex codes — so if `padStart` disappeared, no current test would notice. Add a test using characters with *one-digit* hex codes: newline (`'\n'`, code point 10) and tab (`'\t'`, code point 9).
What it practices: spotting an edge case the test suite doesn't cover, and pinning it down.
Hint: `\n` and `\t` work inside normal quotes. Your test should pass with `'0a 09'` and fail if you expect `'a 9'`.

### ⭐⭐ 2. A custom separator
Edit your copy of `refactored/convert.js` so `textToHex` takes an optional second parameter `separator`, defaulting to `' '`. `textToHex('Hi!', '-')` should return `'48-69-21'`, and `textToHex('Hi!')` must still return `'48 69 21'` — run `node --test 05-text-to-hex/` and all existing tests must still pass.
What it practices: default parameters, and extending a function without breaking its callers.
Hint: the separator only appears in one place in the pipeline. Which step?

### ⭐⭐ 3. A character table
Write `charTable(text)`: one line per character showing the character, its decimal code point, its hex, and its binary, separated by single spaces. `charTable('Hi')` must return exactly `'H 72 48 01001000\ni 105 69 01101001'`.
What it practices: composing the existing small functions (`formatCodePoint`, spread, `map`, `join`) into a new pipeline instead of writing loops from scratch.
Hint: you need both the character *and* its code point on each line, so map over `[...text]` rather than over `toCodePoints(text)`.

### ⭐⭐ 4. Prove padStart never truncates
The hex converter pads to width 2 — but `'💩'` has code point `0x1f4a9`, five hex digits. Write a test asserting `textToHex('💩') === '1f4a9'` and that the result's `length` is 5. This documents (in a test, forever) that `padStart` adds zeros but never cuts anything off.
What it practices: writing a test that documents surprising-but-correct behavior, so nobody later "fixes" it into a bug.
Hint: the test passes with the current code and would fail if someone swapped `padStart(2, '0')` for `.slice(-2)`.

### ⭐⭐⭐ 5. A converter factory
Write `makeConverter({ radix, width })` that *returns a function*. Then `const hex = makeConverter({ radix: 16, width: 2 })` gives you a function where `hex('Hi!') === textToHex('Hi!')`, and `makeConverter({ radix: 2, width: 8 })` reproduces `textToBinary`. The returned functions must still throw `TypeError` on `hex(42)`.
What it practices: higher-order functions — the same "two functions wearing a trench coat" insight, taken one level up: the pipeline itself becomes the shared thing.
Hint: return an arrow function that closes over `radix` and `width`. The `TypeError` comes free — from where?

### ⭐⭐⭐ 6. A property test for all of ASCII
Write one test that loops over every code point from 0 to 127 and asserts two properties of `formatCodePoint(cp, { radix: 2, width: 8 })`: the result is always exactly 8 characters, and `parseInt(result, 2)` gives back the original code point. That's 128 round trips in a few lines.
What it practices: property-based testing — checking a *rule* across a whole input range instead of listing examples.
Hint: `parseInt(s, 2)` reads a binary string back into a number. The test should pass as-is and fail if you change the width to 7.

## Solutions

### 1. Padding test
```js
test('one-digit hex codes get padded to two digits', () => {
  assert.equal(textToHex('\n\t'), '0a 09');
});
```
WHY: `'Hi!'` never exercises the padding branch, so this test covers the one behavior `padStart` exists for. It's the project's "test the failure modes nobody tested" idea: a test suite should include at least one input where each feature actually matters.

### 2. Custom separator
```js
export function textToHex(text, separator = ' ') {
  return toCodePoints(text)
    .map((cp) => formatCodePoint(cp, { radix: 16, width: 2 }))
    .join(separator);
}

test('custom separator works and the default is unchanged', () => {
  assert.equal(textToHex('Hi!', '-'), '48-69-21');
  assert.equal(textToHex('Hi!'), '48 69 21');
});
```
WHY: the separator lives only in `join`, because the pipeline keeps every concern in exactly one step. A default parameter means every existing caller (and every existing test) is untouched — extending without breaking is what small composable functions buy you.

### 3. Character table
```js
export function charTable(text) {
  return [...text]
    .map((char) => {
      const cp = char.codePointAt(0);
      const hex = formatCodePoint(cp, { radix: 16, width: 2 });
      const bin = formatCodePoint(cp, { radix: 2, width: 8 });
      return `${char} ${cp} ${hex} ${bin}`;
    })
    .join('\n');
}

test('charTable shows char, decimal, hex, binary per line', () => {
  assert.equal(charTable('Hi'), 'H 72 48 01001000\ni 105 69 01101001');
  assert.equal(charTable('!'), '! 33 21 00100001');
});
```
WHY: nothing new was written for the hard parts — `formatCodePoint` already knows padding, `join('\n')` already prevents a trailing newline. The exercise shows the payoff of the refactor: a new feature is mostly *wiring*, and `[...text]` (not `toCodePoints`) is used because this pipeline needs the character itself too.

### 4. No-truncation test
```js
test('padStart pads but never truncates wide code points', () => {
  assert.equal(textToHex('💩'), '1f4a9');
  assert.equal(textToHex('💩').length, 5);
});
```
WHY: this is validate-at-the-boundary's cousin: *document at the boundary*. The behavior is correct but surprising, and a test is the one place a future reader is guaranteed to trip over it before "fixing" it. It also re-proves the `codePointAt` choice — `charCodeAt` would have produced two garbage halves here.

### 5. Converter factory
```js
export function makeConverter({ radix, width }) {
  return (text) =>
    toCodePoints(text)
      .map((cp) => formatCodePoint(cp, { radix, width }))
      .join(' ');
}

test('makeConverter reproduces both converters and keeps the guard', () => {
  const hex = makeConverter({ radix: 16, width: 2 });
  const bin = makeConverter({ radix: 2, width: 8 });
  assert.equal(hex('Hi!'), textToHex('Hi!'));
  assert.equal(bin('Hi'), textToBinary('Hi'));
  assert.throws(() => hex(42), TypeError);
});
```
WHY: `textToHex` and `textToBinary` were "the same pipeline with different numbers plugged in" — this makes that sentence literal code. The returned function *closes over* `radix` and `width`, and the `TypeError` comes free because `toCodePoints` still guards the boundary: validation written once keeps working no matter how many functions are built on top.

### 6. ASCII property test
```js
test('binary formatting round-trips for every ASCII code point', () => {
  for (let cp = 0; cp <= 127; cp++) {
    const bits = formatCodePoint(cp, { radix: 2, width: 8 });
    assert.equal(bits.length, 8);
    assert.equal(parseInt(bits, 2), cp);
  }
});
```
WHY: instead of asserting hand-picked examples, this asserts a *property* — "formatting then parsing is a no-op, and width is constant" — across the whole ASCII range. Properties catch bugs examples miss (an off-by-one at code point 64 would slip past any short example list), and they're cheap precisely because `formatCodePoint` is a pure function.
