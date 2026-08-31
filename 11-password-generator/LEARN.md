# 📘 Learning Guide: Password Generator

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A function that invents random passwords. You tell it how long the password should be and which kinds of characters to include (lowercase letters, UPPERCASE letters, digits, symbols like `!@#`), and it hands back a random string:

```
generatePassword({ length: 12 })                    → "kR7!mQ2@xW9z" (random each time)
generatePassword({ length: 8, symbols: false })     → "aB3kX9mQ"
```

There's also an option to skip "ambiguous" characters — ones that look alike, such as the letter `l` and the digit `1`, or the letter `O` and the digit `0` — so nobody misreads the password off a sticky note.

## 2. Concepts you need first

### Function parameters and arguments
A **parameter** is a named slot in a function definition; an **argument** is the value you pass in when calling it:

```js
function greet(name) {       // name is a parameter
  console.log("Hi " + name);
}
greet("Sam");                // "Sam" is an argument → prints: Hi Sam
```

### `undefined` and missing arguments
If you call a function with fewer arguments than it has parameters, the leftovers become `undefined` — JavaScript does **not** complain:

```js
function show(a, b) { console.log(a, b); }
show(1); // prints: 1 undefined
```

This "forgiveness" is exactly what makes the original code dangerous.

### Booleans, truthy, and falsy
A **boolean** is `true` or `false`. But in an `if`, JavaScript accepts *any* value and treats it as **truthy** (acts like true) or **falsy** (acts like false). `undefined`, `0`, and `""` are all falsy:

```js
if (undefined) { console.log("yes"); } else { console.log("no"); }
// prints: no
```

So a forgotten boolean argument silently acts like `false`.

### Objects
An **object** groups named values (each name is a **key**):

```js
const options = { length: 12, symbols: false };
console.log(options.length);  // 12
console.log(options.symbols); // false
```

### Destructuring with defaults — the "options object" pattern
**Destructuring** unpacks an object into variables. You can give each variable a **default** used when the key is missing:

```js
function demo({ size = 10, loud = false } = {}) {
  console.log(size, loud);
}
demo({ loud: true }); // prints: 10 true
demo();               // prints: 10 false  (the "= {}" makes even NO argument work)
```

That trailing `= {}` says: "if the caller passed nothing at all, pretend they passed an empty object." This whole shape is the standard JavaScript way to take many named options.

### Random numbers: `Math.random` and `Math.floor`
`Math.random()` returns a random decimal from 0 up to (but not including) 1. `Math.floor` chops off the decimal part. Together they pick a random array/string position:

```js
const pool = "abc";
const index = Math.floor(Math.random() * pool.length); // 0, 1, or 2
console.log(pool[index]); // random letter: a, b, or c
```

### String indexing and concatenation
`"abc"[0]` is `"a"` — strings can be read by position like arrays. `+` glues strings together (**concatenation**): `"ab" + "cd"` is `"abcd"`.

### Arrays: `filter`, `map`, `join`, and spread
- `filter` keeps items passing a test; `map` transforms each item; `join` glues an array into a string:

```js
console.log([1, 2, 3, 4].filter(n => n > 2)); // [3, 4]
console.log([1, 2, 3].map(n => n * 10));      // [10, 20, 30]
console.log(["a", "b"].join(""));             // "ab"
```

- The **spread operator** `...` unpacks a thing into individual items. Spreading a string gives its characters; spreading arrays into `[ ]` combines them:

```js
console.log([..."abc"]);          // ["a", "b", "c"]
console.log([...[1, 2], ...[3]]); // [1, 2, 3]
```

### `Object.keys`
Gives you an object's key names as an array:

```js
console.log(Object.keys({ a: 1, b: 2 })); // ["a", "b"]
```

### `Set`
A **Set** is a collection of unique values with a fast `has` check:

```js
const bad = new Set(['l', '1']);
console.log(bad.has('1')); // true
console.log(bad.has('x')); // false
```

### `Array.from` with a length
`Array.from({ length: n }, fn)` builds an n-item array by calling `fn` once per slot — a neat "do this n times, collect results" tool:

```js
const threes = Array.from({ length: 4 }, () => 3);
console.log(threes); // [3, 3, 3, 3]
```

### Swapping with destructuring
`[x, y] = [y, x]` swaps two variables in one line — used by the shuffle below.

### The Fisher–Yates shuffle
Shuffling an array *fairly* (every ordering equally likely) is famously easy to get wrong. **Fisher–Yates** is the standard correct recipe: walk from the last position down to the second, and swap each position with a randomly chosen position at or before it.

### Dependency injection (the `rng` trick)
Code that calls `Math.random()` directly gives different answers every run — impossible to test exactly. The fix: accept the random function as a parameter (default it to `Math.random`). Tests can pass a fake, predictable one. Handing a function its tools from outside is called **dependency injection**. (`rng` = random number generator.)

