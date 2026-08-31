# 📘 Learning Guide: RPN Calculator

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A calculator that reads math written in a funny order called **Reverse Polish Notation** (RPN). In RPN, the operator (like `+`) comes *after* the two numbers it works on.

- Normal math: `3 + 4`
- RPN: `3 4 +`

Why bother? Because RPN never needs parentheses. `(5 + ((1 + 2) * 4)) - 3` becomes just `5 1 2 + 4 * + 3 -`.

When you run the program, you give it a string like `"3 4 +"` and it prints the answer:

```
calc("3 4 +")             → 7
calc("5 1 2 + 4 * + 3 -") → 14
```

## 2. Concepts you need first

### Strings and `.split()`
A **string** is text in quotes: `"3 4 +"`. The `.split()` method chops a string into an **array** (a list) of smaller strings:

```js
const parts = "3 4 +".split(" ");
console.log(parts); // ["3", "4", "+"]
```

Each piece here is called a **token** — one meaningful chunk of the input.

### Arrays, `push`, and `pop`
An **array** is an ordered list of values. `push` adds to the end; `pop` removes from the end *and hands it back to you*:

```js
const list = [];
list.push(10);      // list is now [10]
list.push(20);      // list is now [10, 20]
const x = list.pop(); // x is 20, list is back to [10]
```

### The stack
A **stack** is just an array you only ever `push` onto and `pop` off of — like a stack of plates: last one on is the first one off. RPN calculators run on a stack: numbers get pushed on; when an operator appears, the last two numbers get popped off, combined, and the result gets pushed back.

Watch `"3 4 +"` happen:
1. See `3` → push it. Stack: `[3]`
2. See `4` → push it. Stack: `[3, 4]`
3. See `+` → pop `4`, pop `3`, push `3 + 4`. Stack: `[7]`

The answer is whatever is left on the stack.

### Popping in reverse order
`pop` gives you the *last* thing pushed. So for `"10 4 -"`, the first pop gives `4` (the *second* number) and the second pop gives `10` (the *first*). That's why the code pops into `b` first, then `a`, and computes `a - b`. Get this backwards and `10 4 -` returns `-6` instead of `6`.

### Loops: `for` and `for...of`
A **loop** repeats code. The old style counts with an index; the newer `for...of` just visits each item:

```js
const tokens = ["3", "4", "+"];
for (const t of tokens) {
  console.log(t); // prints 3, then 4, then +
}
```

### `NaN` — "Not a Number"
When JavaScript tries to do math on something that isn't a number, you get the special value `NaN`:

```js
console.log(5 * undefined); // NaN
console.log(Number("four")); // NaN
```

`NaN` is sneaky: it doesn't crash your program, it just silently poisons every calculation it touches.

### `parseFloat` vs `Number`
Both turn strings into numbers, but they disagree about garbage:

```js
console.log(parseFloat("4abc")); // 4   (reads digits, ignores the rest!)
console.log(Number("4abc"));     // NaN (the whole string must be a number)
console.log(Number.isNaN(Number("4abc"))); // true — a reliable "is this garbage?" check
```

`Number` is stricter, which is what a calculator wants.

### Functions stored as values
In JavaScript a **function** is a value, just like a number. You can store one in a variable or inside an object. An **arrow function** is a short way to write one:

```js
const add = (a, b) => a + b; // same as: function add(a, b) { return a + b; }
console.log(add(2, 3)); // 5
```

### Objects as lookup tables
An **object** maps names (keys) to values. Because functions are values, you can build a table of operations:

```js
const OPERATORS = { '+': (a, b) => a + b, '-': (a, b) => a - b };
console.log(OPERATORS['+'](2, 3)); // 5
console.log('+' in OPERATORS);     // true — `in` asks "does this key exist?"
```

This is the heart of the refactor. Instead of an if-chain asking "is it plus? is it minus?", you look the symbol up in the table.

### `throw` and `Error`
`throw new Error("message")` stops the function immediately and reports a problem. If nobody handles it, the program prints the message and quits. Loud failure — the opposite of a silent `NaN`.

```js
function half(n) {
  if (typeof n !== "number") throw new Error("need a number");
  return n / 2;
}
```

### Regular expressions (just one!)
A **regular expression** (regex) is a pattern for matching text, written between slashes. `/\s+/` means "one or more whitespace characters" (spaces, tabs, newlines). Splitting on it treats any amount of spacing as one gap:

```js
console.log("3   4  +".split(/\s+/)); // ["3", "4", "+"]
console.log("3   4  +".split(" "));   // ["3", "", "", "4", "", "+"] — yuck
```

