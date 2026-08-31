# 📘 Learning Guide: Calculator with a Pratt Parser

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A calculator that reads a math expression as **text** and computes the answer:

```js
calc('1+2*3');          // 7   (not 9 — multiplication first)
calc('2^3^2');          // 512
calc('sqrt(16) + x', { x: 5 });  // 9
```

Run the original with `node 70-pratt-calculator/original.js` and it prints its own bugs:

```
2^3^2  = 64      (should be 512)
-2^2   = 4       (should be -4)
1+2*3  = 7       (this one's fine — the EASY cases work)
```

Both versions work the same way at a high level: text → tokens → a tree → a number. The difference is *how the tree gets built* — and whether it's built correctly.

## 2. Concepts you need first

**Tokenizing.** Chopping the text `"1+20*3"` into meaningful pieces called *tokens*: the number `1`, the operator `+`, the number `20`, `*`, `3`. Without this, `20` is just the characters `2` and `0`.

```js
tokenize('1+20');
// [ {type:'num', value:1}, {type:'op', value:'+'}, {type:'num', value:20} ]
```

**Operator precedence.** The math rule that some operators "go first": `1+2*3` means `1+(2*3)` because `*` binds tighter than `+`. Precedence is *why parsing math is hard* — the flat token list has a hidden shape.

**AST (Abstract Syntax Tree).** The nested object that captures that hidden shape. `1+2*3` becomes:

```js
{ op: '+',
  left:  { type: 'num', value: 1 },
  right: { op: '*', left: {value: 2}, right: {value: 3} } }
```

Read it inside-out: the `*` node is *deeper*, so it's computed *first*. Precedence lives in the tree's shape, not in the evaluator.

**Evaluating a tree.** A small recursive function: a number node returns its value; an operator node evaluates both children, then combines them. Deepest nodes finish first — that's the whole trick.

**Associativity.** When the *same* operator appears twice — `10-3-2` — which pair groups first? `-` is **left-associative**: `(10-3)-2 = 5`, not `10-(3-2) = 9`. But `^` (power) is **right-associative** by mathematical convention: `2^3^2` means `2^(3^2) = 512`. Every operator has both a precedence *and* an associativity, and getting either wrong produces wrong *numbers*, not error messages.

**Unary vs binary operators.** Binary operators take two operands (`2+3`). A **unary** operator takes one: the minus in `-5`. The same `-` character plays both roles depending on position. And unary minus has its own precedence: `-2^2` conventionally means `-(2^2) = -4`, but `3*-2` means `3*(-2)` — so unary minus binds *looser* than `^` yet *tighter* than `*`.

**Recursive descent (the "ladder").** The classic parsing style from earlier projects: one function per precedence level, each calling the next-tighter level. `additive()` calls `multiplicative()` which calls `power()` which calls `atom()`. It works, but every new operator means a new rung and re-wiring the chain.

**Binding power (BP).** The Pratt parser's word for precedence-as-a-number. `+` has BP 10, `*` has 20, `^` has 40. "Binds tighter" simply becomes "bigger number". Once precedence is a *number in a table*, one generic loop can replace the whole ladder — that's the entire idea of this project.

**Environment.** A plain object mapping variable names to values, passed to the evaluator: `calc('x+1', { x: 4 })` → 5. This is how calculators (and languages) support variables without the parser knowing any values.

**Sticky regex (`/.../y`).** A regex flag meaning "match starting *exactly* at `lastIndex`, not anywhere later". Handy for tokenizers: set `re.lastIndex = pos`, call `exec`, and a failed match means "illegal character right here" instead of silently skipping garbage.

## 3. Walking through the original code

