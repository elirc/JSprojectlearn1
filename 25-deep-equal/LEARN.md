# 📘 Learning Guide: Deep Equality Checker

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A function called `deepEqual(a, b)` that answers one question: **do these two values have the same contents?**

```js
deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })  // true  (same contents)
deepEqual({ a: 1 }, { a: 1, b: 2 })        // false (second one has extra stuff)
deepEqual([1, [2, 3]], [1, [2, 3]])        // true  (works on nested arrays too)
```

Running `node original.js` prints a series of `console.log` lines showing a popular shortcut (comparing JSON strings) giving wrong answers. The refactored version gives right answers, and a test file proves it.

## 2. Concepts you need first

### Primitives vs objects

A **primitive** is a simple, single value: a number, a string, a boolean (`true`/`false`), `null`, `undefined`. An **object** is a container that holds other values under named **keys** (also called properties). Arrays are objects too — their keys are just numbers.

```js
const num = 5;                    // primitive
const obj = { name: "Ada" };      // object with one key: "name"
console.log(obj.name);            // Ada
```

### Value vs reference (the big one)

When you compare two primitives with `===`, JavaScript compares the values themselves:

```js
console.log(5 === 5);        // true
console.log("hi" === "hi");  // true
```

But an object variable does not hold the object itself — it holds a **reference**, which is like a home address pointing to where the object lives in memory. `===` on objects asks "is this the *same address*?", not "do these look alike?"

```js
console.log({ a: 1 } === { a: 1 }); // false! Two separate objects.
const x = { a: 1 };
const y = x;                        // y points to the SAME object
console.log(x === y);               // true
```

This is why we need to write `deepEqual` at all. "Deep" means: open the box and compare the contents, and if the contents are boxes too, open those as well.

### `typeof` — asking what kind of thing a value is

`typeof x` gives you a string naming the type:

```js
console.log(typeof 5);         // "number"
console.log(typeof "hi");      // "string"
console.log(typeof { a: 1 });  // "object"
console.log(typeof null);      // "object"  <-- famous JavaScript quirk!
```

That last line is a decades-old bug baked into the language: `null` claims to be an object, but it isn't one. Any code using `typeof x === 'object'` must also check `x !== null`.

### `NaN` — the number that isn't equal to itself

`NaN` means "Not a Number". It appears when math goes wrong (like `0 / 0`). Its weird rule: `NaN === NaN` is `false`.

```js
console.log(NaN === NaN);       // false (!)
console.log(Object.is(NaN, NaN)); // true
```

`Object.is(a, b)` is a built-in comparison that works like `===` but with two repairs: `NaN` equals `NaN`, and `0` is different from `-0`.

### `undefined` vs "the key isn't there"

These look the same when you read them but they are different shapes:

```js
const a = { x: undefined };  // HAS a key called x, whose value is undefined
const b = {};                // has NO key called x
console.log("x" in a);       // true
console.log("x" in b);       // false
```

### `JSON.stringify` — turning data into text

**JSON** is a text format for data. `JSON.stringify` converts a value into a JSON string:

```js
console.log(JSON.stringify({ a: 1 }));         // {"a":1}
console.log(JSON.stringify({ a: undefined })); // {}  <- undefined vanished!
console.log(JSON.stringify({ x: NaN }));       // {"x":null}  <- NaN became null!
```

Those two surprises are the heart of this project's bug.

### Recursion — a function that calls itself

**Recursion** means a function solving a big problem by calling itself on smaller pieces, with a stopping condition (the **base case**):

```js
function countdown(n) {
  if (n === 0) return;   // base case: stop here
  console.log(n);
  countdown(n - 1);      // call myself with a smaller problem
}
countdown(3); // prints 3, 2, 1
```

For deep equality: to compare two objects, compare each key's value — and if a value is itself an object, call `deepEqual` on it. Nesting handles itself.

### `Object.keys`, `.every`, and `Object.hasOwn`

`Object.keys(obj)` gives you an array of the key names. `.every(fn)` asks "does this test pass for every item in the array?" and returns `true`/`false`. `Object.hasOwn(obj, key)` asks "does this object have this key?"

```js
const person = { name: "Ada", age: 36 };
console.log(Object.keys(person));                    // ["name", "age"]
console.log(Object.keys(person).every(k => k.length > 2)); // true
console.log(Object.hasOwn(person, "age"));           // true
```