Those empty strings `""` are dangerous: `Number("")` is `0`, and `parseFloat("")` is `NaN`.

### `.filter(Boolean)` and truthiness
`.filter()` keeps only the array items that pass a test. `Boolean` is a function that answers "is this value **truthy**?" — empty strings are **falsy** (treated as false), so this drops them:

```js
console.log(["3", "", "4"].filter(Boolean)); // ["3", "4"]
```

### `export`, `import`, and modules
A **module** is a file that shares code. `export` marks what a file offers; `import` pulls it into another file. This lets the test file use the calculator without copy-pasting it.

### Automated tests
A **test** is code that checks other code. Node.js has a built-in test tool: `assert.equal(a, b)` fails loudly if `a` isn't `b`, and `assert.throws(fn)` fails unless calling `fn` throws an error. You run them with `node --test`.

## 3. Walking through the original code

```js
function calc(expr) {
  var stack = [];
  var tokens = expr.split(" ");
```

Make an empty stack, then split the input on single spaces. (`var` is the old-fashioned way to declare a variable; modern code uses `const` and `let`.)

```js
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (t == "+") {
      var b = stack.pop();
      var a = stack.pop();
      stack.push(a + b);
    }
```

Walk through the tokens one at a time. If the token is `+`: pop two numbers, add them, push the result. Then the code repeats this **exact same shape** three more times for `-`, `*`, and `/` — five nearly identical lines each, with fresh variable names (`b2`/`a2`, `b3`/`a3`, `b4`/`a4`) because `var` makes reusing names awkward.

```js
    } else {
      stack.push(parseFloat(t));
    }
```

Anything that isn't one of the four operators is *assumed* to be a number and converted with `parseFloat`. No checking.

```js
  return stack.pop();
```

Whatever is on top of the stack at the end is the answer — again, no checking whether the stack has exactly one thing on it.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: Four copies of the same five lines.** The only difference between the `+`, `-`, `*`, `/` branches is one character of math. Here's how this bites you: your boss asks for a `^` (power) operator. You copy-paste a fifth branch and rename the variables to `b5`/`a5`. Next month, someone finds a bug in how operands pop, and now the fix must be made in *five* places — and someone will miss one. Duplicated code means duplicated bugs.

**Flaw 2: Silent failure #1 — missing operand.** `calc("3 +")` pops the `3`, then pops from an *empty* stack, which returns `undefined`. `3 + undefined` is `NaN`. The calculator hands you `NaN` with a straight face. Imagine this buried in a bigger program: the `NaN` flows onward through ten more calculations before anything looks wrong, and you spend an evening hunting where it was born.

**Flaw 3: Silent failure #2 — leftover operand.** `calc("3 4")` pushes both numbers and returns the top one: `4`. That's not an error message — it's a *confident wrong answer*. A user typos an expression and trusts a wrong number. That's the worst thing a calculator can do.

**Flaw 4: Silent failure #3 — garbage input.** `calc("3 four +")` turns `"four"` into `NaN` via `parseFloat` and keeps calculating. And remember `parseFloat("4abc")` returns `4` — so some typos don't even become `NaN`, they become *plausible wrong numbers*.

**Flaw 5: Fragile splitting.** `split(" ")` on `"3  4 +"` (two spaces) creates an empty token, which becomes `NaN`. Real input has messy spacing.

## 5. Try it yourself first!

Before reading section 6, try fixing the original. Hints, vaguest first:

1. The four operator branches differ by only one character. Could you store *the math itself* somewhere, keyed by the symbol?
2. Remember: functions are values. What kind of object maps a string like `"+"` to a function?
3. For each error case (`"3 +"`, `"3 4"`, `"3 four +"`), ask: what would the code *notice* if it checked? (Stack size before popping. Stack size at the end. Whether `Number(token)` is `NaN`.)
4. Concretely: build `const OPERATORS = { '+': (a,b) => a+b, ... }`. In the loop: if `token in OPERATORS`, check the stack has at least 2 items, pop `b` then `a`, push `OPERATORS[token](a, b)`. Otherwise convert with `Number` and throw if `Number.isNaN` says it's garbage. After the loop, throw unless exactly one value remains.
5. For spacing: split with `/\s+/` and `.filter(Boolean)`.

## 6. Understanding the refactored solution

```js
const OPERATORS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '^': (a, b) => a ** b,
};
```

