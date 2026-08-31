# 🏋️ Practice: A Tiny Interpreted Language

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercises 2, 3, and 5 change the language — work on **copies** of the three `refactored/` files so the original tests keep passing.

## Exercises

### ⭐ 1. Write Tiny, not JavaScript: factorial (warm-up)

No interpreter changes. Write a Tiny program (as a string passed to `run`) that computes 10! with a `while` loop and prints the result. Check the returned array in node. The discipline: you may only use what Tiny has — `let`, `while`, `print`, arithmetic — there is no function call, no `for`, no `*=`.

What it practices: `run(source)` returns output as data, so a whole program is one assert.
Hint: two variables — the counter and the running product — and the loop multiplies then decrements.

Expected: `run(yourProgram)` → `['3628800']`.

### ⭐⭐ 2. Multi-value `print` (core)

Upgrade `print` to accept a comma-separated list: `print "x =", x, x * x;` prints one line, values joined by single spaces. Single-value `print` must keep working unchanged. This touches all three stages: the lexer doesn't even know `,` exists yet, the parser must loop, and the interpreter must join.

What it practices: threading one feature through lexer → parser → interpreter, the full pipeline.
Hint: add `,` to `ONE_CHAR`; in the `print` branch collect expressions `while (at(','))`; make the node carry `values` (an array) instead of `value`.

Expected: `run('let x = 2; print "x =", x, x * x;')` → `['x = 2 4']`, and `run('print 1;')` → `['1']`.

### ⭐⭐ 3. Logical `&&` and `||` (core)

Add boolean operators: `&&` binds tighter than `||`, and both bind *looser* than `==`, so `1 == 1 && 2 == 2` means `(1==1) && (2==2)`. Stay true to Tiny's strictness: both operands must be booleans — `1 && true` is a positioned error, not JavaScript-style truthiness.

What it practices: choosing binding powers relative to an existing table, plus Tiny's "no coercion" philosophy.
Hint: `TWO_CHAR` in the lexer; `'||': [1, 2], '&&': [2, 3]` in the parser's `INFIX`; a new branch at the top of `applyOp` using `requireType(..., 'boolean', ...)`.

Expected: `run('print true && false; print 1 < 2 || false; print 1 == 1 && 2 == 2;')` → `['false', 'true', 'true']`, and `run('print 1 && true;')` throws `/"&&" needs a boolean/`.

### ⭐⭐ 4. Test the untested corners (core)

No language changes — write tests (a scratch file using `node:test`, like `tiny.test.js`) pinning three behaviors the suite never checks: (a) string equality: `print "a" == "a";` prints `true` and `print "1" == 1;` prints `false`; (b) ordering on strings is an error: `run('print "a" < "b";')` throws; (c) the subtle one — assignment updates the *nearest* declaration: with `x` declared at two depths, an assignment two blocks deep must change the inner `x`, leaving the outer one alone.

What it practices: reading `valueEquals`, `applyOp`, and `Environment.assign` closely enough to predict them — then locking the predictions in.
Hint: for (c), print the inner `x` before the block closes and the outer `x` after, and assert the pair.

Expected: (a) and (b) as stated; for (c) a program shaped like `let x = 1; if (true) { let x = 2; if (true) { x = 10; } print x; } print x;` outputs `['10', '1']`.

### ⭐⭐⭐ 5. Add `break` (challenge)

Give Tiny a `break;` statement that exits the *innermost* `while` immediately. The interpreter walks the tree with plain recursive calls, so `break` has to escape from deep inside a block back to the loop — the classic trick is throwing a private signal class that the `while` case catches. Also handle abuse: `break;` outside any loop must become a friendly `TinyError`, not a leaked internal object.

What it practices: exceptions as non-local control flow — how real interpreters implement `break`, `continue`, and `return`.
Hint: `class BreakSignal {}` (not an Error!); `throw` it in a new `case 'break'`; wrap the `exec(node.body, env)` inside the `while` case in try/catch — catch only `instanceof BreakSignal`, rethrow everything else; convert stragglers at the top level of `run`.

Expected: a count-up loop inside `while (true)` that breaks at 3 outputs `['0', '1', '2', 'done']`; `run('break;')` throws `/"break" outside a loop/`; a `break` in an inner loop leaves the outer loop running.

## Solutions

### 1. Factorial in Tiny

```js
import { run } from './refactored/interpreter.js';
import assert from 'node:assert/strict';

assert.deepEqual(run(`
  let n = 10;
  let result = 1;
  while (n > 1) {
    result = result * n;
    n = n - 1;
  }
  print result;
`), ['3628800']);
```

WHY: exercises the language end to end — declarations, a multi-statement loop body (the exact thing `split(";")` could never represent), assignment reaching out to the enclosing scope, and output-as-returned-data making the whole program checkable with one `deepEqual`.

