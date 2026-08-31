# 🏋️ Practice: ROT13

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Test the whole alphabet at once (warm-up)

The existing tests check a few letters. Add one test that nails down the *entire* mapping in two asserts: `rot13('abcdefghijklmnopqrstuvwxyz')` must equal `'nopqrstuvwxyzabcdefghijklm'`, and the uppercase alphabet must map to `'NOPQRSTUVWXYZABCDEFGHIJKLM'`. Run `node --test 03-rot13/` — it should pass immediately.
What it practices: exhaustive tests — when the input space is tiny (26 letters), test all of it.
Hint: type the expected string by starting at `n` and wrapping after `z`. If you mistype it, the test failure will show you exactly where.

### ⭐⭐ 2. The no-fixed-point property (core)

ROT13 has a property the current tests never state: *no letter ever maps to itself*, and *every non-letter maps to itself exactly*. Write one test that loops over every printable ASCII character (codes 32 to 126) and asserts: if the character matches `/[a-z]/i`, `rot13(ch) !== ch`; otherwise `rot13(ch) === ch`.
What it practices: property-style testing over a whole character range instead of spot checks.
Hint: `String.fromCharCode(code)` turns a number into a character; `assert.notEqual` is the negative twin of `assert.equal`.

### ⭐⭐ 3. applyTimes (core)

Write `applyTimes(text, times)` — apply `rot13` to `text` that many times — and test the parity rule: any *even* number of applications returns the original, any *odd* number equals a single `rot13`. Check yourself: `applyTimes('Hello', 4) === 'Hello'`, `applyTimes('Hello', 3) === 'Uryyb'`, and `applyTimes('Hello', 0) === 'Hello'`.
What it practices: loops that repeatedly feed a function its own output, and reasoning about "own inverse" one level up.
Hint: start with `let result = text;` and reassign `result = rot13(result)` in a plain counting loop.

### ⭐⭐ 4. ROT18 in a single body (core)

ROT18 rotates letters by 13 *and* digits by 5, in one pass. Write `rot18(text)` as ONE `replace` with the regex `/[a-z0-9]/gi` and one callback — no separate digit function, no second pass. Inside the callback, pick `base`, alphabet `size` (26 or 10) and `rotation` (13 or 5) depending on what kind of character you got. Check yourself: `rot18('abc123') === 'nop678'`, `rot18('Agent 007') === 'Ntrag 552'`, and `rot18(rot18(x)) === x` for any x.
What it practices: the README's "collapse duplicated branches" move — the letter case and the digit case differ only in three values, so compute those values first and share one body.
Hint: `const isDigit = ch >= '0' && ch <= '9';` then three ternaries. Digits sit below `'A'` in the character table, so test for them *first*.

### ⭐⭐⭐ 5. Table-driven ROT13 (challenge)

A different implementation strategy: precompute the answer for all 52 letters once. Write `buildTable()` returning a `Map` of every letter to its rotated partner (52 entries), and `rot13ViaTable(text)` that walks the text with `for...of`, looking each character up and passing unknown characters through with `?? ch`. Then write the decisive test: for a pangram with punctuation and digits (try `'Sphinx of black quartz, judge my vow! 123'`), `rot13ViaTable` and `rot13` must return the *same* string.
What it practices: lookup tables as an alternative to arithmetic, and using one implementation to cross-check another.
Hint: build the table from the string `'ABCDEFGHIJKLMNOPQRSTUVWXYZ'` — entry i maps to entry `(i + 13) % 26`. Loop twice: once for that string, once for its `.toLowerCase()`.

## Solutions

### 1. Whole-alphabet test

```js
test('maps the entire alphabet correctly', () => {
  assert.equal(rot13('abcdefghijklmnopqrstuvwxyz'), 'nopqrstuvwxyzabcdefghijklm');
  assert.equal(rot13('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 'NOPQRSTUVWXYZABCDEFGHIJKLM');
});
```

WHY: with only 26 letters per case, "test everything" costs two lines — cheaper and stronger than any sample. If someone later fumbles the `% 26` wrap or the `base` calculation, this test names the exact position where the strings diverge.

### 2. No-fixed-point property

```js
test('letters never map to themselves; everything else always does', () => {
  for (let code = 32; code < 127; code++) {
    const ch = String.fromCharCode(code);
    if (/[a-z]/i.test(ch)) {
      assert.notEqual(rot13(ch), ch);
    } else {
      assert.equal(rot13(ch), ch);
    }
  }
});
```

WHY: this states ROT13's contract as a rule, not examples: rotate letters (13 is never 0 mod 26, so a letter can't land on itself), touch nothing else. It would instantly catch a regex typo like `/[a-y]/gi` that example-based tests could miss. Verified by running over all 95 printable ASCII characters.

### 3. applyTimes

```js
export function applyTimes(text, times) {
  let result = text;
  for (let i = 0; i < times; i++) {
    result = rot13(result);
  }
  return result;
}
```

Test:

```js
test('even applications restore, odd equal one rot13', () => {
  assert.equal(applyTimes('Hello', 4), 'Hello');
  assert.equal(applyTimes('Hello', 3), 'Uryyb');
  assert.equal(applyTimes('Hello', 0), 'Hello');
});
```

WHY: "rot13 is its own inverse" generalizes to "applying it n times only depends on whether n is odd or even" — the parity test proves you really understood the inverse property rather than memorizing `rot13(rot13(x)) === x`. The zero case checks the loop's boundary: no iterations, input returned untouched.

### 4. rot18

```js
export function rot18(text) {
  return text.replace(/[a-z0-9]/gi, (ch) => {
    const isDigit = ch >= '0' && ch <= '9';
    const size = isDigit ? 10 : 26;
    const rotation = isDigit ? 5 : 13;
    const base = isDigit ? '0'.charCodeAt(0)
      : ch <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
    const offset = ch.charCodeAt(0) - base;
    return String.fromCharCode(base + (offset + rotation) % size);
  });
}
```

WHY: three character classes (digits, uppercase, lowercase) but only ONE transformation body — the same de-duplication that collapsed the original's upper/lower branches, taken one step further. Each class differs only in `base`, `size`, and `rotation`, so those become computed values, not copied code. It's self-inverse because 13 is half of 26 *and* 5 is half of 10. Verified by running: `'abc123'` → `'nop678'`, `'Agent 007'` → `'Ntrag 552'`, double application restores `'Hello 42!'`.

### 5. Table-driven ROT13

```js
export function buildTable() {
  const table = new Map();
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const alphabet of [upper, upper.toLowerCase()]) {
    for (let i = 0; i < 26; i++) {
      table.set(alphabet[i], alphabet[(i + 13) % 26]);
    }
  }
  return table;
}

export function rot13ViaTable(text) {
  const table = buildTable();
  let result = '';
  for (const ch of text) {
    result += table.get(ch) ?? ch;
  }
  return result;
}
```

Agreement test:

```js
test('table version agrees with the arithmetic version', () => {
  const sample = 'Sphinx of black quartz, judge my vow! 123';
  assert.equal(rot13ViaTable(sample), rot13(sample));
  assert.equal(buildTable().size, 52);
});
```

WHY: a lookup table trades a little memory (52 entries) for zero arithmetic at runtime — a strategy you'll meet constantly (project 05 uses exactly this idea for hex digits). The agreement test is the powerful part: two independent implementations that must match make a bug in *either* visible, and `?? ch` documents the pass-through rule for non-letters in one token. Verified by running against the real `rot13` on the pangram.
