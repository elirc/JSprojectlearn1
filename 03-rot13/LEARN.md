# 📘 Learning Guide: ROT13

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

ROT13 ("rotate by 13") is the world's simplest secret code. Take each letter and replace it with the letter 13 places further along the alphabet, wrapping back to the start when you fall off the end:

```
a → n    b → o    c → p   ...   m → z
n → a    o → b    p → c   ...   z → m
```

Everything that isn't a letter — spaces, digits, punctuation — stays as-is, and capitals stay capital. Running the program:

```
input:  Hello, World!
output: Uryyb, Jbeyq!
```

The magic party trick: because the alphabet has 26 letters and 13 + 13 = 26, applying ROT13 *twice* gets you back exactly where you started. The same function both scrambles and unscrambles. The original program is *correct* — this project is about making correct code readable.

## 2. Concepts you need first

### Character codes: `charCodeAt` and `fromCharCode`
Computers store letters as numbers. Every character has a numeric code (from an old standard called **ASCII** for English letters): `A` is 65, `B` is 66 … `Z` is 90, and `a` is 97 … `z` is 122. Two built-ins convert both directions:

```js
console.log("A".charCodeAt(0));      // 65 — code of the character at index 0
console.log("a".charCodeAt(0));      // 97
console.log(String.fromCharCode(66)); // "B" — code back to character
```

Since letters sit in *consecutive* number blocks, "shift a letter" becomes plain arithmetic on its code.

### The `%` operator and wrap-around
`a % b` is the **remainder** after dividing `a` by `b`. Its superpower: cycling. Values keep climbing, remainders loop back to 0:

```js
console.log(24 % 26); // 24
console.log(25 % 26); // 25
console.log(26 % 26); // 0  — wrapped!
console.log(30 % 26); // 4
```

Anything that cycles — clock hours, days of the week, alphabet positions — is a `%` in disguise. "Position 25 plus 13 letters" is `(25 + 13) % 26` = 12. No `if` needed.

### Magic numbers and named constants
A **magic number** is a bare number in code whose meaning you're left to guess: what's 90? A **named constant** is the same value with its meaning attached:

```js
const ALPHABET_SIZE = 26;
const ROTATION = 13;
console.log((17 + ROTATION) % ALPHABET_SIZE); // 4 — now the formula explains itself
```

`const` declares a variable that can't be reassigned. ALL_CAPS naming is a convention meaning "fixed value, part of the design."

### Comparing strings with `<=`
Strings compare by character code, so for single characters `letter <= 'Z'` asks "is this letter's code at or below Z's code?" Since capitals (65–90) all sit below lowercase (97–122):

```js
console.log('H' <= 'Z'); // true  — uppercase
console.log('h' <= 'Z'); // false — lowercase (104 > 90)
```

One tidy test tells the two alphabet blocks apart.

### Regular expressions (regex)
A **regular expression** is a pattern for matching text, written between slashes. `[a-z]` matches any one lowercase letter. The letters after the closing slash are **flags**: `g` (global) means "every match, not just the first," and `i` (insensitive) means "ignore case":

```js
console.log("a1b2".replace(/[a-z]/g, "*"));  // "*1*2"
console.log("Ab".replace(/[a-z]/gi, "*"));   // "**"  — i makes it match A too
```

So `/[a-z]/gi` reads: "every letter, upper or lower."

### `replace` with a function
`text.replace(pattern, fn)` can take a *function* instead of a replacement string. For each match, it calls your function with the matched text and splices in whatever you return:

```js
const result = "abc".replace(/[a-z]/g, (letter) => letter.toUpperCase());
console.log(result); // "ABC"
```

This is the "transform each letter, leave everything else alone" tool — the regex decides *what* gets touched, your function decides *what it becomes*.

### Arrow functions
`(x) => x + 1` is compact syntax for a function: parameters on the left of `=>`, returned expression on the right:

```js
const double = (n) => n * 2;
console.log(double(5)); // 10
```

When the body is one expression, the `return` is implicit. You'll see arrows constantly as arguments to `replace`, `sort`, `map`, and in tests.

