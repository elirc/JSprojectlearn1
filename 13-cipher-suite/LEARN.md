# 📘 Learning Guide: Cipher Suite

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A small command-line tool that scrambles text (encrypts it) and unscrambles it (decrypts it) using classic letter-substitution tricks called **ciphers**.

You run it from a terminal like this:

```
node original.js encrypt caesar "hello" 3
```

and it prints:

```
khoor
```

Each letter moved forward 3 places in the alphabet (h→k, e→h, l→o, o→r). Running `decrypt` with the same shift turns `khoor` back into `hello`. The tool supports several ciphers: **caesar** (shift by a number), **atbash** (a↔z, b↔y — mirror the alphabet), **reverse** (flip the whole string), and in the refactor, **rot13** (shift by 13) and **vigenère** (shift each letter by a different amount, taken from a keyword).

## 2. Concepts you need first

### Running JavaScript with Node.js
JavaScript doesn't only live in web pages. **Node.js** is a program that runs `.js` files directly from your terminal. `node myfile.js` runs the file; `console.log(...)` prints to the terminal instead of a browser.

### Command-line arguments and `process.argv`
When you type `node original.js encrypt caesar hello 3`, the extra words are **arguments**. Node collects them in an array called `process.argv`:

```js
// node original.js encrypt caesar hello 3
console.log(process.argv[2]); // "encrypt"
console.log(process.argv[3]); // "caesar"
console.log(process.argv[4]); // "hello"
```

Slots 0 and 1 hold the paths to node itself and to your file, so *your* arguments start at index 2.

### Character codes: `charCodeAt` and `String.fromCharCode`
Computers store letters as numbers. In the standard numbering, `"A"` is 65, `"B"` is 66... and `"a"` is 97, `"b"` is 98.

```js
console.log("a".charCodeAt(0));      // 97 (the number for "a")
console.log(String.fromCharCode(98)); // "b" (the letter for 98)
```

That's how you do alphabet math: turn a letter into a number, add to it, turn it back into a letter.

### The remainder operator `%` (say "mod")
`a % b` gives the remainder after dividing a by b. It makes numbers "wrap around":

```js
console.log(7 % 26);  // 7
console.log(27 % 26); // 1  — went past 26, wrapped back to the start
console.log(-3 % 26); // -3 — careful! JavaScript keeps the minus sign
```

That last line matters: to wrap a possibly-negative number into 0..25 you need the trick `((n % 26) + 26) % 26`.

### Regular expressions and `replace` with a function
A **regular expression** (regex) is a pattern for matching text. `/[a-z]/gi` means "any letter a to z, everywhere in the string (`g` = global), ignoring upper/lower case (`i`)". `text.replace(pattern, fn)` calls your function once per match and swaps in whatever you return:

```js
const shout = "cat".replace(/[a-z]/g, (ch) => ch.toUpperCase());
console.log(shout); // "CAT"
```

This is how the ciphers touch only letters and leave spaces and punctuation alone.

### Objects: bundles of named values (including functions)
An **object** groups related things under one name. Values can even be functions — then we call them **methods**:

```js
const dog = {
  name: "Rex",
  speak: (word) => word + "!",
};
console.log(dog.name);          // "Rex"
console.log(dog.speak("woof")); // "woof!"
```

`(word) => word + "!"` is an **arrow function** — a short way to write a function.

### Bracket lookup: `obj[key]`
You can pick an object's property using a *variable*:

```js
const cipher = { encrypt: (t) => t + "?", decrypt: (t) => t };
const mode = "encrypt";
console.log(cipher[mode]("hi")); // "hi?" — same as cipher.encrypt("hi")
```

The refactored CLI uses exactly this trick so it never writes an if/else for encrypt vs decrypt.

### Useful array methods: `find`, `map`, `join`
```js
const nums = [3, 7, 10];
console.log(nums.find((n) => n > 5));      // 7 (first match, or undefined)
console.log(nums.map((n) => n * 2));       // [6, 14, 20] (new array)
console.log(["a", "b"].join(", "));        // "a, b" (array -> string)
```

Also: `[...("abc")]` — the **spread** syntax — splits a string into an array of characters: `["a","b","c"]`.

### Template literals
Strings written with backticks can embed values with `${...}`:

```js
const name = "caesar";
console.log(`Unknown cipher "${name}"`); // Unknown cipher "caesar"
```

### `throw` and `Error`
`throw new Error("message")` stops the program (or the current operation) with an error. It's how a function says "I can't continue — something is wrong," instead of quietly returning a bad value.