```js
function roll(rng = Math.random) { return Math.floor(rng() * 6) + 1; }
console.log(roll(() => 0));    // always 1 — predictable for tests
```

### `throw`, tests, and regex matching
`throw new Error("msg")` stops the function loudly. In tests, `assert.throws(fn)` checks a call fails; `assert.match(str, /[0-9]/)` checks a string contains at least one digit (a **regular expression** — a text pattern; `[0-9]` means "any digit", `[a-z]` means "any lowercase letter").

## 3. Walking through the original code

```js
function generatePassword(length, useUpper, useNumbers, useSymbols, noAmbiguous) {
  var chars = "abcdefghijklmnopqrstuvwxyz";
```

Five positional parameters — one number, four booleans. `chars` starts as the lowercase alphabet; lowercase is always included.

```js
  if (useUpper == true) {
    chars = chars + "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  if (useNumbers == true) {
    chars = chars + "0123456789";
  }
```

Each enabled flag concatenates more characters onto the one big `chars` string. (Same for symbols.) The pool is built *inside* the logic by string gluing.

```js
  if (noAmbiguous == true) {
    var cleaned = "";
    for (var i = 0; i < chars.length; i++) {
      if (chars[i] != "l" && chars[i] != "1" && chars[i] != "O" && chars[i] != "0") {
        cleaned += chars[i];
      }
    }
    chars = cleaned;
  }
```

A cleanup loop rebuilds `chars` character by character, skipping the four look-alikes. Notice the four hand-written `!=` comparisons welded into the middle of the function.

```js
  var password = "";
  for (var j = 0; j < length; j++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
```

The actual generation: `length` times, pick one random character from the pool and append it. Every pick is independent and uniform over the whole pool — remember that, it's Flaw 2.

```js
console.log(generatePassword(12, true, false, true, true));
```

The call site. Quick — is that "no numbers, yes symbols" or the reverse? You can't know without counting parameters against the definition.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: Boolean-flag soup.** `generatePassword(12, true, false, true, true)` is unreadable — the trues and falses mean nothing at the call site. Here's how it bites: six months from now you (or a teammate) write `generatePassword(12, true, true, false)` — *four* arguments instead of five. Which one did you forget? JavaScript won't tell you: the missing fifth becomes `undefined`, which is falsy, so `noAmbiguous` silently turns off. No error. No warning. The bug ships, and a user squints at a password wondering if that's `O` or `0`. Swapping two flags is equally invisible. The original file demos both bugs — they run "fine."

**Flaw 2: The digit that's only *probably* there.** Enabling `useNumbers` only adds digits to the pool; each character pick is random over everything. An 8-character password from a 62-character pool has a real chance (about 1 in 4!) of containing *zero* digits. Story: your signup form says "password must contain a digit." Your generator makes one. Usually it passes. Sometimes it doesn't — and the "sometimes" makes it horrible to debug, because when you try to reproduce it, it works. Bugs born from "probably fine" randomness only show up when you're not looking.

**Flaw 3: Pools glued into the logic.** Want to add a "hex only" pool or Greek letters? You must edit the function body and add a fifth boolean (making Flaw 1 worse). Data you might extend belongs in a table, not in code.

**Flaw 4 (bonus): Impossible requests aren't rejected.** Ask for every pool disabled or a length too small, and the original either misbehaves or lies rather than saying "that's impossible."

## 5. Try it yourself first!

Try improving the original before reading on. Hints, vaguest first:

1. What if the caller could *name* each option instead of remembering an order?
2. Could the character pools live in one data structure, outside the function, so adding a pool is one line?
3. "Must contain a digit" is a guarantee. Random picks give probabilities. How do you *construct* a guarantee? (Hint: what if you deliberately picked one character from each enabled pool first?)
4. If the guaranteed picks always went first, positions 1–4 would be predictable (bad for a password!). What operation fixes "predictable positions"?
5. Concretely: signature `function generatePassword({ length = 16, lowercase = true, uppercase = true, digits = true, symbols = true, excludeAmbiguous = false } = {})`. Pools in a `POOLS` object. Filter to enabled pools; throw if none, or if `length` < number of enabled pools. Pick one char per pool, fill the rest from all pools joined, shuffle, `join('')`.

## 6. Understanding the refactored solution

```js
const POOLS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*',
};
const AMBIGUOUS = new Set(['l', '1', 'O', '0']);
```

The pools are now **data** at the top of the file. Adding a pool = adding a line. The ambiguous characters are a `Set` — a named, checkable list instead of four `!=` comparisons buried in a loop.

```js
export function generatePassword({
  length = 16,
  lowercase = true,
  ...
  rng = Math.random,
} = {}) {
```

The options object with defaults. Call sites now read like configuration: `generatePassword({ length: 16, symbols: false })`. There is no argument order to get wrong, a misspelled option doesn't silently disable a neighbor, and anything omitted gets a sensible default. `rng` is the injectable random function from section 2.

