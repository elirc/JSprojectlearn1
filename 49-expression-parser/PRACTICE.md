# 🏋️ Practice: Expression Parser

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Count the leaves (warm-up)

Write a function `countNumbers(node)` that takes a parse tree (the output of `parse`) and returns how many number literals it contains. It must handle all three node types: `number`, `negate`, and `binary`. Test it in a scratch file: for `parse(tokenize('2 + 3 * (4 - 1)'))` it must return `4`, and for `parse(tokenize('-5'))` it must return `1`.

What it practices: tree recursion — the same walk `evaluate` does, but computing something new.
Hint: mirror `evaluate`'s `switch` on `node.type`; a `number` is worth 1, everything else just adds up its children.

### ⭐⭐ 2. Print the tree back out (core)

Write `toInfix(node)` that turns a parse tree back into a fully parenthesized string, so the invisible grouping becomes visible. Expected results: `toInfix(parse(tokenize('2 + 3 * 4')))` → `"(2 + (3 * 4))"`, `'10 - 4 - 3'` → `"((10 - 4) - 3)"`, and `'-5 + 8'` → `"((-5) + 8)"`. Notice how the output *proves* precedence and left-associativity at a glance.

What it practices: recursion that builds strings, and reading precedence/associativity off the tree shape.
Hint: three cases again — a binary node is `` `(${left} ${op} ${right})` `` with recursive calls for the two sides.

### ⭐⭐ 3. Test the double negative (core)

The parser already handles input nobody wrote a test for: `--5` (minus applied twice). Read `factor()` and predict what happens, then add a scratch test file asserting three things: `calculate('--5')` is `5`, `calculate('2 - -3')` is `5`, and — with `assert.deepEqual` — that `parse(tokenize('--5'))` is a `negate` node whose operand is *another* `negate` node wrapping `{ type: 'number', value: 5 }`. Run it with `node --test`.

What it practices: reading a recursive function to predict behavior, then pinning it with a tree-shape test.
Hint: `factor()` sees `-`, consumes it, and calls `factor()` again — which sees the second `-`.

### ⭐⭐ 4. Underscore separators in numbers (core)

Real code lets you write `1_000_000` for readability. Extend the tokenizer so digits may contain underscores: `calculate('1_000_000 / 4')` returns `250000` and `calculate('1_000 + 5')` returns `1005`. A leading underscore is still junk: `calculate('_5')` must still throw `Unexpected character "_"`.

What it practices: extending the tokenizer's walk-with-state loop without touching the parser at all.
Hint: only the *clumping* regex and the `Number(...)` line change — strip underscores with `replaceAll` before converting.

### ⭐⭐⭐ 5. Variables (challenge)

Make the pipeline evaluate expressions with named variables: `evaluate(parse(tokenize('x * y + 1')), { x: 3, y: 4 })` returns `13`. Three edits: the tokenizer emits a `name` token for letter runs, `factor()` turns a `name` token into a `{ type: 'variable', name }` node, and `evaluate(node, vars = {})` looks the name up — throwing `ReferenceError('Unknown variable "x"')` when it's missing. `calculate('process.exit(1)')` must *still* throw a `SyntaxError`, not run code.

What it practices: growing all three pipeline stages in step — the way real languages add every feature.
Hint: copy the number-clumping loop for letters; remember to pass `vars` down through `evaluate`'s recursive calls.

## Solutions

### 1. Count the leaves

```js
function countNumbers(node) {
  switch (node.type) {
    case 'number': return 1;
    case 'negate': return countNumbers(node.operand);
    case 'binary': return countNumbers(node.left) + countNumbers(node.right);
  }
}
```

WHY: this is the project's core lesson in miniature — once the data is a tree, every question about the expression becomes a small recursive walk. `evaluate` computes a value; `countNumbers` computes a count; the *shape* of both functions is identical because the shape of the data drives it.

### 2. Print the tree back out

```js
function toInfix(node) {
  switch (node.type) {
    case 'number': return String(node.value);
    case 'negate': return `(-${toInfix(node.operand)})`;
    case 'binary': return `(${toInfix(node.left)} ${node.op} ${toInfix(node.right)})`;
  }
}
```

WHY: the README says "the tree already encodes the order" — this makes that claim visible. `10 - 4 - 3` printing as `((10 - 4) - 3)` is the left-associativity of the parser's while-loop, frozen into text; you never wrote grouping logic here, you only *read* what `parse` decided.

### 3. Test the double negative

```js
// double-negative.test.js — run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { calculate } from './calc.js';

test('double unary minus cancels out', () => {
  assert.equal(calculate('--5'), 5);
  assert.equal(calculate('2 - -3'), 5);
});

test('--5 parses as negate(negate(5))', () => {
  assert.deepEqual(parse(tokenize('--5')), {
    type: 'negate',
    operand: { type: 'negate', operand: { type: 'number', value: 5 } },
  });
});
```

WHY: `factor()` handles unary minus by calling *itself*, so stacked minuses nest for free — behavior that exists only because the code is recursive. Pinning it with a `deepEqual` tree-shape test (like the project's `2 + 3 * 4` test) documents the behavior so a future refactor can't silently change it.

### 4. Underscore separators in numbers

In `tokenizer.js`, change the number branch:

```js
} else if (/[0-9.]/.test(char)) {
  let end = i;
  while (end < input.length && /[0-9._]/.test(input[end])) end++;   // allow _
  const text = input.slice(i, end);
  const value = Number(text.replaceAll('_', ''));                   // strip before converting
  if (Number.isNaN(value)) {
    throw new SyntaxError(`Bad number "${text}" at position ${i}`);
  }
  tokens.push({ type: 'number', value });
  i = end;
}
```

WHY: the pipeline's separation of concerns pays off — the parser and evaluator need *zero* changes, because they never see characters, only finished number tokens. The first-character test still requires a digit or dot, so `_5` never enters this branch and still throws with a position, keeping the "specific errors, never NaN" guarantee.

### 5. Variables

`tokenizer.js` — add a branch before the final `else`:

```js
} else if (/[a-zA-Z]/.test(char)) {
  let end = i;
  while (end < input.length && /[a-zA-Z0-9_]/.test(input[end])) end++;
  tokens.push({ type: 'name', value: input.slice(i, end) });
  i = end;
}
```

`parser.js` — in `factor()`, after the `number` case:

```js
if (token.type === 'name') {
  next();
  return { type: 'variable', name: token.value };
}
```

`parser.js` — `evaluate` gains a `vars` parameter, threaded through every recursive call:

```js
export function evaluate(node, vars = {}) {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'variable':
      if (!(node.name in vars)) {
        throw new ReferenceError(`Unknown variable "${node.name}"`);
      }
      return vars[node.name];
    case 'negate':
      return -evaluate(node.operand, vars);
    case 'binary': {
      const left = evaluate(node.left, vars);
      const right = evaluate(node.right, vars);
      // ... switch (node.op) unchanged ...
    }
  }
}
```

WHY: each stage grows only its own kind of knowledge — the tokenizer learns a new *character* pattern, the parser a new *leaf* node, the evaluator a new *meaning* — which is exactly how recursive-descent designs absorb features. Security is preserved by construction: `process.exit(1)` tokenizes as a name and a dot, the dot becomes a `Bad number "."` `SyntaxError`, and even a lone name like `exit` is just a failed dictionary lookup. Input stays data, never code. (Verified with node: `x * y + 1` with `{x:3, y:4}` → 13, unknown variable throws, all existing behaviors intact.)