### Guard clauses

A **guard clause** is an early `return` that handles one case and gets it out of the way, so the rest of the function only deals with what's left. Instead of one giant nested `if`, you get a ladder of small checks.

### `export` / `import` (modules)

A **module** is a file that shares code. `export` marks what a file offers; `import` pulls it into another file. That's how the test file uses the function:

```js
// deep-equal.js:      export function deepEqual(a, b) { ... }
// deep-equal.test.js: import { deepEqual } from './deep-equal.js';
```

### Automated tests

A **test** is code that runs your code and checks the result automatically. Node.js (the program that runs JavaScript outside a browser) has a built-in test runner. `assert.equal(actual, expected)` throws an error if the two don't match — a thrown error makes the test fail.

## 3. Walking through the original code

The original file is a story in four acts. Act one — the discovery:

```js
console.log({ a: 1 } === { a: 1 }); // false?!
```

Two objects with identical contents, but `===` says false, because it compares addresses (references), not contents.

Act two — the internet shortcut:

```js
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
```

The idea: turn both values into text, then compare the text. Strings are primitives, so `===` compares them by value. And it *seems* to work — nested arrays pass!

Act three — the lies. Same contents, different key order, different strings:

```js
console.log(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })); // false. Same object!
```

`{"a":1,"b":2}` is not the same string as `{"b":2,"a":1}`, so we get "falsely unequal". Then the reverse lie — "falsely equal":

```js
console.log(deepEqual({ a: undefined }, {}));    // true. Different objects!
console.log(deepEqual({ x: NaN }, { x: null })); // true?!
```

`undefined` values silently disappear during stringify, and `NaN` turns into the text `null`.

Act four — the crash:

```js
var loop = {}; loop.self = loop;
try { deepEqual(loop, loop); } catch (e) { ... }
```

`loop.self = loop` makes the object contain itself — a **cycle** (a loop in the data). `JSON.stringify` follows keys forever, gives up, and throws an error. The `try { } catch (e) { }` block catches that error so the program doesn't die.

## 4. What's wrong with it (in beginner terms)

**Lie 1: key order matters when it shouldn't.** Imagine your app saves user settings as `{theme: "dark", size: 12}` and later loads them back as `{size: 12, theme: "dark"}` (databases and servers reorder keys freely). Your "did anything change?" check says YES, so your app re-saves, re-renders, or re-uploads for no reason — maybe in an endless loop.

**Lie 2: different objects called equal.** `{a: undefined}` and `{}` are different shapes — one has a key, one doesn't. Code that loops over keys will behave differently on them. Your comparison says "same!", so a real difference sneaks past your tests.

**Lie 3: NaN "equals" null.** A calculation silently broke and produced `NaN`. Your comparison against expected data containing `null` passes anyway. The bug ships.

**The crash:** any data with a cycle (very common in linked structures) kills the whole program instead of returning an answer.

The README's deeper point: a shortcut that's *sometimes* wrong is worse than no shortcut, because you'll trust it right up until the day it burns you — and that day the bug will be baffling.

## 5. Try it yourself first!

Try writing your own `deepEqual(a, b)` before reading the solution. Hints, from vague to specific:

1. Don't convert to text at all. Compare the real values directly.
2. Handle the easy case first: if `a === b` (or better, `Object.is(a, b)`), you're done — return `true`.
3. If either value is not an object (or is `null`), and they weren't equal in step 2, they can't be equal. Return `false`.
4. An array should never equal a plain object. `Array.isArray(x)` tells you which is which.
5. For two objects: get both key lists with `Object.keys`. If the lists have different lengths, return `false`.
6. Then, for every key in `a`: check `b` has that key too, and call `deepEqual` on the two values (recursion!). If all keys pass, return `true`.

## 6. Understanding the refactored solution

The refactor starts with a comment block *writing down its decisions*: NaN equals NaN, `{a: undefined}` does not equal `{}`, key order doesn't matter, Dates compare by their timestamp. Every deep-equal must choose these; writing them down means no teammate has to guess.

```js
if (Object.is(a, b)) return true;
```

First guard clause. This handles all matching primitives, and also two references to the *same* object — which is why comparing a cyclic object to itself works without infinite recursion: we never open the box.

```js
if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
  return false;
}
```

