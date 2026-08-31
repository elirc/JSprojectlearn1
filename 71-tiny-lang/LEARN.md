# 📘 Learning Guide: Tiny Lang (A Tiny Interpreted Language)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

We are building our own tiny programming language, called **Tiny**, and a program (written in JavaScript) that can run Tiny programs. A program that runs other programs is called an **interpreter**.

A Tiny program looks like this:

```
let a = 0;
let b = 1;
while (a < 100) {     # this is a comment
  print a;
  let next = a + b;
  a = b;
  b = next;
}
```

When we feed that text to our interpreter, it prints the Fibonacci numbers: `0 1 1 2 3 5 8 13 21 34 55 89`. The interpreter reads the text character by character, figures out what it means, and does it. That's the whole magic — no magic at all.

## 2. Concepts you need first

**Interpreter.** A program that reads source code (plain text) and executes it directly. Node.js itself is an interpreter for JavaScript. We're writing an interpreter for Tiny, *in* JavaScript. Yes, that's allowed — languages are just programs.

**The three-stage pipeline.** Almost every language works in stages:
1. **Lexer** (also called tokenizer): turns raw text into **tokens** — small labeled pieces.
2. **Parser**: turns the flat list of tokens into a **tree** that shows structure.
3. **Interpreter** (or evaluator): walks the tree and does what it says.

**Tokens.** A token is one "word" of code with a label. The text `let x = 5;` becomes five tokens:

```js
[{type: 'let'}, {type: 'name', value: 'x'}, {type: 'op', value: '='},
 {type: 'number', value: 5}, {type: 'op', value: ';'}]
```

Tokens also carry `line` and `col` (column), so error messages can say *where* something went wrong.

**AST (Abstract Syntax Tree).** A tree of plain objects describing the program's structure. `1 + 2 * 3` becomes:

```js
{ type: 'binop', op: '+',
  left:  { type: 'number', value: 1 },
  right: { type: 'binop', op: '*',
           left: { type: 'number', value: 2 },
           right: { type: 'number', value: 3 } } }
```

Notice the tree already "knows" that `*` binds tighter than `+` — the multiplication is nested *inside* the addition. Structure replaces guesswork.

