# 49 — Expression parser

**Lesson: the grand capstone — when flat scans fail, build the tree. A real
tokenizer → parser → evaluator pipeline, and why `eval` is never the answer.**

## Run it

```
node 49-expression-parser/original.js
node 49-expression-parser/refactored/calc.js "2 + 3 * (4 - 1)"
node 49-expression-parser/refactored/calc.js "(2 + 3"
node --test 49-expression-parser/
```

## What's wrong with the original?

- **Attempt 1, `eval`:** one line, correct answers, and a security hole you could
  drive a truck through — `eval` runs *arbitrary JavaScript*, so any user-supplied
  expression is remote code execution (`process.exit(1)`, file deletion, anything).
  It's also unfixable in smaller ways: no custom errors, no "numbers and + − × ÷
  only". **Never eval user input** — the last test proves our version treats
  `process.exit(1)` as a syntax error, because input is *data* here, never code.
- **Attempt 2, left-to-right scan:** `2 + 3 * 4` → `20`. Precedence — `*` binds
  tighter than `+` — can't be expressed by a flat loop, because the answer isn't a
  *sequence*, it's a *shape*: `2 + (3 * 4)` is a **tree**. No spaces → `NaN`;
  parentheses → `NaN`; malformed input → `NaN`. The approach has no concept of
  structure, so every fix is a patch on quicksand.

## What changed in the refactor

Three stages, each half the repo in miniature:

1. **`tokenizer.js`** — characters → tokens. Project 34's walk-with-state loop:
   digits clump into numbers, whitespace vanishes, junk throws *with a position*.
2. **`parser.js`** — tokens → tree, by **recursive descent**: one function per
   precedence level, copied straight from the grammar written at the top of the
   file:
   - `expression` handles `+ -` (loosest), `term` handles `* /` (tighter),
     `factor` handles numbers, `(...)`, and unary minus.
   - **Precedence isn't checked anywhere — it's the call structure**: `term()` glues
     factors with `*`/`/` *before* `expression()` ever sees them as a unit. There's
     a test asserting the tree's literal shape for `2 + 3 * 4`.
   - **Parentheses are one recursive call**: `factor` → `expression` → ... a
     parenthesized group is just a sub-expression demoted to a single factor.
   - Left-associativity (`10 - 4 - 3 = 3`) falls out of the while-loop building
     `node = {op, left: node, right}` — tested, because it's the subtle one.
3. **`evaluate`** — tree → number, trivially, by project 07-style recursion,
   *because the tree already encodes the order*. Hard problems get easy when the
   data structure is right.

Every malformed input the original turned into `NaN` now throws a *specific*
message — unexpected token, missing paren, trailing garbage, bad number with its
position. Compare the error tests to the original's silent `NaN`s.

## Key takeaway

This is the ceiling of the CSV lesson: flat scans handle flat formats; **nested
formats need trees, and recursive descent is how you build them** — a function per
grammar rule, recursion for nesting. JSON parsers, template engines, linters,
compilers: all this pipeline, scaled up. And you now know why, when someone
suggests `eval`, the answer is a parser.