**The tokenizer** is one line of regex: numbers or single-character operators, mapped into token objects. (Quietly buggy in its own way: anything it doesn't recognize is just dropped — but that's not today's lesson.)

**The ladder.** Four functions, one per precedence level, each with the same shape:

```js
function additive() {
  var left = multiplicative();
  while (peek() && (peek().value === "+" || peek().value === "-")) {
    var op = next().value;
    left = { op: op, left: left, right: multiplicative() };
  }
  return left;
}
```

Read it as: "parse something tighter than me; then, as long as I see my own operators, keep wrapping what I have as the *left* child of a new node." That wrapping direction is why the loop builds **left**-associative trees — the earlier operator ends up deeper-left. `comparison()` sits above `additive()`, `multiplicative()` below it, `power()` below that. Each rung hard-codes which rung comes next.

**The `^` bug**, in `power()`:

```js
while (peek() && peek().value === "^") {
  next();
  left = { op: "^", left: left, right: atom() };
}
```

Same copy-pasted while-loop — so `2^3^2` builds `(2^3)^2`. But `^` is right-associative; the tree is simply the wrong shape, and evaluation dutifully computes the wrong answer: 64 instead of 512.

**The unary-minus bug**, in `atom()`:

```js
if (peek() && peek().value === "-") {
  next();
  return { op: "neg", operand: atom() };
}
```

`atom()` is the *bottom* rung — the tightest-binding place in the ladder. Putting `-` here means it grabs only the very next atom, so in `-2^2` the minus binds to `2` before `^` gets a look: `(-2)^2 = 4` instead of `-(2^2) = -4`.

**The evaluator** is fine — a clean recursive switch. Both bugs live entirely in the parser: wrong tree in, wrong number out.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the ladder doesn't scale.** Story: your boss asks for `<=`, `==`, `and`, `or`, and `%`. Each needs its own precedence level, which means a new function AND editing its neighbors to point at it. Miss one re-wire and `a == b + 1` silently parses as `(a == b) + 1`. At four levels it's tedious; real languages have fifteen-plus. The structure makes every addition surgery.

**Flaw 2 — `2^3^2 = 64`.** Story: a science student uses your calculator for `10^-1^2`... nothing crashes, no error appears, and every answer involving chained powers is quietly wrong. Wrong-answer bugs are far worse than crash bugs: nothing tells you to go looking. The cause was invisible at code-review time — the `^` loop looks *identical* to the `+` loop, and for `+` that loop is correct.

**Flaw 3 — `-2^2 = 4`.** Story: someone graphs `-x^2` expecting the classic downward parabola and gets an upward one. Same silent wrongness, different cause: an operator placed at the wrong *height* in the ladder. In ladder-world, unary minus needs to live *between* `*` and `^` — but the ladder has no natural slot "between rungs", so it got bolted onto the bottom, where it binds too tight. The README's phrase is worth memorizing: *precedence bugs are the quietest bugs there are.*

## 5. Try it yourself first!

1. **Vague:** Both bugs are "the tree has the wrong shape". First just try to fix them inside the ladder — it's possible, and instructive.
2. **Fix `^` in the ladder:** For a right-associative operator, don't loop — after seeing `^`, recurse into `power()` *itself* for the right side (instead of `atom()`), so `3^2` groups first. Check: `2^3^2` → 512.
3. **Fix unary minus in the ladder:** It needs its own rung between `multiplicative` and `power`: a function `unary()` that on `-` recurses into `unary()`, and otherwise calls `power()`. Then make `multiplicative()` call `unary()`. Check: `-2^2` → -4 *and* `3*-2` → -6.
4. **Now the real challenge — delete the ladder.** Write ONE function `parseExpression(minBP)`. Give every operator a numeric binding power in a table (`+`:10, `*`:20, `^`:40). Loop: `left = parse a simple thing; while next operator's BP >= minBP: consume it, left = {op, left, right: parseExpression(<some BP>)}`.
5. **The key question:** what BP do you recurse with for the right side? Try "the operator's own BP + 1" and test `10-3-2` (want 5). Then try recursing with exactly the operator's own BP for `^` and test `2^3^2` (want 512). Sit with *why*: the recursion swallows the rest of the expression as long as operators bind at least that tightly — so "+1" stops equal operators (left-assoc), "+0" lets them stack (right-assoc).
6. **Unary minus for free:** in the prefix step, on `-`, recurse `parseExpression(30)` — a number between `*`'s 20 and `^`'s 40. Both minus tests should pass.

## 6. Understanding the refactored solution

**The tables ARE the language** (`pratt.js`):

```js
const INFIX = {
  '>': [5, 6],
  '+': [10, 11], '-': [10, 11],
  '*': [20, 21], '/': [20, 21],
  '^': [40, 40],           // right-associative
};
const UNARY_MINUS_BP = 30;
```

Each operator gets `[leftBP, rightBP]`. `leftBP` answers "should the loop consume this operator?"; `rightBP` is what the right-side recursion demands. The beautiful part the README points at: **associativity is just the relationship between the two numbers**. `+` is `[10, 11]` — the right side demands *more* than 10, so another `+` (leftBP 10) won't be swallowed by the recursion, and the loop wraps left-associatively. `^` is `[40, 40]` — the right side accepts another `^`, so powers nest rightward. One character of difference in a table row, instead of two differently-shaped functions.

**The engine is one loop:**

```js
function parseExpression(minBP) {
  let left = parsePrefix();
  while (peek().type === 'op' && INFIX[peek().value] && INFIX[peek().value][0] >= minBP) {
    const op = next().value;
    const [, rightBP] = INFIX[op];
    left = { type: 'binop', op, left, right: parseExpression(rightBP) };
  }
  return left;
}
```

That replaces `comparison`, `additive`, `multiplicative`, and `power` — all of them. The ladder still exists conceptually, but as *numbers* the loop compares, not as functions you maintain. Adding `%`? One table row. No re-wiring, nothing else touched.

**`parsePrefix` handles everything that can *start* an expression:** numbers; names (and if a `(` follows a name, it parses a comma-separated argument list — function calls like `max(1, 2+3)` in ~8 lines); parenthesized groups (recurse with `minBP = 0` — parens reset precedence, that's their whole job); and unary minus, which recurses with `UNARY_MINUS_BP = 30` — the "between rungs" slot the ladder couldn't express is literally just the number 30.

**Parse and evaluate stay separate.** `parse` returns the AST as plain inspectable data; `evaluate(node, env)` walks it, looking up variables in the `env` object and functions in a `FUNCTIONS` table (`sqrt`, `abs`, `min`, `max`, `round`). Errors are typed `CalcError`s carrying a position, and division by zero throws rather than yielding `Infinity`. These two halves — parser producing a tree, evaluator walking it with an environment — are exactly what project 71 grows into a full language.

**The tests** (`pratt.test.js`) are a checklist of everything above: the two original bugs by name (512 and -4, plus `(2^3)^2` and `(-2)^2` showing parentheses still let you ask for the other meaning); left-associativity where it matters (`10-3-2 = 5`); variables and unknown-variable errors; multi-argument and nested calls; and one test that `deepEqual`s the *exact tree* for `1+2*x` — pinning the parser's output shape itself, independent of evaluation. The error test asserts messages are specific ("Expected a value", "after the expression") — typed, positioned errors, not shrugs.

## 7. Words you learned (glossary)

- **Token / tokenizer** — a meaningful chunk of input / the stage that produces them.
- **Operator precedence** — which operator groups first (`*` before `+`).
- **Associativity** — how the *same* operator groups with itself: left (`10-3-2` = `(10-3)-2`) or right (`2^3^2` = `2^(3^2)`).
- **AST (Abstract Syntax Tree)** — nested objects encoding an expression's structure; deeper = computed first.
- **Evaluator** — the recursive walk that turns an AST into a value.
- **Unary / binary operator** — takes one operand (`-x`) / takes two (`a-b`).
- **Recursive descent** — parsing with one function per grammar rule.
- **The ladder** — recursive descent's chain of one-function-per-precedence-level.
- **Pratt parser** — one loop + a table of binding powers replacing the ladder.
- **Binding power (BP)** — precedence expressed as a number; bigger binds tighter.
- **Left/right BP** — the pair `[loop threshold, recursion demand]`; their gap (or equality) *is* associativity.
- **Prefix position** — the start of an expression, where numbers, names, `(`, and unary `-` live.
- **Infix position** — between two operands, where binary operators live.
- **Environment (env)** — an object mapping variable names to values at evaluation time.
- **Sticky regex (`y` flag)** — regex that must match at an exact index; makes tokenizers strict.
- **Typed error** — a custom error class (`CalcError`) callers can recognize, carrying data like `pos`.
- **`deepEqual`** — test assertion comparing nested structures value-by-value.

## 8. Experiments to try on the plane (no internet needed)

All plain `node` on local files — fully offline. Work on copies of `pratt.js`, or undo edits after, so tests still pass.

1. **Add the modulo operator `%`.** Add `'%': [20, 21]` to `INFIX`, `%` to the tokenizer's operator character class (`[+\-*/^(),<>%]`), and `case '%': return l % r;` to the evaluator. Expected: `calc('10 % 3')` → 1, and `calc('1 + 10 % 3')` → 2 because 20 outranks 10. Three lines, zero re-wiring — feel the difference from the ladder.
2. **Flip an associativity.** Change `'-': [10, 11]` to `'-': [10, 10]`. Expected: `calc('10-3-2')` now returns 9 (`10-(3-2)`) and the left-associativity test fails. One digit = the whole behavior.
3. **Move unary minus.** Set `UNARY_MINUS_BP` to 50 (above `^`'s 40). Expected: `calc('-2^2')` returns 4 again — you've re-created the original's bug *deliberately*, and now you can name it: wrong binding power.
4. **Add a right-associative assignment-style operator.** Try `'@': [1, 1]` with evaluator rule `case '@': return r;` ("return the right side"). Expected: `calc('1 @ 2 @ 3')` → 3, and `parse('1 @ 2 @ 3')` shows rightward nesting — the `[same, same]` pattern at work at the loosest level.
5. **Predict-then-run.** Before running, write down the tree for `1 > 2 + 3 ^ 2 * -1`. Then check with `console.log(JSON.stringify(parse('1 > 2 + 3 ^ 2 * -1'), null, 2))` in a small script. Expected: `^` deepest, then the unary minus applying to... well, that's the question. If your drawing matches, you own this material.