The whole if-chain became a table. Each key is an operator symbol; each value is the function that does that math (`**` is JavaScript's power operator: `2 ** 10` is `1024`). Adding `^` cost **one line** — compare that to a five-line copy-pasted branch. This is called making the rules **data-driven**: the varying part (which math) is data; the constant part (pop, pop, push) is written once.

```js
const tokens = expression.trim().split(/\s+/).filter(Boolean);
if (tokens.length === 0) {
  throw new Error('Empty expression');
}
```

`trim()` removes leading/trailing spaces, the regex split handles any spacing, `filter(Boolean)` drops empty leftovers, and an empty expression is an error rather than a mystery.

```js
    if (token in OPERATORS) {
      if (stack.length < 2) {
        throw new Error(`Operator "${token}" needs two operands`);
      }
      const b = stack.pop(); // popped in reverse: b was pushed last
      const a = stack.pop();
      stack.push(OPERATORS[token](a, b));
```

One branch handles *every* operator, present and future. Before popping, it checks there are actually two values — killing silent failure #1. The backtick string with `${token}` inside is a **template literal**: it splices the variable's value into the message, so the error names the exact culprit. The comment on `b` records the one genuinely confusing fact (why `b` comes first).

```js
    } else {
      const value = Number(token);
      if (Number.isNaN(value)) {
        throw new Error(`Unknown token: "${token}"`);
      }
      stack.push(value);
    }
```

Non-operators must be real numbers. `Number` (strict) plus `Number.isNaN` kills silent failure #3 — including the `"4abc"` trap that `parseFloat` falls into.

```js
  if (stack.length !== 1) {
    throw new Error(`Malformed expression: ${stack.length} values left on the stack`);
  }
  return stack[0];
```

A valid RPN expression leaves *exactly one* value. Anything else means the input was malformed — killing silent failure #2.

**The tests** (`rpn.test.js`) map one-to-one onto the promises: basic arithmetic works; operand order matters for `-` and `/`; the nested example gives 14; the one-line `^` works; messy spacing is tolerated; and — the important ones — each of the three old silent failures now *throws*, checked with `assert.throws(() => evaluateRpn('3 +'), /needs two operands/)`. The second argument is a regex the error message must match, so the tests verify not just "it errors" but "it errors *helpfully*."

## 7. Words you learned (glossary)

- **RPN (Reverse Polish Notation)**: math notation where operators follow their operands; needs no parentheses.
- **Token**: one meaningful chunk of input text, like `"3"` or `"+"`.
- **Array**: an ordered list of values.
- **Stack**: a list used last-in-first-out, via `push` and `pop`.
- **Operand**: a value an operator works on (in `3 + 4`, the operands are 3 and 4).
- **`NaN`**: "Not a Number" — the silent result of failed math.
- **`parseFloat` / `Number`**: string-to-number converters; `Number` is stricter.
- **Arrow function**: compact function syntax, `(a, b) => a + b`.
- **Lookup table**: an object used to map keys directly to values/functions, replacing if-chains.
- **`in` operator**: asks whether an object has a given key.
- **`throw` / `Error`**: stop immediately and report a problem loudly.
- **Regular expression (regex)**: a text-matching pattern like `/\s+/` (one or more whitespace characters).
- **Truthy / falsy**: how JavaScript treats values in a true/false setting; `""` is falsy.
- **Template literal**: backtick string that can embed values with `${...}`.
- **Module / `export` / `import`**: files that share code with each other.
- **Assertion**: a test statement that fails loudly if a claim about the code is false.
- **Data-driven**: putting the varying part of logic into data (a table) instead of branches.

## 8. Experiments to try on the plane (no internet needed)

1. **Add a `%` (remainder) operator** to `OPERATORS` in `refactored/rpn.js`: `'%': (a, b) => a % b`. One line. Then predict: what should `evaluateRpn("10 3 %")` return? (Expected: `1`.)
2. **Swap the pops** — change `const b = stack.pop(); const a = stack.pop();` to pop `a` first. Which tests would break? (Expected: the "operand order matters" test — `2 8 -` would give `6` instead of `-6`. Swap them back after!)
3. **Break the original on purpose**: add `console.log(calc("3  4 +"))` (two spaces) to a copy of the mental walk-through. Trace by hand why it gives `NaN`. (The empty token `""` becomes `NaN` via `parseFloat`.)
4. **Add a one-operand operator**: try adding `'neg'` that negates a single number (`"5 neg"` → `-5`). You'll discover the "needs two operands" check is wrong for it — a taste of why real calculators store the operand *count* in the table too.
5. **Write a new test** in `rpn.test.js`: `assert.equal(evaluateRpn('2 3 ^ 1 +'), 9);` — predict the answer before you decide if the test would pass. (2³ = 8, plus 1 = 9. It passes.)
