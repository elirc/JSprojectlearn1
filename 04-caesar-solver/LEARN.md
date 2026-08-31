# 📘 Learning Guide: Caesar Cipher Solver

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A Caesar cipher is one of the oldest secret codes. You "shift" every letter forward in the alphabet by the same amount. With a shift of 3, `A` becomes `D`, `B` becomes `E`, and `Wkh` turns back into `The` if you shift it the other way.

This project takes a scrambled message like:

```
Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj
```

...and figures out — *automatically* — that the answer is:

```
Decoded with shift 23:
the quick brown fox jumps over the lazy dog
```

The catch: we don't know how far the letters were shifted. There are only 26 possible shifts, so the program tries all of them and picks the one that looks most like English.

## 2. Concepts you need first

**Character codes.** Computers store letters as numbers. `A` is 65, `B` is 66, up to `Z` at 90. Lowercase `a` is 97 through `z` at 122. Two built-in tools convert between them:

```js
console.log("A".charCodeAt(0));      // 65  (letter → number)
console.log(String.fromCharCode(66)); // "B" (number → letter)
```

**Functions and parameters.** A function is a reusable block of code. A *parameter* is a blank you fill in when you call it:

```js
function greet(name) {        // name is a parameter
  return "Hello, " + name;
}
console.log(greet("Sam"));    // Hello, Sam
```

**The `%` (remainder) operator.** `a % b` gives the remainder after dividing `a` by `b`. It's how you "wrap around":

```js
console.log(27 % 26);  // 1  — past the end of the alphabet, wraps to start
console.log(-3 % 26);  // -3 — surprise! JavaScript keeps the minus sign
```

That second line is why the refactored code uses a trick you'll see later.

**Loops.** A `for` loop repeats code a set number of times:

```js
for (let i = 0; i < 3; i++) {
  console.log("round", i);   // prints round 0, round 1, round 2
}
```

**Objects.** An object groups related values under names (called *keys*):

```js
const result = { shift: 3, score: 5 };
console.log(result.shift);   // 3
```

**Destructuring.** A shortcut to pull values out of an object into variables:

```js
const { shift, score } = { shift: 3, score: 5 };
console.log(shift);          // 3
```

**Arrays, `filter`, and `split`.** An array is a list. `split` chops a string into an array; `filter` keeps only items that pass a test:

```js
const words = "the big cat".split(" ");   // ["the", "big", "cat"]
const short = words.filter(w => w.length <= 3);
console.log(short);                        // ["the", "big", "cat"] → all pass
```

**Arrow functions.** `w => w.length <= 3` is a compact way to write a small function. It means "given `w`, return whether `w.length <= 3`".

**Sets.** A `Set` is a collection built for one question: "is this thing in here?"

```js
const pets = new Set(["cat", "dog"]);
console.log(pets.has("cat"));  // true
console.log(pets.has("fox"));  // false
```

**Regular expressions (regex).** A pattern for matching text, written between slashes. `/[a-z]/gi` means "any letter a–z, everywhere in the string (`g`), ignoring upper/lower case (`i`)". `text.replace(pattern, fn)` runs `fn` on every match and swaps in what it returns.

**`import` / `export` (modules).** A *module* is a file that shares code. `export` marks what a file offers; `import` pulls it into another file:

```js
// math.js
export function double(x) { return x * 2; }
// main.js
import { double } from './math.js';
console.log(double(4));  // 8
```

**`process.argv`.** When you run `node cli.js hello`, Node puts the words you typed into an array called `process.argv`. Position 2 is your first argument.

**`??` (nullish coalescing).** "Use the left side, unless it's missing — then use the right side." `process.argv[2] ?? 'default text'` means "the argument, or this fallback".

## 3. Walking through the original code

The original file contains two nearly identical functions. Here's the heart of `rot1`:

```js
var code = str.charCodeAt(i);
if (code >= 65 && code <= 90) {
  code = code + 1;
  if (code > 90) code = code - 26;
  result += String.fromCharCode(code);
}
```

In English: get the letter's number. If it's an uppercase letter (65–90), add 1 to shift it. If that pushed it past `Z` (90), subtract 26 to wrap back to `A`. Turn the number back into a letter.

There's a matching block for lowercase (97–122), and an `else` that copies non-letters (spaces, punctuation) through unchanged.

Then comes `rot2` — the *exact same function* with `+ 1` changed to `+ 2`. The comment admits the plan:

```js
// ... imagine rot3 through rot25 here. 23 more copies of the same
// function.
```

Finally, the script prints each attempt and asks *you* to spot the English one:

```js
console.log("shift 1:", rot1(secret));
console.log("shift 2:", rot2(secret));
```

## 4. What's wrong with it (in beginner terms)

**Flaw 1: Copy-paste instead of a parameter.** `rot1` and `rot2` differ by a single number. The plan was 25 copies. Here's how that bites you: a month later you discover the wrap-around has a bug. Now you must fix it in 25 places. You fix 24 and miss one. Now your program works for every shift except 17, and you'll spend an evening finding out why. When two functions differ by one value, that value should be a *parameter* — one function, one place to fix bugs.

The README calls this the **rule of three**: one copy is fine, a second copy is a warning, a third means stop and generalize.

**Flaw 2: The human is part of the machine.** The program's last step is "now YOU read 25 lines and find the English one." That works once. But what if you need to crack 500 messages? Or crack one inside a bigger program, at 3am, with nobody watching? A program that ends with "then a person eyeballs it" can't be automated or tested. The fix: teach the program to recognize English — which turns out to need only a list of 20 common words.

## 5. Try it yourself first!

Try fixing the original before reading on. Hints, vaguest first:

1. Two functions differ by one number. What language feature turns a hard-coded number into a blank you fill in?
2. Write `caesarShift(str, shift)` — copy `rot1`, replace every `1` used for shifting with `shift`.
3. Careful with wrap-around: `code + shift` can overshoot `Z` by more than before. `(offset + shift) % 26` is safer than `if (code > 90)`.
4. To auto-detect English: split the decoded text into words, count how many appear in a list like `["the","and","to","of","a","in"]`. More matches = more English.
5. Loop `shift` from 0 to 25, decode, score, and keep the best-scoring result in a variable. Return it as an object: `{ shift, plaintext, score }`.

## 6. Understanding the refactored solution

The refactor is split into three files, each with one job.

**`caesar.js` — the shifting machine.**

```js
export function caesarShift(text, shift) {
  const wrapped = ((shift % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE;
  return text.replace(/[a-z]/gi, (letter) => {
    const base = letter <= 'Z' ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
    const offset = letter.charCodeAt(0) - base;
    return String.fromCharCode(base + (offset + wrapped) % ALPHABET_SIZE);
  });
}
```

- The **double-modulo trick**: `((shift % 26) + 26) % 26`. Remember `-3 % 26` is `-3` in JavaScript? This idiom forces any shift — negative, huge, whatever — into the range 0–25. Worth memorizing.
- `text.replace(/[a-z]/gi, ...)` finds every letter and replaces it using the little arrow function. Non-letters are untouched automatically — no `else` branch needed.
- `base` is 65 for uppercase, 97 for lowercase. `offset` is the letter's position in the alphabet (0–25). Shift the offset, wrap with `%`, convert back.
- `rot13` from project 03 is now one line: `caesarShift(text, 13)`. The special case falls out of the general one.

**`solver.js` — the English detector and the cracker.**

```js
export function englishScore(text) {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.filter((word) => COMMON_WORDS.has(word)).length;
}
```

`split(/[^a-z]+/)` splits on anything that *isn't* a letter, giving clean words. `filter(Boolean)` drops empty strings. Then count words found in the `COMMON_WORDS` set. The score is just "how many common English words appear."

```js
export function crack(ciphertext) {
  let best = { shift: 0, plaintext: ciphertext, score: -1 };
  for (let shift = 0; shift < 26; shift++) {
    const plaintext = caesarShift(ciphertext, shift);
    const score = englishScore(plaintext);
    if (score > best.score) best = { shift, plaintext, score };
  }
  return best;
}
```

This reads like the plan you'd say out loud: try every shift, score each result, keep the best. Starting `score` at `-1` guarantees even a zero-scoring candidate replaces the placeholder. Crucially, `crack` **returns data** instead of printing — so tests and other code can use the result.

**`cli.js` — the thin printing layer.** It grabs your message from `process.argv[2]` (or uses a default via `??`), calls `crack`, and prints. All the `console.log` lives here, none in the logic files.

**The tests (`solver.test.js`).** Node has a built-in test runner. Each `test(name, fn)` runs `fn`; `assert.equal(a, b)` fails loudly if `a` and `b` differ. Highlights:

- `caesarShift(caesarShift('Attack at dawn!', 7), -7)` must give back the original — shifting forward then backward is a round trip. Negative shifts work thanks to the double-modulo.
- `crack(caesarShift(plaintext, 3))` must recover the plaintext with shift **23** — because *undoing* a shift of 3 means shifting 23 more (3 + 23 = 26, a full loop).

## 7. Words you learned (glossary)

- **Caesar cipher**: a code that shifts every letter by a fixed amount.
- **Character code**: the number a computer uses to store a letter (`A` = 65).
- **Parameter**: a named blank in a function, filled in at call time.
- **`%` (remainder/modulo)**: the leftover after division; used for wrap-around.
- **Double-modulo idiom**: `((n % 26) + 26) % 26` — forces a result into 0–25 even for negative `n`.
- **Rule of three**: generalize on the third copy, not the first.
- **Object**: a bundle of named values, like `{ shift: 3, score: 5 }`.
- **Destructuring**: unpacking object values into variables in one line.
- **Set**: a collection optimized for "does it contain X?" checks.
- **Regular expression (regex)**: a text-matching pattern like `/[a-z]/gi`.
- **Module / `import` / `export`**: files sharing functions with each other.
- **`process.argv`**: the array of words typed after `node` on the command line.
- **`??`**: "use left side unless it's missing, then use right side."
- **Arrow function**: compact function syntax, `x => x * 2`.
- **Assertion**: a test statement that crashes if a claimed fact is false.
- **Plaintext / ciphertext**: the readable message / the scrambled message.

## 8. Experiments to try on the plane (no internet needed)

1. **Break the scoring.** In `solver.js`, delete `'the'` from `COMMON_WORDS` and run the tests (`node --test 04-caesar-solver/`). Does `crack` still find the fox sentence? (It should — other common words still match — but the score drops.)
2. **Prove the double-modulo matters.** In `caesar.js`, change the `wrapped` line to just `shift % ALPHABET_SIZE`, then run the tests. The negative-shift test should fail. Put it back.
3. **Crack your own message.** Encode a sentence by hand with `caesarShift` in `cli.js` temporarily (`console.log(caesarShift("your sentence here", 5))`), then feed the output to `node refactored/cli.js "..."`. Does it recover your sentence?
4. **Show the runner-up.** In `crack`, collect *all* 26 candidates into an array and return the top two by score. Update `cli.js` to print both. This works because `crack` returns data — imagine doing this with the original's `console.log` spray.
5. **Trick the detector.** Find a short ciphertext where `crack` picks the *wrong* shift (very short messages with no common words are good candidates — try cracking `"xyz"`). Why does it fail? What would fix it?
