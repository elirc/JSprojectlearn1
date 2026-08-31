# 🏋️ Practice: Calculator with a Pratt Parser

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work on a **copy** of `refactored/pratt.js` for exercises that change it, so the original tests keep passing.

## Exercises

### ⭐ 1. Teach it `floor` and `ceil` (warm-up)

The calculator knows `sqrt`, `abs`, `min`, `max`, `round` — but not `floor` or `ceil`. Add both. This should take you under a minute, and that's the point: notice *which* part of the file you touch and which parts you don't.

What it practices: the "language definition is a table" idea — built-ins live in `FUNCTIONS`, not in the parser.
Hint: the parser already handles any `name(args)` shape; only the lookup table decides which names exist.

Expected: `calc('floor(2.9) + ceil(0.1)')` → `3`, `calc('floor(-1.5)')` → `-2`.

### ⭐⭐ 2. Add the `<` operator (core)

The table has `>` but not `<`. Add it with the same precedence. Careful — there are *two* places to touch, and forgetting the second one doesn't crash: `calc('1 < 2')` just returns `undefined`. Find both, then verify the operator is left-associative by checking the tree.

What it practices: one table row for parsing + one switch case for evaluating — and what "silently wrong" looks like when they're out of sync.
Hint: the tokenizer's character class already contains `<`. The two places are `INFIX` and the `binop` switch in `evaluate`.

Expected: `calc('1 < 2')` → `1`, `calc('2 + 3 < 4')` → `0`, `calc('1 < 2 < 3')` → `1` (it parses as `(1<2) < 3`).

### ⭐⭐ 3. `variables(ast)` — walk the tree without evaluating (core)

Write a function `variables(ast)` that returns a sorted array of every distinct variable name an expression mentions: `variables(parse('x*y + sqrt(z) - x'))` → `['x','y','z']`. No changes to `pratt.js` — this is a new consumer of the AST. A real calculator UI would use exactly this to know which input boxes to show.

What it practices: "parse and evaluate stay separate" — the AST is plain data anyone can walk for new purposes.
Hint: recurse with a `switch` on `node.type`, collecting into a `Set`; `binop` has two children, `call` has an array of them.

Expected: `variables(parse('-b + sqrt(b^2 - 4*a*c)'))` → `['a','b','c']`, `variables(parse('1+2*3'))` → `[]`.

### ⭐⭐ 4. Predict the prefix-position surprises (core)

No code changes — three expressions, and for each you must *write down* the answer before running: `calc('2^-1')`, `calc('-sqrt(16)')`, and the tricky one, `calc('2^-1^2')`. Then check with node. Two of these work only because of where unary minus lives in `parsePrefix`; the third requires you to reason about what `parseExpression(30)` swallows.

What it practices: the difference between *prefix position* (anything can start an expression) and *infix position* (only table operators continue one).
Hint: after `^`, the parser calls `parseExpression(40)` — and the first thing that does is `parsePrefix()`, where `-` is always welcome. Then `-` recurses with `minBP` 30, and `^`'s left BP is 40…

Expected: `0.5`, `-4`, and `0.5` — because `2^-1^2` parses as `2^(-(1^2))`.

### ⭐⭐⭐ 5. Postfix factorial: `3!` (challenge)

Add a factorial operator: `3!` → `6`, `(2+3)!` → `120`. This is the one operator shape the project hasn't shown you: **postfix** — it binds to its *left* and consumes nothing on the right, so it lives in the `parseExpression` loop but never recurses. Give it binding power 50 (tighter than `^`'s 40), add `!` to the tokenizer's operator class, and make the evaluator reject non-integers and negatives with a `CalcError`.

What it practices: extending the Pratt loop with a third operator position — prefix, infix, and now postfix — while keeping precedence as data.
Hint: in the loop, when you see `!` with BP ≥ `minBP`: consume it and wrap `left = { type: 'fact', operand: left }` — no `parseExpression` call at all. A `POSTFIX = { '!': 50 }` table keeps it data-driven.

