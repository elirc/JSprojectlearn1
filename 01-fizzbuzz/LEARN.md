# 📘 Learning Guide: FizzBuzz

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

FizzBuzz is a classic counting game turned into a program. The program counts from 1 to 100 and prints one line per number, but with three special rules:

- If the number divides evenly by 3, print `Fizz` instead of the number.
- If it divides evenly by 5, print `Buzz` instead.
- If it divides evenly by *both* 3 and 5, print `FizzBuzz`.

So when you run it, the output starts like this:

```
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
```

That's the whole program. It sounds trivial, but it's the perfect place to learn the single most important habit in this repo: keeping "figuring out the answer" separate from "printing the answer."

## 2. Concepts you need first

### Variables: `var`, `let`, and `const`
A **variable** is a named box that holds a value. JavaScript has three keywords to create one:

```js
var oldStyle = 1;   // the old way — avoid it (you'll see why below)
let counter = 2;    // a box whose contents you plan to change
const name = "Sam"; // a box you promise not to reassign
```

`let` and `const` are "block-scoped": they only exist inside the nearest pair of `{ }` curly braces. `var` ignores those braces and leaks out — a common source of confusing bugs.

### The `%` operator (remainder / modulo)
`a % b` gives you the **remainder** after dividing `a` by `b`:

```js
console.log(10 % 3); // 1  (10 ÷ 3 = 3, remainder 1)
console.log(9 % 3);  // 0  (divides evenly — no remainder)
console.log(7 % 5);  // 2
```

The key trick: `n % 3 === 0` means "n is a multiple of 3." That's how FizzBuzz detects its special numbers.

### `if` / `else if` / `else`
These let a program choose between paths:

```js
const n = 7;
if (n > 10) {
  console.log("big");
} else if (n > 5) {
  console.log("medium"); // this one prints
} else {
  console.log("small");
}
```

Only the *first* condition that is true runs; the rest are skipped.

### `==` vs `===` (loose vs strict equality)
Both ask "are these equal?" but `==` first tries to *convert* the values to the same type. That conversion is called **type coercion**, and it causes surprises:

```js
console.log("3" == 3);  // true  — the string "3" gets converted to a number
console.log("3" === 3); // false — different types, so not equal
```

`===` (strict equality) never converts. Always use `===` so a comparison means exactly what it says.

### `for` loops
A **loop** repeats code. A `for` loop has three parts: start, keep-going condition, and step:

```js
for (let i = 1; i <= 3; i++) {
  console.log(i);
}
// prints 1, then 2, then 3
```

`i++` means "add 1 to i." The loop body runs once for each value of `i`.

### Functions and return values
A **function** is a reusable chunk of code. It can take inputs (called **parameters**) and hand back a result with `return`:

```js
function double(n) {
  return n * 2;
}
console.log(double(4)); // 8
```

The crucial idea: `return` gives the answer *back to the code that called the function*. It does not print anything. Printing is what `console.log` does.

### Pure functions
A **pure function** is a function that (1) always returns the same output for the same input, and (2) does nothing else — no printing, no changing outside variables. `double` above is pure. Pure functions are easy to test: call them, check the answer.

### Arrays, `push`, and `join`
An **array** is an ordered list of values:

```js
const parts = [];        // empty list
parts.push("Fizz");      // add to the end → ["Fizz"]
parts.push("Buzz");      // → ["Fizz", "Buzz"]
console.log(parts.join("")); // "FizzBuzz" — glue items together with "" between
console.log(parts.length);   // 2 — how many items are in it
```

### The ternary operator `? :`
A one-line shortcut for if/else that *produces a value*:

```js
const age = 20;
const label = age >= 18 ? "adult" : "minor";
console.log(label); // "adult"
```

Read it as: "condition ? value-if-true : value-if-false."

### `String(n)`
Converts a value to a string (text): `String(7)` gives `"7"`. FizzBuzz returns text either way, so plain numbers get converted too — that keeps the function's output type consistent.

### Modules: `export` and `import`
A **module** is a file that shares code with other files. `export` marks what a file offers; `import` pulls it in:

```js
// math.js
export function add(a, b) { return a + b; }

// main.js
import { add } from './math.js';
console.log(add(2, 3)); // 5
```