### 2. Multi-value `print`

```js
// lexer.js — ',' becomes a token:
const ONE_CHAR = new Set(['+', '-', '*', '/', '(', ')', '{', '}', ';', '=', '<', '>', '!', ',']);

// parser.js — the print branch collects a list:
    if (at('print')) {
      next();
      const values = [parseExpression(0)];
      while (at(',')) { next(); values.push(parseExpression(0)); }
      expect(';');
      return { type: 'print', values };
    }

// interpreter.js — evaluate each, join with spaces:
      case 'print':
        return void output.push(node.values.map((v) => stringify(evaluate(v, env))).join(' '));
```

WHY: a complete tour of the three-stage pipeline — the lexer learns a character, the parser learns a shape (note it's the same comma-separated-list loop the JSON parser used for arrays), and the interpreter learns what the shape *means*. Storing `values` as an array even for one value keeps the node uniform, so the single-value case needs no special code.

### 3. `&&` and `||`

```js
// lexer.js:
const TWO_CHAR = new Set(['==', '!=', '<=', '>=', '&&', '||']);

// parser.js — loosest of all operators, || below &&:
const INFIX = {
  '||': [1, 2], '&&': [2, 3],
  '==': [3, 4], '!=': [3, 4],
  '<': [5, 6], '>': [5, 6], '<=': [5, 6], '>=': [5, 6],
  '+': [10, 11], '-': [10, 11],
  '*': [20, 21], '/': [20, 21],
};

// interpreter.js — top of applyOp:
    if (op === '&&' || op === '||') {
      requireType(l, 'boolean', node, `"${op}"`);
      requireType(r, 'boolean', node, `"${op}"`);
      return op === '&&' ? l && r : l || r;
    }
```

WHY: placing `[1,2]`/`[2,3]` *below* `==`'s `[3,4]` is the entire design decision — it makes `1 == 1 && 2 == 2` group as comparisons-first without touching any code, because in a Pratt parser precedence is data. The `requireType` calls extend Tiny's refusal to coerce. One honest limitation to notice: `applyOp` receives both sides already evaluated, so this `&&` does not short-circuit — real short-circuiting would need a special case in `evaluate` that checks `l` before evaluating `node.right`.

### 4. The untested corners

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './refactored/interpreter.js';

test('string equality works; cross-type == is false, never coerced', () => {
  assert.deepEqual(run('print "a" == "a";'), ['true']);
  assert.deepEqual(run('print "1" == 1;'), ['false']);
});

test('ordering is numbers-only', () => {
  assert.throws(() => run('print "a" < "b";'), /"<" needs a number/);
});

test('assignment updates the NEAREST declaration, not the outermost', () => {
  assert.deepEqual(run(`
    let x = 1;
    if (true) {
      let x = 2;
      if (true) { x = 10; }
      print x;
    }
    print x;
  `), ['10', '1']);
});
```

WHY: (a) works because `valueEquals` compares types first, then values — so `"1" == 1` is `false` by design, not accident; (b) works because `<` sits in the numbers-only half of `applyOp`. The third test is the sharpest: `assign` walks the chain and stops at the *first* env that has the name, so the innermost `x` (value 2) gets the 10 while the outer `x` keeps its 1. That "stop at nearest" rule is exactly how JavaScript closures behave. (All verified with node.)

### 5. `break`

```js
// lexer.js:
const KEYWORDS = new Set(['let', 'if', 'else', 'while', 'print', 'true', 'false', 'break']);

// parser.js — in parseStatement:
    if (at('break')) {
      next();
      expect(';');
      return { type: 'break', line: token.line };
    }

// interpreter.js:
class BreakSignal {} // a control-flow message, deliberately NOT an Error

// in exec's switch:
      case 'break': throw new BreakSignal();

// the while case wraps its body:
          if (!cond) return;
          try {
            exec(node.body, env);
          } catch (signal) {
            if (signal instanceof BreakSignal) return; // leave THIS loop only
            throw signal;
          }

// and run() converts strays into a real error:
  try {
    exec(program, new Environment());
  } catch (signal) {
    if (signal instanceof BreakSignal) throw new TinyError('"break" outside a loop', 0, 0);
    throw signal;
  }
```

WHY: `break` must jump from an arbitrary depth of nested blocks straight out of the loop — plain returns can't do that, but a throw unwinds every frame in between for free, exactly like backtracking used the call stack as an undo log. Catching *only* `BreakSignal` (and rethrowing the rest) keeps real `TinyError`s flowing; because each `while` catches its own body's signal, an inner `break` never touches the outer loop. Verified with node: `['0','1','2','done']`, nested loops produce `['0 0','0 1','1 0','1 1']`, and top-level `break;` throws the friendly error.