### Modules: `import` and `export`
A **module** is a file that shares some of its values. `export` marks what's shared; `import` pulls it into another file:

```js
// math.js
export const TAX = 0.1;
// app.js
import { TAX } from './math.js';
```

This lets the refactor split "the ciphers" and "the command-line handling" into separate files.

### Automated tests: `node:test` and `assert`
A **test** is code that checks other code. Node has a built-in test runner:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('adding works', () => {
  assert.equal(2 + 2, 4); // passes silently; fails loudly if wrong
});
```

You run all tests in a folder with `node --test foldername/`. `assert.equal(a, b)` fails the test if a and b differ; `assert.throws(fn)` passes only if calling fn throws an error.

## 3. Walking through the original code

**The caesar functions.**

```js
function encryptCaesar(text, shift) {
  return text.replace(/[a-z]/gi, function (ch) {
    var base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(base + (ch.charCodeAt(0) - base + Number(shift)) % 26);
  });
}
```

For every letter: pick the right starting number (`65` for capitals, `97` for lowercase — the `ch <= "Z"` comparison works because capital letters come before lowercase in character-code order). Then `ch.charCodeAt(0) - base` converts the letter to a position 0–25, we add the shift, `% 26` wraps past z back to a, and `fromCharCode` converts back to a letter. `Number(shift)` converts the argument (which arrives as the *string* `"3"`) into the number 3.

`decryptCaesar` is the same but shifts backwards. It adds `26 - shift` instead of subtracting, to dodge the negative-remainder problem from section 2.

**Atbash and reverse.**

```js
function decryptAtbash(text) {
  return encryptAtbash(text); // atbash is its own inverse
}
```

Atbash mirrors the alphabet (position p becomes 25 − p), so doing it twice gets you back where you started — decrypt just calls encrypt. Reverse flips the string with `split("").reverse().join("")`: string → array of chars → reversed → string again.

**The dispatch.** ("Dispatch" = the code that decides which function to call.)

```js
if (mode == "encrypt") {
  if (cipher == "caesar") {
    console.log(encryptCaesar(text, key));
  } else if (cipher == "atbash") {
    ...
```

Two big if/else chains — one for encrypt, one for decrypt — each naming every cipher. This is the part the README calls out as the problem.

## 4. What's wrong with it (in beginner terms)

**Adding a cipher touches three places.** Say you add rot13. You must (1) write the functions, (2) add an `else if (cipher == "rot13")` to the *encrypt* chain, (3) add another to the *decrypt* chain. Three edits, in three different spots of the file, that all have to agree.

**Here's how it bites you.** It's late. You write `encryptRot13`, add the encrypt branch, test it — `node original.js encrypt rot13 "secret plan"` prints scrambled text. It works! You encrypt your notes and delete the originals. A week later you run `decrypt rot13` and get... `unknown cipher`. You forgot edit number 3. The scariest bugs are the ones where *half* of a feature works, because the working half convinces you the whole thing is done.

**Knowledge is smeared everywhere.** "What ciphers exist?" has no single answer in this file — the answer is duplicated in the encrypt chain, the decrypt chain, and the function list. Duplicated knowledge drifts out of sync; that's the root disease here.

**No tests.** Nothing automatically checks that decrypt undoes encrypt. You only find out when your own data won't come back.

## 5. Try it yourself first!

Before reading the solution, try to fix the original. Hints, vaguest first:

1. The core question: how could the if/else chains *disappear* entirely?
2. What if each cipher were a single *thing* (one value) instead of two loose functions?
3. An object can hold both functions: `{ encrypt: ..., decrypt: ... }`. What else would the program need to know about a cipher? (Its name? Whether it needs a key?)
4. Put all the cipher objects in one array. Now "which cipher did the user ask for?" is just a search of that array by name — `find` does it in one line.
5. Once you have the cipher object, `mode` is either `"encrypt"` or `"decrypt"`... and `cipherObject[mode](text, key)` calls the right one with no if/else at all.
6. Bonus: write a loop over your array that checks `decrypt(encrypt("Hello!")) === "Hello!"` for every cipher. Congratulations — you wrote a test.

## 6. Understanding the refactored solution

**The interface.** Every cipher in `refactored/ciphers.js` is an object with the same four parts: `name`, `needsKey`, `encrypt`, `decrypt`. A shared shape like this is called an **interface** — a promise about what an object looks like, so other code can use *any* cipher the same way without knowing which one it holds.

**The shared helper.** Caesar, rot13, and vigenère all boil down to "shift letters by n," so that lives once in `shiftLetters`. Note its first line:

```js
const wrapped = ((shift % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE;
```

That's the negative-number-safe wrap. Because of it, `decrypt` for caesar is simply `shiftLetters(text, -key)` — no special backwards formula needed.

**`this` in atbash.** Atbash's decrypt is written as a full method so it can say `return this.encrypt(text)`. Inside a method written with the `name() {}` style, `this` means "the object I live on" — so decrypt reuses encrypt without repeating the mirror math. (Arrow functions don't get their own `this`, which is why this one method isn't an arrow.)

**Vigenère.** Caesar with a twist: the shift for each letter comes from a keyword, repeating. With key "bcd" the shifts are 1, 2, 3, 1, 2, 3... The `letterIndex % shifts.length` expression is what makes the keyword repeat, and `letterIndex` only counts up on letters, so spaces and punctuation don't "use up" key characters.

**The registry.**

```js
export const CIPHERS = [caesar, rot13, atbash, reverse, vigenere];
```

One array = the single source of truth for "what ciphers exist." `getCipher(name)` looks a cipher up with `find`, and if it's missing, it throws an Error whose message *lists the valid names* — built with `map` and `join` from the same array, so the help can never go stale.

**The CLI (`cli.js`).** It never names a cipher. It reads the arguments, prints usage (derived from `CIPHERS`) if they're wrong, checks `needsKey`, then runs `cipher[mode](text, key)` — the bracket-lookup trick doing the work of both old if/else chains in one expression.

**The tests (`ciphers.test.js`).** The star is the loop:

```js
for (const cipher of CIPHERS) {
  test(`${cipher.name}: decrypt(encrypt(x)) === x`, () => { ... });
}
```

It creates one test *per registry entry*, each checking the round-trip rule on several sample strings (including `""` and text with digits and punctuation). Add a cipher next month and it gets tested automatically — you wrote the test before the cipher existed. A rule like "decrypting an encryption gives back the original, for any input" is called a **property test**. A few pinned examples (`caesar('abc', 3) === 'def'`) round it out, so you'd notice if every cipher "round-tripped" by doing nothing at all.

## 7. Words you learned (glossary)

- **Cipher**: a rule for scrambling text so it can be unscrambled later.
- **Encrypt / decrypt**: scramble / unscramble.
- **Node.js**: a program that runs JavaScript files outside a browser.
- **CLI**: command-line interface — a program you control by typing commands.
- **Argument**: extra values you pass to a program or function.
- **`process.argv`**: the array of command-line arguments in Node.
- **Character code**: the number a computer uses to store a letter.
- **Modulo (`%`)**: remainder after division; used to wrap values around.
- **Regular expression (regex)**: a text-matching pattern like `/[a-z]/gi`.
- **Object**: a bundle of named values.
- **Method**: a function stored on an object.
- **Arrow function**: short function syntax, `(x) => x + 1`.
- **`this`**: inside a method, the object the method lives on.
- **Interface**: an agreed shape (set of properties/methods) that many objects share.
- **Registry**: one list that is the official record of "everything that exists."
- **Dispatch**: code that picks which function to run based on a value.
- **Module / import / export**: a file that shares values with other files.
- **Template literal**: backtick string with `${...}` slots.
- **`throw` / Error**: stop with a loud failure instead of returning bad data.
- **Test / assert**: code that automatically checks other code.
- **Property test**: a test of a rule that must hold for *any* input, not one example.
- **Round-trip**: doing an operation and its inverse and getting the original back.

## 8. Experiments to try on the plane (no internet needed)

1. **Add a "double" cipher** to `refactored/ciphers.js`: encrypt repeats every character (`ab` → `aabb`), decrypt keeps every other character. Add it to `CIPHERS`. Expected: `node --test 13-cipher-suite/` now shows a new passing round-trip test, and `cli.js` accepts `double` — with zero edits to the CLI or test files.
2. **Break the contract on purpose**: change rot13's decrypt to `shiftLetters(text, 12)`. Expected: the round-trip test for rot13 fails with a message showing which string didn't survive. Change it back!
3. **Try a huge caesar shift**: `node refactored/cli.js encrypt caesar "hello" 1000`. Expected: still works (1000 wraps to a shift of 12) — thanks to the `wrapped` line. Try the same on `original.js` decrypt and compare.
4. **Ask for a fake cipher**: `node refactored/cli.js encrypt enigma "hi"`. Expected: an error listing the real cipher names. Now add your "double" cipher and run it again — the list updates itself.
5. **Predict, then check**: what is `vigenere` encrypt of `"aaaa"` with key `"ab"`? Work it out on paper (shifts 0,1,0,1) then run it. Expected: `abab`.
