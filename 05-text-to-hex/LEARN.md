# 📘 Learning Guide: Text to Hex/Binary Converter

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that shows you what your text looks like in the computer's own number languages. Every character you type is stored as a number, and numbers can be written in different systems:

- **Hex (hexadecimal)** — base 16, using digits 0–9 and letters a–f.
- **Binary** — base 2, using only 0 and 1.

Feed it `"Hi!"` and it answers:

```
48 69 21                      ← hex: H is 48, i is 69, ! is 21
01001000 01101001 00100001    ← the same three characters in binary
```

That's it — a translator from human text to machine numbers.

## 2. Concepts you need first

**Character codes / code points.** Computers store each character as a number. `H` is 72, `i` is 105, `!` is 33. This number is called a **code point**.

```js
console.log("H".charCodeAt(0));    // 72
console.log("H".codePointAt(0));   // 72 (a newer, safer version — see below)
```

**Number bases (radix).** We normally count in base 10 (digits 0–9). Base 16 (**hex**) uses 0–9 then a–f, so fifteen is `f` and sixteen is `10`. Base 2 (**binary**) uses only 0 and 1. The base is also called the **radix**. JavaScript converts with `toString(radix)`:

```js
console.log((72).toString(16));  // "48"       — 72 in hex
console.log((72).toString(2));   // "1001000"  — 72 in binary
```

**Padding.** `(3).toString(16)` is just `"3"` — one digit. For tidy columns we want every hex value two digits wide (`"03"`) and every binary value eight wide. `padStart(width, '0')` adds zeros on the left until the string reaches `width`:

```js
console.log("3".padStart(2, "0"));      // "03"
console.log("1001000".padStart(8, "0")); // "01001000"
```

**Arrays, `map`, and `join`.** An array is a list. `map` transforms every item using a function and returns a new list. `join(' ')` glues items into one string with a separator *between* them (never after the last one):

```js
const nums = [72, 105];
const hex = nums.map(n => n.toString(16));  // ["48", "69"]
console.log(hex.join(" "));                  // "48 69" — no trailing space
```

**Arrow functions.** `n => n.toString(16)` is shorthand for a tiny function: "given `n`, return `n.toString(16)`".

**The spread operator `[...text]`.** Splits a string into an array of characters:

```js
console.log([..."Hi"]);   // ["H", "i"]
console.log([..."💩"]);   // ["💩"] — the emoji stays in one piece!
```

That emoji note matters. Under the hood, JavaScript stores big characters like emoji as *two* internal chunks (called **surrogate pairs**). Old-style indexing (`text[0]`, `charCodeAt`) sees the two halves; `[...text]` and `codePointAt` see the whole character.

**`typeof` and throwing errors.** `typeof x` tells you what kind of value `x` is (`"string"`, `"number"`, ...). `throw new TypeError("message")` stops the program immediately with your message. Throwing early with a clear message is called **failing loudly**:

```js
if (typeof x !== "string") {
  throw new TypeError(`Expected a string, got ${typeof x}`);
}
```

**Options objects and destructuring.** Instead of `f(16, 2)` — where you'd forget which number is which — pass named values: `f({ radix: 16, width: 2 })`. The function unpacks them right in its parameter list:

```js
function fmt(n, { radix, width }) {
  return n.toString(radix).padStart(width, "0");
}
console.log(fmt(72, { radix: 16, width: 2 }));  // "48"
```

**`import` / `export` (modules).** `export` marks functions a file offers; `import` pulls them into another file (or a test file).

**Pure functions.** A function that only looks at its inputs and only produces a return value — no printing, no changing outside variables. Pure functions are easy to test: same input, same output, every time.

## 3. Walking through the original code

One function does everything, steered by a `mode` string:

```js
function convert(text, mode) {
  var output = "";
  if (mode == "hex") {
```

If `mode` is `"hex"`, loop over the characters:

```js
for (var i = 0; i < text.length; i++) {
  var h = text.charCodeAt(i).toString(16);
  if (h.length == 1) {
    h = "0" + h;
  }
  output += h + " ";
}
```

Take each character's code, convert to hex, glue a `"0"` on front if it's only one digit, then append it plus a space to `output`.

The `"binary"` branch is nearly identical — different radix (2) and a `while` loop padding to width 8:

```js
var b = text.charCodeAt(i).toString(2);
while (b.length < 8) {
  b = "0" + b;
}
output += b + " ";
```

The bottom of the file demos the failure modes on purpose:

```js
console.log(convert("Hi!", "Hex"));  // "" — typo in mode, silently empty
console.log(convert(42, "hex"));     // crash: text.charCodeAt is not a function
console.log(convert("💩", "hex"));   // "d83d dca9 " — surrogate halves
```

## 4. What's wrong with it (in beginner terms)

**Flaw 1: The `mode` string is a trap.** Pass `"Hex"` with a capital H and *neither* branch matches — the function quietly returns `""`. No error. Imagine this buried in a bigger app: a screen just shows blank where the hex should be, and you spend an hour hunting before spotting the capital letter. Function names can't fail this way — type `textToHex` wrong and JavaScript refuses to run at all, pointing at the exact line.

**Flaw 2: The two branches are twins.** Same loop, same padding idea; only the radix (16 vs 2) and width (2 vs 8) differ. Fix a bug in one branch, forget the other, and hex and binary now behave differently. Duplicated code means duplicated bugs.

**Flaw 3: No input checking.** Call `convert(42, "hex")` and it crashes with `text.charCodeAt is not a function` — an error about the *insides* of the function, not about your mistake. Days later, that message tells you nothing about where the bad `42` came from. Checking the type at the entrance — the **boundary** — and throwing `"Expected a string, got number"` points straight at the real problem.

**Flaw 4: Hand-rolled padding.** The `while` loop works, but JavaScript already ships `padStart`. Code you don't write is code that can't have bugs.

**Flaw 5: Trailing space.** `output += h + " "` adds a space after *every* item, including the last: `"48 69 21 "`. Invisible on screen, but the moment code compares strings (`result === "48 69 21"`) it mysteriously fails. Building an array and using `join(' ')` makes this bug impossible.

**Bonus flaw: emoji split in half.** `charCodeAt` sees the two internal halves of an emoji, printing `d83d dca9` — two numbers that aren't the real code point (`1f4a9`).

## 5. Try it yourself first!

Try rewriting the original before reading on. Hints, vaguest first:

1. Could two *separate* functions replace the one `mode` argument? What would you name them?
2. The two branches share a shape: characters → numbers → padded strings → joined. Can each step be its own tiny function?
3. `[...text].map(c => c.codePointAt(0))` gives an array of code points — and keeps emoji whole.
4. `n.toString(radix).padStart(width, '0')` replaces both padding blocks. Which radix/width pair does hex need? Binary?
5. Build an array of formatted strings, then `.join(' ')` — the trailing space vanishes by construction.
6. At the very start, check `typeof text !== 'string'` and throw a `TypeError` saying what you got.

## 6. Understanding the refactored solution

The refactor (`refactored/convert.js`) is a **pipeline** — data flows through three small functions:

```
text  →  toCodePoints  →  map(formatCodePoint)  →  join(' ')
```

**Step 1: text to numbers, with a guard at the door.**

```js
export function toCodePoints(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }
  return [...text].map((char) => char.codePointAt(0));
}
```

The type check lives here — the boundary — so everything downstream can trust its input. `[...text]` keeps emoji whole; `codePointAt(0)` reads the true code point.

**Step 2: one number to one padded string.**

```js
export function formatCodePoint(codePoint, { radix, width }) {
  return codePoint.toString(radix).padStart(width, '0');
}
```

This one line replaces both padding blocks of the original. The radix and width are named options, so calls read like documentation.

**Step 3: the two public functions are the same pipeline with different numbers.**