**Recursive descent parsing.** A parsing style with one function per kind of thing: `parseStatement()`, `parseBlock()`, and so on. Functions call each other (and themselves — that's the "recursive" part) to handle nesting. An `if` inside a `while` inside an `if` works automatically, because `parseBlock` calls `parseStatement` which can call `parseBlock` again.

**Pratt parsing.** A neat technique for parsing *expressions* (math like `2 + 3 * 4`) where each operator has a number called **binding power** — how strongly it grabs its neighbors. `*` has higher power than `+`, so `2 + 3 * 4` parses as `2 + (3 * 4)`. Project 70 covers it in depth; here it's reused as-is.

**Scope.** The region of a program where a variable exists. In JavaScript:

```js
if (true) { let secret = 42; }
console.log(secret); // ReferenceError — secret only lived inside the { }
```

**Environment.** How an interpreter *implements* scope: an object holding a map of variable names to values, plus a pointer to a **parent** environment. Looking up a variable checks the current environment first, then the parent, then the parent's parent — a chain. Entering a `{ }` block creates a fresh child environment; leaving the block throws it away. That's variable lifetime, for free.

**Shadowing.** Declaring a variable with the same name as one in an outer scope. The inner one temporarily "hides" the outer one, but never destroys it:

```js
let x = 1;
{ let x = 99; console.log(x); } // 99
console.log(x);                 // 1 — still alive
```

**eval (the danger).** JavaScript's built-in `eval("2 + 2")` runs any string as real JavaScript code, with *all* of JavaScript's powers. If any user-supplied text reaches `eval`, the user can run anything — like `process.exit(1)` (kill the program) or worse. Rule of thumb: never eval strings you didn't write yourself.

**Regular expression (regex).** A mini-language for matching text patterns. `/^let (\w+) = (.+)$/` means "the text `let `, then a word, then ` = `, then anything". The original code uses regexes to recognize statements. `\w+` means "one or more letters/digits/underscores".

**Type coercion.** JavaScript silently converts types: `1 + "x"` gives the string `"1x"` instead of an error. Convenient until it hides a bug for three hours. Tiny refuses to do this.

## 3. Walking through the original code

The original crams a whole "language" into 40 lines. Here's how.

```js
var variables = {};
```

One single object holds *every* variable in every program that ever runs. This is a **flat global scope** — remember this for section 4.

```js
var statements = source.split(";");
```

"Parsing" is just cutting the text at every semicolon. `let x = 3; print x` becomes `["let x = 3", " print x"]`. Simple — and fatally limited, as we'll see.

```js
if ((m = stmt.match(/^let (\w+) = (.+)$/))) {
  variables[m[1]] = evalExpr(m[2]);
} else if ((m = stmt.match(/^print (.+)$/))) {
  console.log(evalExpr(m[1]));
}
```

Each statement is matched against regex patterns. `m[1]` and `m[2]` are the captured pieces (the variable name and the expression text). A `let` stores into the global object; a `print` logs to the console.

```js
} else if ((m = stmt.match(/^if \((.+)\) (.+)$/))) {
  if (evalExpr(m[1])) run(m[2]);
}
```

An `if` grabs the condition and *one* trailing statement, and re-runs `run()` on that single statement. There is no way to write `else`, and no way to attach more than one statement.

```js
var substituted = expr.replace(/[a-zA-Z_]\w*/g, function (name) {
  return name in variables ? JSON.stringify(variables[name]) : name;
});
return eval(substituted);
```

To evaluate `x * x + y * y`, it text-replaces each variable name with its stored value (`3 * 3 + 4 * 4`) and hands the string to JavaScript's `eval`. JavaScript does the math. It "works" — and it's the most dangerous line in the file.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: `split(";")` can't represent nesting.** Say you write `while (i < 3) { print i; i = i + 1; }`. The split happens *first*, blindly, and cuts your loop body in half at the first `;`. The `while` gets the fragment `while (i < 3) { print i`, and the rest becomes separate garbage statements. Blocks — multiple statements grouped in `{ }` — are literally unwritable. Your language hits a hard ceiling the first day someone tries a two-line loop body. (Bonus bug: a semicolon inside a string, like `"a;b"`, also gets cut.)

**Flaw 2: one flat scope, forever.** Every variable from every run lives in the same `variables` object. Run a loop that uses `i`, and `i` still exists afterward — and next month, some unrelated code that also uses `i` silently reads the leftover value. You spend an afternoon discovering the bug isn't in either piece of code, but in the fact that they *share a namespace*.

**Flaw 3: `eval` is a security hole.** The user writes `let x = process.exit(1)` — a valid-looking Tiny line. The regex splices it, `eval` runs it as real JavaScript, and your whole application instantly dies. Or worse: `require("fs")` reads files. If Tiny is meant for "user macros," you just handed users the keys to the machine.

**Flaw 4: errors point nowhere.** A typo on line 200 of a Tiny script produces `what is this: prnt x` with no line number. Now go find it by hand.

## 5. Try it yourself first!

Before reading the solution, try building it. Hints, vaguest first:

1. Don't process text directly. Convert it into something structured first. Two conversions, actually.
2. Stage 1: write a loop over characters that produces tokens — `{type, value, line, col}` objects. Handle: whitespace, `#` comments (skip to end of line), numbers, `"strings"`, names/keywords, and operators (check two-character ones like `<=` *before* one-character ones).
3. Stage 2: write `parseStatement()` that looks at the current token: `let` → parse a declaration, `if` → parse condition and a block, and so on. Write `parseBlock()` as: expect `{`, parse statements until `}`. Let them call each other — nesting is then free.
4. For expressions, use a Pratt loop (project 70): each operator gets a binding-power pair; parse a prefix piece, then loop while the next operator's power is high enough.
5. Stage 3: write `exec(node, env)` with a `switch` on `node.type`. The key trick: `case 'block'` creates `new Environment(env)` — a child — and executes the block's statements in *that*.
6. In the Environment class: `declare` writes to the current map only; `assign` and `lookup` walk the parent chain until they find the name, and throw a clear error if they fall off the end.

## 6. Understanding the refactored solution

Three files, one per stage — each takes plain data in and returns plain data out, so each is testable alone.

**`lexer.js` — text to tokens.** A single loop with one `if` per character kind. Every token records `line` and `col`. There's a custom error class:

```js
export class TinyError extends Error {
  constructor(message, line, col) {
    super(`${message} (line ${line}, col ${col})`);
```

Every error in the whole language flows through this, so every error message has a position. That single decision fixes Flaw 4 everywhere at once.

**`parser.js` — tokens to AST.** Statements use recursive descent; expressions use Pratt. Look how cheap `else if` chains are:

```js
if (at('else')) { next(); otherwise = at('if') ? parseStatement() : parseBlock(); }
```

If `else` is followed by `if`, just parse a statement — which parses that whole nested `if`, including *its* `else`. One line buys unlimited `else if` chains. The original couldn't represent even one `else`.

**`interpreter.js` — walk the AST.** The star is the 27-line `Environment` class:

```js
assign(name, value, node) {
  for (let env = this; env; env = env.parent) {
    if (env.vars.has(name)) return env.vars.set(name, value);
  }
  throw new TinyError(`Cannot assign to undeclared variable "${name}" — did you mean "let"?`, ...);
}
```

`declare` (from `let`) writes to the *current* environment — so an inner `let x` shadows an outer `x` without touching it. `assign` (plain `x = ...`) *walks the chain* outward — so a loop body can update the counter declared outside it. And in `exec`, `case 'block'` does `new Environment(env)`: fresh scope per block, dropped when the block ends. Those three rules *are* scoping. They're also exactly how JavaScript itself works.

Other deliberate choices:
- **Output is returned data, not console noise.** `run(source)` returns an array of printed lines. That's what makes testing possible: `assert.deepEqual(run(...), ['big', '30'])`.
- **A step budget** (`maxSteps`) counts every executed node; an infinite loop becomes a friendly error instead of a hung process.
- **Strict types**: `1 + "x"` throws `Cannot add number and string`; `if (5)` throws because conditions must be booleans; `1 / 0` throws. Tiny refuses JavaScript's coercion traps on purpose.
- **No eval anywhere**, so `print process;` just says `Unknown variable "process"`. Security by construction: the dangerous path doesn't exist, so it can't be misused.

**The tests (`tiny.test.js`)** use Node's built-in test runner: each `test(name, fn)` runs a Tiny program through `run()` and checks the returned output with `assert.deepEqual`, or checks that bad programs throw the *right* error with `assert.throws(fn, /pattern/)`. Read them as a tour: the first test is the exact program the original crashed on; three tests prove the scoping rules; the last proves `process` has no power.

## 7. Words you learned (glossary)

- **Interpreter** — a program that reads source code and executes it directly.
- **Lexer / tokenizer** — stage that turns raw text into tokens.
- **Token** — one labeled "word" of code, e.g. `{type: 'number', value: 5}`.
- **Parser** — stage that turns tokens into a tree (AST).
- **AST** — Abstract Syntax Tree; nested objects representing program structure.
- **Recursive descent** — parsing with one function per construct, calling each other for nesting.
- **Pratt parsing** — expression parsing driven by per-operator binding powers.
- **Binding power / precedence** — how strongly an operator grabs its neighbors (`*` beats `+`).
- **Scope** — the region of code where a variable exists.
- **Environment** — a map of names to values plus a parent pointer; a chain of these implements scope.
- **Shadowing** — an inner variable hiding (not destroying) an outer one with the same name.
- **eval** — JS function that runs a string as code; dangerous with user input.
- **Type coercion** — silent automatic type conversion, like JS's `1 + "x"` → `"1x"`.
- **Regex (regular expression)** — a pattern language for matching text.
- **Step budget** — a counter that aborts a runaway program after N operations.

## 8. Experiments to try on the plane (no internet needed)

Everything here runs offline: `node --test 71-tiny-lang/` and plain `node`.

1. **Add a `%` (remainder) operator.** Add `%` to `ONE_CHAR` in the lexer, give it the same binding power as `*` in the parser's `INFIX` table (`'%': [20, 21]`), and add a `case '%': return l % r;` in `applyOp`. Then `run('print 10 % 3;')` should output `['1']`.
2. **Break shadowing on purpose.** In `interpreter.js`, change `case 'block'` to pass `env` instead of `new Environment(env)`. Run the tests: the three SCOPING tests fail, and the failures show exactly what a flat scope costs. Undo it after.
3. **Prove the step budget works.** Write a test: `assert.throws(() => run('let i = 0; while (i < 10) { print i; }'), /ran too long/)` — the loop never increments `i`, so it trips the guard instead of hanging your laptop.
4. **Give `TinyError` a column for `let` errors.** `declare` currently reports column 0. Thread `node.col` through (store `col` on the `let` node in the parser) and watch the error messages sharpen.
5. **Stretch goal (the README's challenge): add `repeat N { ... }`.** Lexer: add `repeat` to `KEYWORDS`. Parser: in `parseStatement`, handle `at('repeat')` — parse an expression, then a block; return `{type: 'repeat', count, body}`. Interpreter: a `for` loop that `exec`s the body `count` times (fresh child env each time!). Then write the test proving it.