### Modules and tests (quick version)
`export function rot13...` shares the function; `import { rot13 } from './rot13.js'` uses it elsewhere. Tests call the function and check answers: `assert.equal(rot13('abc'), 'nop')` throws if the result differs. Run them with `node --test`. (Project 01's guide covers testing from scratch.)

### Property-based thinking
Most tests check specific examples (`'abc'` → `'nop'`). A **property test** checks a *rule that must always hold*, for any input — like "decoding an encoding returns the original." One property can guard against whole families of bugs at once.

## 3. Walking through the original code

```js
function rot13(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
```

Start with an empty result string; walk the input index by index, converting each character to its numeric code.

```js
    if (code >= 65 && code <= 90) {
      code = code + 13;
      if (code > 90) {
        code = code - 26;
      }
      result = result + String.fromCharCode(code);
```

The uppercase branch. Translated: "if the code is between A (65) and Z (90), add 13; if that overshoots past Z, subtract 26 to wrap around; then convert back to a character and append it to the result."

```js
    } else if (code >= 97 && code <= 122) {
      code = code + 13;
      if (code > 122) {
        code = code - 26;
      }
      result = result + String.fromCharCode(code);
```

The lowercase branch — the *exact same logic* with 97/122 instead of 65/90. Read both branches side by side: they are copy-paste twins that differ only in which numbers mark the alphabet's edges.

```js
    } else {
      result = result + str[i];
    }
  }
  return result;
}
```

Anything that isn't a letter is appended unchanged. Then two demo lines print `Uryyb, Jbeyq!` and prove the apply-twice trick.

## 4. What's wrong with it (in beginner terms)

Nothing is *broken* — the README is upfront about that. The cost is in reading and maintaining it.

**1. Magic numbers.** To verify this code you must already know that 65 is A, 90 is Z, 97 is a, 122 is z, and that 26 is the alphabet size. Story: six months from now you (or a teammate) skim this file and see `if (code > 90)`. Is 90 right? Was it supposed to be 96? You can't tell without an ASCII table in your head. Code you can't verify at a glance is code you're scared to touch.

**2. Duplicated branches.** The two branches are twins, and twins drift apart. Story: someone decides to make the shift configurable and edits `code + 13` to `code + shift` — in the uppercase branch only, because that's the one their test happened to exercise. Now `"HELLO"` works and `"hello"` is silently wrong. Every duplicated block is an invitation to fix one copy and forget the other; the standard cure is to compute what *differs* (here: which block base) and share what's the *same*.

**3. Wrap-around as a patch-up `if`.** `add 13, and if you fell off the end, subtract 26` works, but it treats wrapping as damage control. `(offset + 13) % 26` *is* wrap-around, stated as math. Once you recognize the pattern, you'll reach for `%` everywhere things cycle — clock arithmetic, circular buffers, board games. The `if` version also multiplies with problem 2: two branches × one patch-up `if` each = four places for the same idea.

**4. Manual loop + string gluing.** `result = result + ...` in a loop is the low-level way. It buries the *intent* — "transform letters, keep the rest" — under bookkeeping: the loop counter, the accumulator, the else-branch for non-letters. `replace(/[a-z]/gi, fn)` states the intent in one line, and the range checks disappear because the regex already answered "is this a letter?"

## 5. Try it yourself first!

Try rewriting `rot13` before reading the solution. Hints, vaguest first:

1. 🌱 Name every bare number. Then stare at the two letter-branches: what is the *only* thing that differs between them?
2. 🌿 The difference is the starting code of the block: 65 for capitals, 97 for lowercase. Compute that first into a variable called `base` — then write the shift logic once.
3. 🌳 Work in *offsets*: `offset = code - base` gives 0–25 (a's position in its alphabet). Shift with `(offset + 13) % 26`. Convert back with `base + rotated`. No overflow `if` needed.
4. 🍎 Full shape: `text.replace(/[a-z]/gi, (letter) => { ... })`. Inside: pick `base` with `letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0)`, compute the offset, rotate with `%`, return `String.fromCharCode(base + rotated)`.

## 6. Understanding the refactored solution

**`rot13.js`** — the entire file:

```js
const ALPHABET_SIZE = 26;
const ROTATION = 13;
```

The two concepts get names at the top. If someone wants ROT5 for digits someday, they know exactly where the knobs are.

```js
export function rot13(text) {
  return text.replace(/[a-z]/gi, (letter) => {
```

One statement: "return the text with every letter transformed." The regex handles letter-detection *and* leave-the-rest-alone, so the whole else-branch of the original vanishes.

```js
    const base = letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
```

The one genuine difference between the original's twin branches, isolated into a single line. `letter <= 'Z'` distinguishes upper from lower (capitals have smaller codes); `base` becomes 65 or 97 — but written as `'A'.charCodeAt(0)`, which a human can verify without an ASCII table. The `? :` is the ternary operator: condition, value-if-true, value-if-false.

```js
    const offset = letter.charCodeAt(0) - base;
    const rotated = (offset + ROTATION) % ALPHABET_SIZE;
    return String.fromCharCode(base + rotated);
```

The shared logic, written once. `offset` is the letter's position in its alphabet (a=0 … z=25). Adding 13 and taking `% 26` rotates with automatic wrap-around — `(25 + 13) % 26 = 12`, so `z → m`, no patch-up needed. Add the base back, convert to a character, done. Three lines replace fourteen.

**`rot13.test.js`** — five example tests and one property test:

```js
test('wraps around the end of the alphabet', () => {
  assert.equal(rot13('nz'), 'am');
});
```

Each example test targets one behavior: lowercase, case preservation, wrap-around, non-letters untouched, empty string. Then the star of the file:

```js
test('is its own inverse', () => {
  const text = 'The quick brown fox, 123!';
  assert.equal(rot13(rot13(text)), text);
});
```

This checks a *property* — apply twice, get the original back — using a sentence with mixed case, punctuation, and digits. Why is it so powerful? Because huge classes of mistakes (an off-by-one in the offset, a wrong base, a broken wrap) would all break round-tripping. One assertion patrols the whole function.

## 7. Words you learned (glossary)

- **ROT13** — the cipher that rotates each letter 13 places; applying it twice restores the original.
- **Cipher** — a rule for scrambling text so it can be unscrambled later.
- **ASCII** — the old standard numbering for characters (A=65…Z=90, a=97…z=122).
- **Character code** — the number a computer stores for a character.
- **`charCodeAt(0)` / `String.fromCharCode(n)`** — character → code, and code → character.
- **`%` (modulo/remainder)** — remainder after division; the standard tool for wrap-around/cycling.
- **Magic number** — a bare, unexplained number in code.
- **Named constant** — a `const` in ALL_CAPS giving a fixed value a meaning.
- **Offset** — a position measured from a starting point (here: letters as 0–25 from `base`).
- **Base** — the code where an alphabet block starts (65 for A–Z, 97 for a–z).
- **Duplication** — the same logic written twice; edits then have to happen twice.
- **Regular expression (regex)** — a text-matching pattern like `/[a-z]/gi`.
- **Flag** — regex modifier letters: `g` = all matches, `i` = ignore case.
- **`replace` with a callback** — running a function on each match to compute its replacement.
- **Arrow function** — compact function syntax: `(x) => x * 2`.
- **Ternary (`? :`)** — one-line if/else that produces a value.
- **Accumulator** — a variable that collects results across loop turns (the original's `result`).
- **Property test** — a test asserting a rule that must hold for *any* input, like `rot13(rot13(x)) === x`.
- **Inverse** — an operation that undoes another; ROT13 is its *own* inverse.

## 8. Experiments to try on the plane (no internet needed)

Run `node --test 03-rot13/` after each change to check yourself.

1. **Watch wrap-around happen.** In a scratch file, loop `for (let i = 0; i < 26; i++) console.log(i, (i + 13) % 26);`. Expected: the right column runs 13…25 then 0…12 — the rotation table itself, no `if` in sight.
2. **Turn it into ROT1.** Change `ROTATION` to `1` and run the tests. Expected: most tests fail (they assume 13), but read the failure output: `'abc'` now gives `'bcd'`. Change it back — and notice how a single named constant made this experiment a one-character edit.
3. **Break the inverse on purpose.** Set `ROTATION = 12` and run only your thinking: which tests fail? Expected: the example tests fail *and* "is its own inverse" fails — because 12 + 12 = 24 ≠ 26. Then try `ROTATION = 13` again and confirm all green. (This shows *why* 13 is the special number: it's exactly half of 26.)
4. **Make case-mangling visible.** In `rot13.js`, change the regex to `/[a-z]/g` (drop the `i`). Expected: 'Hello' → 'Hryyb' — capitals slip through untouched, and both the uppercase test and the inverse test catch it. This is the safety net doing its job.
5. **Write ROT5 for digits.** Add a second function: `export function rot5(text) { return text.replace(/[0-9]/g, (d) => String.fromCharCode('0'.charCodeAt(0) + (d.charCodeAt(0) - '0'.charCodeAt(0) + 5) % 10)); }`. Expected: `rot5('1234')` returns `'6789'`, and `rot5(rot5(x))` returns `x` — same shape, different alphabet. Write the inverse property test for it.