This lets you split "the rules" and "the printing" into different files.

### Automated tests, `assert`, and `node:test`
A **test** is code that checks other code automatically. Node.js (the program that runs JavaScript outside a browser) has testing built in:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('math still works', () => {
  assert.equal(2 + 2, 4); // passes silently; would scream if wrong
});
```

`assert.equal(a, b)` throws an error if `a` and `b` differ. You run all tests with `node --test`, and it prints a pass/fail report. `assert.deepEqual` is the array/object version — it compares *contents*, not just identity.

## 3. Walking through the original code

The whole original is one loop:

```js
for (var i = 1; i <= 100; i++) {
```

Count `i` from 1 up to 100, one step at a time. (Note it uses `var` — remember, that's the leaky old keyword.)

```js
  if (i % 3 == 0 && i % 5 == 0) {
    console.log("FizzBuzz");
```

`&&` means "and". So: if `i` divides evenly by 3 AND by 5, print `FizzBuzz`. This case has to come *first* — if the "divisible by 3" check ran first, 15 would print `Fizz` and never reach here.

```js
  } else if (i % 3 == 0) {
    console.log("Fizz");
  } else if (i % 5 == 0) {
    console.log("Buzz");
```

Otherwise, check the single rules one at a time and print the matching word.

```js
  } else {
    console.log(i);
  }
}
```

If no rule matched, print the number itself. That's it — correct output, 100 lines printed.

## 4. What's wrong with it (in beginner terms)

**1. You can't test it.** Every branch ends in `console.log` — the code *decides* and *prints* in the same breath. There is no function you can call and no return value you can check. The only way to verify it is to run it and read 100 lines with your own eyes. Here's how that bites you: imagine your teammate "optimizes" the loop next month and accidentally makes 15 print `Fizz`. Nothing fails. No alarm rings. The bug ships, because eyeballs were the only test and nobody re-read line 15.

**2. `var` leaks.** After the loop ends, `i` still exists and equals 101. In a 15-line file, harmless. In a 500-line file, some *other* code accidentally reads or overwrites that leftover `i`, and you spend an evening finding out why. `let` makes the variable exist only inside the loop, so the mistake becomes impossible.

**3. `==` lies to you.** `"3" == 3` is `true`. Today the loop only compares numbers to numbers, so nothing breaks. But the day this code starts receiving input from a text box or a file (which arrives as *strings*), `==` will quietly "work" by coercion and hide a type bug. `===` would have exposed it immediately.

**4. The combined branch is duplication.** `i % 3 == 0 && i % 5 == 0` re-states the 3-rule and the 5-rule. Now imagine the boss says: "also print `Bazz` for multiples of 7." With this branch style you need branches for 3+5+7, 3+5, 3+7, 5+7, 3, 5, 7, and none — **8 branches for 3 rules**, and 16 for 4 rules. It doubles every time. That's the "combination explosion" the README mentions.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Could you rewrite this so some part of it *returns* an answer instead of printing it?
2. 🌿 Write a function `fizzbuzz(n)` that takes ONE number and returns the right *string*. Keep the loop separate — its only job becomes calling the function and printing.
3. 🌳 Can you handle the "FizzBuzz" case *without* a combined `&&` condition? Hint: what if you built the answer out of pieces — start with an empty string or array, add `"Fizz"` if divisible by 3, add `"Buzz"` if divisible by 5?
4. 🍎 Full recipe: make an empty array. `if (n % 3 === 0)` push `"Fizz"`. `if (n % 5 === 0)` push `"Buzz"` (two separate `if`s, no `else`!). If the array has anything in it, `join('')` and return that; otherwise return `String(n)`.

## 6. Understanding the refactored solution

The refactor splits one file into three, each with one job.

**`fizzbuzz.js` — the rules.** Never prints anything.

```js
export function fizzbuzz(n) {
  const parts = [];
  if (n % 3 === 0) parts.push('Fizz');
  if (n % 5 === 0) parts.push('Buzz');
  return parts.length > 0 ? parts.join('') : String(n);
}
```

This is the "build up parts" pattern. For 15, *both* ifs fire, the array becomes `['Fizz', 'Buzz']`, and `join('')` glues it into `"FizzBuzz"` — the combined case falls out for free, no `&&` branch needed. Adding a "Bazz for 7" rule is literally one new line. The ternary at the end says: if any rule matched, return the glued words; otherwise return the number as a string.

```js
export function fizzbuzzRange(start, end) {
  const lines = [];
  for (let n = start; n <= end; n++) {
    lines.push(fizzbuzz(n));
  }
  return lines;
}
```

The loop moved here — but notice it still doesn't print. It collects the answers into an array and *returns* them. Also testable!

**`cli.js` — the printing.** CLI stands for "command-line interface" — the part you actually run in a terminal:

```js
import { fizzbuzzRange } from './fizzbuzz.js';
console.log(fizzbuzzRange(1, 100).join('\n'));
```

Two lines. `'\n'` is the newline character, so joining with it puts each answer on its own line. As the comment in the file says, this file is "deliberately too simple to contain bugs."

**`fizzbuzz.test.js` — the proof.** Each test calls the pure function and asserts on the return value:

```js
test('multiples of both are FizzBuzz', () => {
  assert.equal(fizzbuzz(15), 'FizzBuzz');
  assert.equal(fizzbuzz(45), 'FizzBuzz');
});
```

`test(name, fn)` registers a named check. When you run `node --test`, Node runs every registered test and reports which passed. The last test uses `assert.deepEqual` to compare a whole array at once:

```js
assert.deepEqual(fizzbuzzRange(1, 5), ['1', '2', 'Fizz', '4', 'Buzz']);
```

Now the teammate who breaks the 15-case gets an immediate red ❌ — the exact protection the original could never have.

## 7. Words you learned (glossary)

- **Variable** — a named box holding a value.
- **Block scope** — a variable existing only inside its `{ }` braces (`let`/`const` do this; `var` doesn't).
- **`%` (modulo/remainder)** — remainder after division; `n % 3 === 0` means "n is a multiple of 3."
- **Type coercion** — JavaScript auto-converting one type to another, as `==` does.
- **Strict equality (`===`)** — comparison with no conversion; use it always.
- **Function** — reusable chunk of code that can take inputs and `return` a result.
- **Parameter** — a function's named input.
- **Return value** — the answer a function hands back to its caller.
- **Pure function** — same input → same output, with no side effects (no printing, no changing outside state).
- **Side effect** — anything a function does besides returning a value (printing, writing files, etc.).
- **Array** — an ordered list of values; `push` adds, `join` glues into a string, `length` counts.
- **Ternary (`? :`)** — one-line if/else that produces a value.
- **Module** — a file that `export`s code for other files to `import`.
- **CLI** — command-line interface; the thin file you run in a terminal.
- **Test** — code that automatically checks other code.
- **`assert`** — a check that throws an error when a value isn't what you expected.
- **`\n`** — the newline character.

## 8. Experiments to try on the plane (no internet needed)

Edit the files, then run `node --test 01-fizzbuzz/` or `node 01-fizzbuzz/refactored/cli.js` to see results.

1. **Add a rule.** In `fizzbuzz.js`, add `if (n % 7 === 0) parts.push('Bazz');`. Expected: `fizzbuzz(21)` returns `"FizzBazz"`, `fizzbuzz(105)` returns `"FizzBuzzBazz"`. Notice it took ONE line — then count how many lines the same change would take in `original.js`.
2. **Break it on purpose.** Change `n % 3` to `n % 4` and run the tests. Expected: several tests fail with clear messages showing expected vs actual. This is what a safety net feels like.
3. **Change the range.** In `cli.js`, change `fizzbuzzRange(1, 100)` to `(1, 15)`. Expected: 15 lines ending in `FizzBuzz`, and *zero* tests break — because printing and rules are separate.
4. **Prove `var` leaks.** In a scratch file, write `for (var i = 0; i < 3; i++) {}` then `console.log(i);` → prints `3`. Swap `var` for `let` → crash: `i is not defined`. The crash is the *good* outcome.
5. **Write your own test.** Add to the test file: `test('100 is Buzz', () => { assert.equal(fizzbuzz(100), 'Buzz'); });`. Expected: it passes. You've just written your first test from scratch.