```js
  const enabled = { lowercase, uppercase, digits, symbols };
  const activePools = Object.keys(POOLS)
    .filter((name) => enabled[name])
    .map((name) => filterPool(POOLS[name], excludeAmbiguous));
```

Take each pool name, keep the ones the caller enabled, and run each surviving pool through `filterPool` — which returns the pool untouched unless `excludeAmbiguous` is on, in which case it drops characters found in the `AMBIGUOUS` set. The cleanup loop became a tiny, separate, testable helper.

```js
  if (activePools.length === 0) {
    throw new Error('At least one character pool must be enabled');
  }
  if (length < activePools.length) {
    throw new Error(...);
```

Impossible requests fail *loudly and immediately*: no pools means there's nothing to pick from; `length: 2` can't contain one character from each of 4 pools. The original would misbehave; the refactor explains.

```js
  const pick = (pool) => pool[Math.floor(rng() * pool.length)];
  const allChars = activePools.join('');
  const chars = [
    ...activePools.map(pick),
    ...Array.from({ length: length - activePools.length }, () => pick(allChars)),
  ];
```

The guarantee, *constructed*: first, `activePools.map(pick)` takes exactly one random character from **each** enabled pool — so a digit is now certain, not probable. Then `Array.from` fills the remaining slots with picks from all pools combined. The two spreads merge both batches into one array.

```js
  return shuffle(chars, rng).join('');
```

Without this, every password would start with lowercase-then-uppercase-then-digit-then-symbol — a pattern attackers could exploit. `shuffle` is Fisher–Yates (walk backwards, swap each position with a random earlier-or-same position, using the one-line destructuring swap) — extracted as a named helper so the main function stays readable.

**The tests:** length is checked directly. The star is the guarantee test: it generates **200** passwords and asserts each contains a lowercase, an uppercase, a digit, and a symbol via `assert.match(password, /[0-9]/)` etc. One run passing could be luck; 200 runs is how you test a *promise about randomness* — hammer it. Similar loops verify disabled pools never appear and ambiguous characters are truly gone. Finally, `assert.throws` confirms both impossible requests actually throw.

## 7. Words you learned (glossary)

- **Parameter / argument**: the named slot in a definition / the value passed at the call.
- **Boolean**: `true` or `false`.
- **Truthy / falsy**: how any value behaves in an `if`; `undefined` is falsy.
- **`undefined`**: the value of anything not supplied or not set.
- **Options object**: a single object argument with named settings, replacing many positional parameters.
- **Destructuring**: unpacking an object (or array) into variables, optionally with defaults.
- **Concatenation**: gluing strings with `+`.
- **Pool**: the set of characters a random pick draws from.
- **Spread (`...`)**: unpacks a string/array into individual items.
- **`Set`**: a collection of unique values with a fast `has()` membership check.
- **`Array.from({length: n}, fn)`**: build an array by running `fn` n times.
- **Fisher–Yates shuffle**: the standard fair way to randomize an array's order.
- **Dependency injection**: passing a function its tools (like the random generator) as parameters.
- **`rng`**: random number generator — here, a function returning a random decimal in [0, 1).
- **Regular expression (regex)**: a text pattern; `/[0-9]/` matches any digit.
- **Assertion**: a test statement (`assert.match`, `assert.throws`) that fails loudly when a claim is false.
- **Ambiguous characters**: look-alikes such as `l`/`1` and `O`/`0`.

## 8. Experiments to try on the plane (no internet needed)

1. **Read the trap yourself**: in `original.js`, work out what `generatePassword(12, true, true, false)` actually does. (Expected: `useSymbols` is `false` and `noAmbiguous` is `undefined` → falsy → ambiguity cleanup silently off. The forgotten flag was the last one.)
2. **Add a pool** to `refactored/password.js`: `hexUpper: 'ABCDEF'` in `POOLS`, plus `hexUpper = true` in the destructured options and in the `enabled` object. Generate a password — with all pools on, every password now must contain at least one of `ABCDEF`.
3. **Make it predictable**: call `generatePassword({ length: 8, rng: () => 0 })` (add a temporary `console.log` in a scratch file that imports it). Predict first: with `rng` always 0, every `pick` takes character 0, and the shuffle always swaps position i with position 0. Run the logic in your head and check.
4. **Break the guarantee on purpose**: comment out the `...activePools.map(pick)` line and change the fill count to `length`. Which test fails? (Expected: "guarantees one character from every pool" — though it may take a few of the 200 iterations to catch it. That's exactly why the test loops.)
5. **Tighten a rule**: change `AMBIGUOUS` to also include `'I'` (capital i). Predict which test still passes and which behavior changes. (The existing ambiguity test only checks `l1O0`, so it passes — write a stronger assertion yourself: `assert.doesNotMatch(password, /[l1O0I]/)`.)