Expected: `calc('3! + 1')` → `7`, `calc('-3!')` → `-6` (! outranks unary minus), `calc('2^3!')` → `64` (that's `2^6`), `calc('2.5!')` throws.

## Solutions

### 1. `floor` and `ceil`

```js
const FUNCTIONS = {
  sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max, round: Math.round,
  floor: Math.floor, ceil: Math.ceil,
};
```

WHY: two table entries, zero parser changes — `parsePrefix` already parses *any* `name(args)` call and the evaluator already looks names up in `FUNCTIONS`. Compare with the original's ladder, where every language change meant touching control flow. When syntax and vocabulary are data, growth is cheap.

### 2. The `<` operator

```js
const INFIX = {
  '>': [5, 6], '<': [5, 6],   // place 1: the parse table
  '+': [10, 11], '-': [10, 11],
  '*': [20, 21], '/': [20, 21],
  '^': [40, 40],
};
// ...and in evaluate's binop switch:
        case '>': return l > r ? 1 : 0;
        case '<': return l < r ? 1 : 0;   // place 2: the evaluator
```

WHY: the table row makes `<` *parse* (the tree is right), but without the evaluator case the `binop` switch falls through and returns `undefined` — no crash, no message. That's this project's core warning, met in miniature: precedence-layer bugs and missing-case bugs are quiet. `[5, 6]` (left < right) makes it left-associative, so `1 < 2 < 3` is `(1<2) < 3` → `1 < 3` → `1`.

### 3. `variables(ast)`

```js
export function variables(node, found = new Set()) {
  switch (node.type) {
    case 'var': found.add(node.name); break;
    case 'neg': variables(node.operand, found); break;
    case 'call': for (const arg of node.args) variables(arg, found); break;
    case 'binop': variables(node.left, found); variables(node.right, found); break;
    // 'num' has nothing to collect
  }
  return [...found].sort();
}
```

WHY: because `parse` returns plain data instead of evaluating on the fly, a feature the author never imagined — listing free variables — needs no parser changes at all, just a new tree walk. The `Set` deduplicates the two `x`s; recursion mirrors the AST's own shape exactly like `evaluate` does. This is the "AST is inspectable data" test from `pratt.test.js`, turned into a tool.

### 4. Prefix-position surprises

```js
calc('2^-1');      // 0.5  — after ^, parsePrefix runs, and '-' is a legal prefix
calc('-sqrt(16)'); // -4   — a call is just another prefix thing to negate
calc('2^-1^2');    // 0.5  — parses as 2^(-(1^2)), NOT 2^((-1)^2) = 2
```

WHY: infix operators must pass the `INFIX[op][0] >= minBP` gate, but *prefix* parsing happens unconditionally — so `-` right after `^` is fine even though 30 < 40. In `2^-1^2`, the minus recurses with `minBP = 30`, and since `^`'s left BP (40) ≥ 30, the recursion swallows `1^2` before the negation applies. Binding power controls what an operator *continues*, not what may *start* — that distinction is the whole Pratt prefix/infix split. (All three verified with node.)

### 5. Postfix factorial

```js
// tokenizer: add ! to the operator class
const re = /(?:(\d+\.?\d*)|([a-zA-Z_]\w*)|([+\-*/^(),<>!]))/y;

const POSTFIX = { '!': 50 }; // tighter than ^ (40)

function parseExpression(minBP) {
  let left = parsePrefix();
  while (peek().type === 'op') {
    const value = peek().value;
    if (POSTFIX[value] !== undefined && POSTFIX[value] >= minBP) {
      next();
      left = { type: 'fact', operand: left }; // no right side, no recursion
      continue;
    }
    if (INFIX[value] && INFIX[value][0] >= minBP) {
      const op = next().value;
      const [, rightBP] = INFIX[op];
      left = { type: 'binop', op, left, right: parseExpression(rightBP) };
      continue;
    }
    break;
  }
  return left;
}

// evaluator: a new case
    case 'fact': {
      const v = evaluate(node.operand, env);
      if (!Number.isInteger(v) || v < 0) throw new CalcError('Factorial needs a non-negative integer', 0);
      let result = 1;
      for (let i = 2; i <= v; i++) result *= i;
      return result;
    }
```

WHY: a postfix operator is an infix operator with the recursion deleted — it takes `left` and wraps it, consuming nothing ahead. Its single binding power answers the only question that exists for it: "do I grab `left` before the *pending* operator does?" With 50: in `-3!` the minus recursed with `minBP` 30, so `!` (50 ≥ 30) fires inside the negation → `-(3!) = -6`; in `2^3!` the right side of `^` demands 40, and 50 ≥ 40 → `2^(3!) = 64`. All expected values, including the two throws, verified with node.
