# 📘 Learning Guide: Expression Parser

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A calculator that takes a math expression as *text* and computes the answer.

You run it from the terminal like this:

```
node refactored/calc.js "2 + 3 * (4 - 1)"
```

and it prints:

```
11
```

The hard part: the input is just a string of characters — `"2 + 3 * (4 - 1)"`. The program has to *understand* that string: know that `*` happens before `+`, know that parentheses group things, and complain clearly when the input is nonsense like `"(2 + 3"` (missing closing parenthesis).

## 2. Concepts you need first

### Strings are just lists of characters

A string like `"2+3"` is a sequence of characters you can walk through one at a time. `input[0]` is the first character.

```js
const s = "2+3";
console.log(s[0]);        // "2"
console.log(s[1]);        // "+"
console.log(s.length);    // 3
```

### Objects as little labeled boxes

An *object* groups related values under names. We use objects to describe tokens and tree nodes.

```js
const token = { type: "number", value: 42 };
console.log(token.type);  // "number"
console.log(token.value); // 42
```

### Tokens and tokenizers

A **token** is one meaningful chunk of the input — a whole number, or one operator symbol. A **tokenizer** (also called a *lexer*) turns raw text into a list of tokens. It clumps `"3.5"` into ONE number token instead of three characters.

```js
// The idea, tiny version:
// "2+35"  becomes  [{type:"number", value:2}, {type:"op", value:"+"}, {type:"number", value:35}]
```

Why bother? Because after tokenizing, the rest of the program never thinks about spaces or digits again. It only thinks about whole tokens.

### NaN — "Not a Number"

`NaN` is the special value JavaScript gives you when a number conversion fails. The nasty part: it never crashes, it just silently spreads.

```js
console.log(Number("abc"));   // NaN
console.log(NaN + 5);         // NaN  (it infects everything it touches)
console.log(Number.isNaN(NaN)); // true
```

### Throwing errors

`throw` stops the program with an error message. It is the opposite of silently returning `NaN` — it *tells you* what went wrong and where. `try`/`catch` lets a caller intercept the error instead of crashing.

```js
function half(n) {
  if (typeof n !== "number") throw new SyntaxError("need a number");
  return n / 2;
}
try { half("x"); } catch (e) { console.log(e.message); } // "need a number"
```

`SyntaxError` and `RangeError` are built-in *kinds* of errors. Using the right kind lets code react differently to different problems.

### Trees

A **tree** is data with nesting: each node can hold child nodes. Math expressions are naturally trees. `2 + 3 * 4` really means "add 2 and (the result of multiplying 3 and 4)":

```
      (+)
     /   \
    2    (*)
        /   \
       3     4
```

In JavaScript we build this with nested objects:

```js
const tree = { op: "+", left: 2, right: { op: "*", left: 3, right: 4 } };
console.log(tree.right.op); // "*"
```

The shape of the tree *is* the order of operations. You cannot evaluate this tree and get 20 — the `*` is buried inside, so it must happen first.

### Recursion

A function that calls itself. Perfect for trees, because a tree is "a node whose children are smaller trees".

```js
function countNodes(node) {
  if (typeof node === "number") return 1;           // leaf
  return 1 + countNodes(node.left) + countNodes(node.right);
}
console.log(countNodes({ op: "+", left: 2, right: 3 })); // 3
```

### Precedence and associativity

**Precedence** = which operator binds tighter. `*` beats `+`, so `2 + 3 * 4` is 14, not 20.
**Associativity** = with equal operators, which side groups first. `10 - 4 - 3` means `(10 - 4) - 3` = 3 (left-associative), not `10 - (4 - 3)` = 9.

### A parser and recursive descent

A **parser** turns the flat token list into the tree. **Recursive descent** is the classic technique: write one function per precedence level, and let the functions call each other. A **grammar** is the written recipe for what's legal, like:

```
expression := term   (('+'|'-') term)*      loosest
term       := factor (('*'|'/') factor)*    tighter
factor     := NUMBER | '(' expression ')' | '-' factor
```

Read `:=` as "is made of" and `*` as "repeated zero or more times". Each grammar line becomes one function in the code.

### Closures — inner functions sharing a variable

Functions defined inside another function can all see and change the outer function's variables. Our parser's helpers all share one `position` counter this way.

```js
function counter() {
  let n = 0;
  const next = () => n++;
  next(); next();
  return n;
}
console.log(counter()); // 2
```

### eval — the forbidden shortcut

`eval(string)` runs the string *as JavaScript code*. All of JavaScript. If the string comes from a user, they can run anything on your machine. That's why "never eval user input" is a rule, not a preference.

### Modules: import/export

Splitting code into files. `export` marks what a file offers; `import` pulls it in.

```js
// math.js:      export function double(x) { return x * 2; }
// main.js:      import { double } from './math.js';
//               console.log(double(4)); // 8
```