Second guard: past step one, the only hope for equality is two real objects. If either side is a primitive or `null` (remember the `typeof null === "object"` quirk!), give up now.

```js
if (Array.isArray(a) !== Array.isArray(b)) return false;
```

If exactly one side is an array, they're different kinds of thing. This catches `deepEqual([1, 2], { 0: 1, 1: 2 })`, which would otherwise pass the key check!

```js
if (a instanceof Date || b instanceof Date) {
  return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
}
```

A `Date` object stores a moment in time. `instanceof Date` asks "was this built as a Date?" and `.getTime()` gives the timestamp as a plain number. Two Dates are equal if their timestamps match; a Date never equals a non-Date.

```js
const keysA = Object.keys(a);
const keysB = Object.keys(b);
if (keysA.length !== keysB.length) return false;

return keysA.every(
  (key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]),
);
```

The finale. Same number of keys, then: for *every* key of `a`, does `b` also have it, and are the two values deeply equal? The length check plus `hasOwn` covers both directions cheaply — if `b` had a key `a` lacks, the lengths would differ. Note `Object.hasOwn(b, key)` matters because `b[key]` being `undefined` could mean "missing" *or* "present but undefined" — `hasOwn` tells them apart.

**The tests** (`deep-equal.test.js`): each `test('name', () => {...})` block is one claim about how the function behaves — key order ignored, `undefined` vs missing key, NaN rules, nesting, Dates, extra keys, cycles. Run them with `node --test 25-deep-equal/`. Each design decision from the header comment has a test pinning it down, so if someone later "fixes" the function and changes a decision, a test fails and the change gets noticed.

## 7. Words you learned (glossary)

- **Primitive**: a simple single value — number, string, boolean, `null`, `undefined`.
- **Object**: a container of key/value pairs.
- **Key / property**: a named slot inside an object.
- **Reference**: the "address" of an object in memory; what object variables actually hold.
- **Identity**: being the very same object (same address), as opposed to just looking alike.
- **Deep equality**: comparing contents all the way down, including nested objects.
- **`===`**: strict comparison — by value for primitives, by identity for objects.
- **`Object.is`**: like `===` but `NaN` equals `NaN` and `0` differs from `-0`.
- **`NaN`**: "Not a Number", the result of broken math; not `===` to itself.
- **JSON**: a text format for data; `JSON.stringify` converts values to that text.
- **Recursion**: a function calling itself on smaller pieces, with a base case to stop.
- **Base case**: the condition where a recursive function stops calling itself.
- **Guard clause**: an early `return` that removes one case before the main logic.
- **Cycle / cyclic structure**: data that contains a reference back to itself.
- **`typeof`**: operator giving a value's type as a string (with the `null` quirk).
- **`instanceof`**: asks whether an object was built by a given constructor (like `Date`).
- **Module / `export` / `import`**: a file sharing code with other files.
- **Test / assertion**: code that automatically checks your code's answers.
- **Timestamp**: a moment in time stored as a number (milliseconds).

## 8. Experiments to try on the plane (no internet needed)

1. **Break a decision, watch a test catch it.** In `refactored/deep-equal.js`, change `Object.is(a, b)` to `a === b`, then run `node --test 25-deep-equal/`. Expected: the NaN test fails, because `NaN === NaN` is false.
2. **Prove the array guard matters.** Comment out the `Array.isArray` line and run the tests. Expected: the "arrays and objects are different kinds" test fails — `[1,2]` and `{0:1, 1:2}` have the same keys and values!
3. **Add a test of your own.** In the test file, add `test('booleans', () => { assert.equal(deepEqual(true, 1), false); });`. Expected: it passes — `Object.is(true, 1)` is false and the second guard rejects primitives.
4. **Feed it two different cyclic objects.** At the bottom of `original.js` (or a scratch file), build `const p = {}; p.self = p; const q = {}; q.self = q;` and call the *refactored* `deepEqual(p, q)`. Expected: infinite recursion — a "Maximum call stack size exceeded" error. This implementation only survives cycles when both sides are the *same* object. (That's a real, documented limit — a fun one to think about fixing.)
5. **Ask JSON to lie to you one more time.** Try `JSON.stringify(new Date(0))` and `JSON.stringify({})` in a scratch file. Expected: the Date becomes a quoted string like `"1970-01-01T00:00:00.000Z"` — one more type JSON quietly transforms.
