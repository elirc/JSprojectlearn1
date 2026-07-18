# 10 — RPN Calculator

**Lesson: data-driven dispatch. Adding an operator should cost one line.**

## Run it

```
node 10-rpn-calculator/original.js
node --test 10-rpn-calculator/
```

## What's wrong with the original?

1. **Four branches that are the same five lines** with a different symbol in the
   middle: pop, pop, push. The only thing that varies is *which math to do* — so that's
   the part that should be data. In the original, adding `^` means copy-pasting a fifth
   branch (and `b5`/`a5`, apparently).
2. **Failure is silent.** Run the original's last three lines: a missing operand gives
   `NaN`, a *leftover* operand quietly returns the wrong number, and a typo becomes
   `NaN`. Silent wrong answers are the worst failure mode a calculator can have.

## What changed in the refactor

- **`OPERATORS` maps each symbol to its function.** The loop shrinks to a single rule:
  "if the token is in the table, apply it; otherwise it must be a number." The `^`
  operator in the table was added *after* the fact — one line, no other edits. That's
  the test of good structure: **the cost of a change matches the size of the change.**
  This is the same rules-as-data move as project 06's `BEATS` table.
- **Three explicit error checks** replace three silent failures, each mapped to a test:
  - underflow (`3 +`) → "needs two operands"
  - leftovers (`3 4`) → "values left on the stack"
  - garbage (`four`) → "Unknown token" — note `Number(x)` + `Number.isNaN` instead of
    `parseFloat`, because `parseFloat("4abc")` happily returns `4`.
- **`split(/\s+/).filter(Boolean)`** handles messy spacing; the original's
  `split(" ")` produces empty-string tokens on a double space, which become `NaN`.
- Note the comment on `const b = stack.pop()` — b comes off first because it went on
  last. That's a *why* comment: it records the one non-obvious fact, instead of
  narrating what the code plainly does.

## Key takeaway

When you see N branches that differ only in one operation, fold them into a lookup
table of functions. The if-chain version buries the interesting part (the math) in
plumbing; the table version puts all the plumbing in one place and makes the
interesting part a list you can read — and extend — at a glance.