### process.argv — command-line arguments

When you run `node calc.js "2 + 3"`, Node puts the extra words in the array `process.argv`. Index 0 is node itself, index 1 is the script path, index 2 is your first real argument — here, the expression string.

### Node's built-in test runner

`node --test` finds files ending in `.test.js` and runs them. A test is a named function; `assert.equal(a, b)` crashes the test if `a` is not `b`; `assert.throws(fn)` passes only if calling `fn` throws.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('math works', () => { assert.equal(1 + 1, 2); }); // prints: ✔ math works
```

## 3. Walking through the original code

The original file makes two attempts. **Attempt 1** is one line:

```js
function calc1(expr) {
  return eval(expr);
}
console.log(calc1("2 + 3 * 4")); // 14. Done...?
```

It works! `eval` hands the string to the JavaScript engine, which already knows math. But it also knows *everything else* — `calc1("process.exit(1)")` shuts down your program, because `process.exit(1)` is valid JavaScript too. The input was supposed to be data; `eval` treats it as code.

**Attempt 2** does it manually, scanning left to right:

```js
var tokens = expr.split(" ");
var result = parseFloat(tokens[0]);
for (var i = 1; i < tokens.length; i += 2) {
  var op = tokens[i];
  var value = parseFloat(tokens[i + 1]);
  if (op == "+") result += value;
```

`split(" ")` chops the string at spaces: `"2 + 3"` becomes `["2", "+", "3"]`. `parseFloat` turns text into a number. Then the loop walks the list two items at a time (operator, then number) and applies each operator to a running `result` immediately.

The comments in the file show the damage:

```js
console.log(calc2("2 + 3 * 4")); // 20?! Should be 14.
console.log(calc2("2+3*4"));      // NaN - no spaces, split(" ") fails
console.log(calc2("(2 + 3) * 4")); // NaN - parentheses? never heard of them
```

## 4. What's wrong with it (in beginner terms)

**Flaw 1: `eval` runs anything.** Imagine you ship this calculator as a website feature. A visitor types `while(true){}` — your server freezes forever. Another types code that reads your files. You didn't build a calculator; you built a remote control for your computer and handed it to strangers.

**Flaw 2: left-to-right ignores precedence.** The scan applies each operator *the moment it sees it*. So in `2 + 3 * 4` it does `2 + 3` first and gets 20. The correct answer needs the `*` done first — but the loop has already spent the `+`. No amount of extra `if`s fixes this, because the information you need ("there's a `*` coming later") lives in the *shape* of the expression, and a flat loop has no shape. Here's how it bites: you build a budgeting tool with this, someone types `100 - 10 * 5` expecting 50, gets 450, and trusts every number your app ever shows them a little less.

**Flaw 3: silent NaN instead of errors.** Type the expression without spaces, or with parentheses, or with a typo — you don't get an error, you get `NaN`. Then that `NaN` flows into whatever used the result, and *that* code breaks, far from the real cause. You spend an hour debugging the wrong file.

## 5. Try it yourself first!

Before reading the refactor, try to build your own. Hints, vaguest first:

1. Don't fix `calc2` — the README's point is that the approach is wrong. Start over with three separate steps.
2. Step 1: write a function that turns the string into a list of token objects, handling multi-digit numbers and skipping spaces. Test it alone: `tokenize("12+3")` should give two number tokens and one op token.
3. Step 2: instead of computing numbers directly, build nested objects — `{ op, left, right }` — where the tighter-binding operators end up *deeper* in the nesting.
4. To get precedence right, write TWO functions: one that only glues things with `+`/`-`, and one that only glues things with `*`/`/`. Make the `+`/`-` function call the `*`/`/` function to get each of its pieces. That single decision *is* precedence.
5. For parentheses: when the piece-collector sees `(`, call the top-level expression function again (recursion!), then demand a `)`.
6. Step 3: write `evaluate(node)` — if the node is a number, return it; otherwise evaluate both children recursively and apply the operator.

## 6. Understanding the refactored solution

The refactor is a three-stage pipeline, one file per stage. `calc.js` just wires them together:

```js
export function calculate(input) {
  return evaluate(parse(tokenize(input)));
}
```

**Stage 1 — `tokenizer.js`.** A loop that walks the string with an index `i`. Spaces: skip. One of `+-*/()`: emit an op token. A digit or dot: keep walking until the digits end, then convert the whole slice at once:

```js
let end = i;
while (end < input.length && /[0-9.]/.test(input[end])) end++;
const text = input.slice(i, end);
const value = Number(text);
```

`/[0-9.]/.test(char)` is a **regular expression** — a pattern-matching mini-language; this one just asks "is this character a digit or a dot?". If `Number(text)` fails (like `"1..2"`), it throws `Bad number ... at position i` — a real error with a location, not `NaN`. Anything unrecognized also throws with its position.

**Stage 2 — `parser.js`.** Three functions, copied straight from the grammar. `expression()` collects `term()`s joined by `+`/`-`; `term()` collects `factor()`s joined by `*`/`/`:

```js
function term() {
  let node = factor();
  while (nextOpIs('*', '/')) {
    const op = next().value;
    node = { type: 'binary', op, left: node, right: factor() };
  }
  return node;
}
```

The magic: `expression()` never touches a raw number. It calls `term()`, and `term()` has *already* glued `3 * 4` into one node before `expression()` gets to attach the `+`. Precedence is not checked anywhere — it is the call order. The line `node = { ..., left: node, ... }` also gives left-associativity for free: each new operator wraps everything built so far as its left side, so `10 - 4 - 3` becomes `(10-4)-3`.

`factor()` handles the leaves: a number token, a `(` (which recursively calls `expression()` and then requires `)`), or a unary minus like `-5`. Anything else throws a specific `SyntaxError`. After parsing, one final check — if tokens remain (like the stray `)` in `"2 + 3)"`), that's an error too.

**Stage 3 — `evaluate` (bottom of parser.js).** A `switch` on `node.type`: numbers return themselves; `negate` flips the sign of its evaluated child; `binary` evaluates `left` and `right` recursively and applies the operator. Division by zero throws a `RangeError` instead of returning `Infinity`. Evaluation is trivial because the tree already encodes all the ordering decisions.

**The tests (`calc.test.js`).** Each test names a behavior. The star is the precedence test (`2 + 3 * 4` must be 14) and the tree-shape test, which uses `assert.deepEqual` (compares nested objects piece by piece) to check that the `*` node is literally nested inside the `+` node. The error tests use `assert.throws(fn, /pattern/)` — pass only if the function throws AND the message matches the pattern. The final test proves the security fix: `calculate('process.exit(1)')` throws a `SyntaxError` instead of exiting, because our parser only understands math.

## 7. Words you learned (glossary)

- **Token**: one meaningful chunk of input (a number, an operator).
- **Tokenizer / lexer**: code that turns raw text into a token list.
- **Parser**: code that turns tokens into a structured tree.
- **Tree**: nested data where each node holds child nodes.
- **AST (abstract syntax tree)**: the tree a parser builds — our `{type, op, left, right}` objects.
- **Node**: one object in a tree.
- **Recursion**: a function calling itself, usually on a smaller piece.
- **Recursive descent**: parsing style with one function per grammar rule.
- **Grammar**: the written rules of what input is legal.
- **Precedence**: which operator binds tighter (`*` beats `+`).
- **Associativity**: how equal operators group (`10-4-3` = `(10-4)-3`).
- **Unary minus**: minus with one operand, as in `-5`.
- **eval**: built-in that runs a string as JavaScript code — dangerous.
- **NaN**: "Not a Number", the silent result of a failed number conversion.
- **throw**: stop with an error object; **try/catch** intercepts it.
- **SyntaxError / RangeError**: built-in error kinds for bad input / bad values.
- **Closure**: inner functions sharing an outer function's variables.
- **Regular expression (regex)**: a text-pattern-matching mini-language, like `/[0-9.]/`.
- **Module / import / export**: splitting code across files and sharing pieces.
- **process.argv**: array of command-line arguments in Node.
- **assert**: test helper that crashes if a claim is false.
- **deepEqual**: assert that compares nested objects piece by piece.

## 8. Experiments to try on the plane (no internet needed)

Everything in this project runs offline. After each edit, re-run `node --test .` from the project folder (expect specific tests to fail or pass — that's the point).

1. **Add the `%` (remainder) operator.** Add `%` to the tokenizer's op characters, add it to `term()`'s `nextOpIs('*', '/')` list, and add a `case '%'` to `evaluate`. Expected: `node calc.js "10 % 3"` prints `1`, and all existing tests still pass.
2. **Break precedence on purpose.** In `expression()`, change `term()` to `factor()` in both places. Expected: the "THE test: precedence" test fails — `2 + 3 * 4` now evaluates left-to-right like the original. Change it back and watch it pass.
3. **Ask for the tree.** In `calc.js`, temporarily add `console.log(JSON.stringify(parse(tokenize(expression)), null, 2));` before the `try`. Run `node calc.js "1 + 2 * 3"` and look at the printed nesting — the `*` should be inside the `+`'s `right`. (Remove the line after.)
4. **Make `^` (power) right-associative.** Harder: add a `power` level between `term` and `factor` where the right side calls `power()` itself (recursion instead of a while-loop). Expected: `2 ^ 3 ^ 2` gives 512 (`2^(3^2)`), not 64.
5. **Improve one error message.** Make `Missing closing parenthesis` also report the position (you'll need to store positions in tokens — add `pos: i` in the tokenizer). Expected: `node calc.js "(2 + 3"` prints your richer message; the error test still passes because it only checks for the phrase.
