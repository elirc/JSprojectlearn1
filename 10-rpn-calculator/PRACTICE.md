# 🏋️ Practice: RPN Calculator

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Loud division by zero (warm-up)

Right now `evaluateRpn('10 0 /')` quietly returns `Infinity` — a silent almost-failure in the same family as the three the refactor killed. Change the `/` entry in `OPERATORS` so dividing by zero throws `Division by zero` instead. Check: `evaluateRpn('10 0 /')` throws with that message, while `evaluateRpn('15 4 /')` still returns `3.75` and all existing tests still pass.

What it practices: operators in the table are real functions — they can validate, not just calculate.

Hint: an arrow function can have a body with braces and an `if` before its `return`.

### ⭐⭐ 2. Tests for the quiet corners (core)

The test file never checks a *lone number* or *negative and decimal literals*. Add tests asserting: `evaluateRpn('42')` returns `42`, `evaluateRpn('-3 4 +')` returns `1`, and `evaluateRpn('3.5 0.5 +')` returns `4`. All three should pass with the current code — and the decimals test would fail if the number branch used `parseInt` instead of `Number` (parseInt gives `3 + 0 = 3`).

What it practices: writing tests for edges the suite doesn't cover, and knowing *why* they pass.

Hint: `-3` isn't in `OPERATORS` (only the bare `-` is), so it falls through to the number branch.

### ⭐⭐ 3. A constants table (core)

Add a second lookup table `const CONSTANTS = { pi: Math.PI, e: Math.E }` and teach the loop to check it after `OPERATORS` but before trying `Number(token)`. Check: `evaluateRpn('pi 2 *')` returns `6.283185307179586`, `evaluateRpn('3 4 +')` still returns `7`, and `evaluateRpn('3 four +')` still throws `Unknown token`.

What it practices: the same rules-as-data move a second time — new vocabulary should cost a table line, not a code branch.

Hint: one extra `else if (token in CONSTANTS)` between the two existing branches.

### ⭐⭐ 4. Variables (core)

Give the function a second parameter: `evaluateRpn(expression, variables = {})`. A token found in `variables` pushes its value. Check: `evaluateRpn('x 2 *', { x: 21 })` returns `42`, `evaluateRpn('price tax +', { price: 100, tax: 8 })` returns `108`, and `evaluateRpn('y 2 *', { x: 21 })` still throws `Unknown token: "y"`.

What it practices: extending a function's interface with a defaulted parameter so old callers keep working.

Hint: check `Object.hasOwn(variables, token)` rather than `token in variables` — `in` also sees inherited keys like `toString`, which are not variables anyone set.

### ⭐⭐⭐ 5. One table, any arity (challenge)

LEARN.md's last experiment had you *discover* that a one-operand `neg` breaks the "needs two operands" check. Now fix the design: change each `OPERATORS` entry to `{ arity, apply }` — e.g. `'+': { arity: 2, apply: (a, b) => a + b }` — and make the loop generic: check `stack.length` against `arity`, take that many operands, and push `apply(...args)`. Then add `'neg': { arity: 1, apply: (a) => -a }` and `'sqrt': { arity: 1, apply: (a) => Math.sqrt(a) }`. Check: `evaluateRpn('5 neg')` returns `-5`, `evaluateRpn('9 sqrt')` returns `3`, `evaluateRpn('16 sqrt neg')` returns `-4`, `evaluateRpn('neg')` throws `needs one operand` — and *every existing test still passes*, including the one matching `/needs two operands/`.

What it practices: generalizing a rule so the table describes each operator completely — the loop needs to know nothing about any particular one.

Hint: `stack.splice(stack.length - arity, arity)` removes the top `arity` items *in pushed order*, so no more manual `b`-then-`a` popping. To keep the error message matching `/needs two operands/`, spell the count out with a tiny lookup like `{ 1: 'one', 2: 'two' }`.

## Solutions

### 1. Loud division by zero

```js
'/': (a, b) => {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
},
```

WHY: the table's values are ordinary functions, so a rule that belongs to *one* operator lives inside that operator's entry — the loop stays generic. `Infinity` is the same disease as `NaN`: a plausible-looking value that flows onward instead of failing where the mistake happened.

### 2. Tests for the quiet corners

```js
test('a lone number evaluates to itself', () => {
  assert.equal(evaluateRpn('42'), 42);
});

test('negative and decimal literals are numbers, not operators', () => {
  assert.equal(evaluateRpn('-3 4 +'), 1);
  assert.equal(evaluateRpn('3.5 0.5 +'), 4);
});
```

WHY: `'42'` exercises the "exactly one value left" path with zero operators, and `'-3'` proves token classification is exact-match — only the bare `-` is an operator. These pass because `Number` handles signs and decimals; the README's `parseFloat`/`parseInt` discussion is exactly about converters that would betray these cases.

### 3. A constants table

```js
const CONSTANTS = { pi: Math.PI, e: Math.E };

// inside the loop:
    if (token in OPERATORS) {
      // ... unchanged ...
    } else if (token in CONSTANTS) {
      stack.push(CONSTANTS[token]);
    } else {
      // ... unchanged Number/throw branch ...
    }
```

WHY: same lesson as `OPERATORS` — the varying part (which names mean which values) is data; the constant part (push a number) is written once. Adding `tau: Math.PI * 2` later costs one line, and garbage input still fails loudly because unknown tokens still fall through to the `Number` check.

### 4. Variables

```js
export function evaluateRpn(expression, variables = {}) {
  // ... inside the loop:
    if (token in OPERATORS) {
      // ... unchanged ...
    } else if (Object.hasOwn(variables, token)) {
      stack.push(variables[token]);
    } else {
      // ... unchanged Number/throw branch ...
    }
```

WHY: the `= {}` default means every existing call site and test keeps working unchanged — extending an interface without breaking it. `Object.hasOwn` matters because plain objects inherit keys like `toString` and `constructor`; `'toString' in {}` is `true`, and you don't want phantom variables (the same surprise-keys trap LEARN.md 12 solves with a `Map`).

### 5. One table, any arity

```js
const OPERATORS = {
  '+': { arity: 2, apply: (a, b) => a + b },
  '-': { arity: 2, apply: (a, b) => a - b },
  '*': { arity: 2, apply: (a, b) => a * b },
  '/': { arity: 2, apply: (a, b) => a / b },
  '^': { arity: 2, apply: (a, b) => a ** b },
  'neg': { arity: 1, apply: (a) => -a },
  'sqrt': { arity: 1, apply: (a) => Math.sqrt(a) },
};

const COUNT_WORDS = { 1: 'one', 2: 'two' };

// the operator branch becomes:
    if (token in OPERATORS) {
      const { arity, apply } = OPERATORS[token];
      if (stack.length < arity) {
        throw new Error(
          `Operator "${token}" needs ${COUNT_WORDS[arity]} operand${arity === 1 ? '' : 's'}`,
        );
      }
      const args = stack.splice(stack.length - arity, arity);
      stack.push(apply(...args));
    }
```

WHY: the table now describes each operator *completely* — how many operands and what to do — so the loop is one generic rule and adding `sqrt` is still one line. `splice` hands back the top `arity` items already in pushed order, which even deletes the old "pop `b` first" subtlety. Keeping the error message as `needs two operands` (words, not digits) means the refactor passes the existing test suite untouched — verified by running all the old assertions plus the new `neg`/`sqrt` cases against this version.