```js
export function textToHex(text) {
  return toCodePoints(text)
    .map((cp) => formatCodePoint(cp, { radix: 16, width: 2 }))
    .join(' ');
}
```

`textToBinary` is identical with `{ radix: 2, width: 8 }`. Four lines each. No mode string exists to typo — the "mode" became the function's *name*.

**The tests (`convert.test.js`).** Node's built-in test runner: `test(name, fn)` declares a test; `assert.equal(a, b)` fails if they differ; `assert.deepEqual` compares arrays item by item; `assert.throws(fn, TypeError)` passes only if calling `fn` throws that error type. Each test pins down one promise from section 4:

- `toCodePoints('Hi')` → `[72, 105]` — the basic mapping.
- `toCodePoints('💩')` → `[128169]` — one code point, not two halves.
- `textToHex('Hi!')` → `'48 69 21'` — padded, spaced, **no trailing space** (a separate test checks `endsWith(' ')` is false).
- `textToHex('')` → `''` — empty in, empty out, no crash.
- `textToHex(42)` throws a `TypeError` — the boundary check works.

Tests like these are the "failure modes nobody tested" from the original, now tested forever.

## 7. Words you learned (glossary)

- **Code point**: the number a computer assigns to a character (`H` = 72).
- **Hex (hexadecimal)**: base-16 numbers, digits 0–9 and a–f.
- **Binary**: base-2 numbers, digits 0 and 1.
- **Radix**: another word for a number system's base (10, 16, 2...).
- **Padding**: adding filler characters (usually `0`) to reach a fixed width.
- **`padStart(w, c)`**: built-in that pads a string on the left to width `w` with `c`.
- **`map`**: array method that transforms every item and returns a new array.
- **`join(sep)`**: glues array items into a string with `sep` *between* items.
- **Spread (`[...str]`)**: splits a string into an array of whole characters.
- **Surrogate pair**: the two internal chunks JavaScript uses to store big characters like emoji.
- **Boundary / validate at the boundary**: check inputs once, at a function's entrance, then trust them inside.
- **Fail loudly**: crash immediately with a clear message instead of returning something silently wrong.
- **`TypeError`**: the error type for "wrong kind of value".
- **Stringly-typed**: steering behavior with free-form strings (like `mode`) that typos break silently.
- **Options object**: passing named settings as `{ radix: 16, width: 2 }` instead of bare numbers.
- **Destructuring**: unpacking `{ radix, width }` into variables in the parameter list.
- **Pure function**: output depends only on inputs; no printing or side effects.
- **Pipeline**: a chain of small transformations, each feeding the next.

## 8. Experiments to try on the plane (no internet needed)

1. **Add `textToOctal`.** Octal is base 8 (digits 0–7). Copy `textToHex`, use `{ radix: 8, width: 3 }`. Expected: `textToOctal('Hi')` gives `'110 151'`. Notice how little you wrote — that's the pipeline paying off.
2. **Break the boundary check.** Delete the `typeof` guard in `toCodePoints`, then run `node --test 05-text-to-hex/`. The `TypeError` test fails, and if you call `textToHex(42)` yourself you get the old cryptic crash. Restore the guard.
3. **Prove `join` beats `+=`.** In a scratch file, build `["48","69","21"]` and compare `arr.join(' ')` with a `for` loop doing `out += x + ' '`. Print both between vertical bars: `console.log('|' + result + '|')`. Only the loop version shows a gap before the closing `|`.
4. **Test a round trip.** Write `hexToText(hex)`: `hex.split(' ').map(h => String.fromCodePoint(parseInt(h, 16))).join('')`. (`parseInt(h, 16)` reads a hex string back into a number.) Expected: `hexToText(textToHex('Hi!'))` returns `'Hi!'`.
5. **Watch the emoji difference.** In a scratch file, print `"💩".charCodeAt(0).toString(16)` and `"💩".codePointAt(0).toString(16)`. You'll see `d83d` (a surrogate half) versus `1f4a9` (the real code point).
