# 71 — A tiny interpreted language

**Lesson: the full pipeline — lexer → parser → tree-walking interpreter —
with real block scoping from a 20-line environment chain.**

## Run it

```
node 71-tiny-lang/original.js
node --test 71-tiny-lang/
```

Tiny looks like this:

```
let a = 0;
let b = 1;
while (a < 100) {          # comments!
  print a;
  let next = a + b;
  a = b;
  b = next;
}
```

## What's wrong with the original?

The split-on-semicolons-plus-eval "language":

1. **The format can't represent nesting.** `split(";")` beheads any block
   at its first semicolon; `if`/`while` take exactly one statement, no
   `else`, no `{}`. The demo fails on `if (x > 2) { print 1; print 2; }`.
2. **One flat global scope, forever** — loop variables leak out, nothing
   shadows, nothing is ever dropped.
3. **Expressions are `eval`'d** with variables regex-spliced in — project
   69's security lesson unlearned (`let x = process.exit(1)` "works"),
   plus no positions when anything goes wrong.

## What changed in the refactor

Three files, three stages, all pure data-in/data-out:

- **`lexer.js`**: characters → tokens with line/column (project 69, plus
  keywords, strings, two-char operators, `#` comments).
- **`parser.js`** uses *both* parsing techniques where each shines:
  **statements by recursive descent** (keyword-led, no precedence),
  **expressions by Pratt** (project 70's table — precedence and
  associativity as data). Blocks are just `statement*` between braces, so
  nesting is free; `else if` chains fall out of one line.
- **`interpreter.js`**: walk the AST carrying an **environment chain** —
  each block gets a child env; `let` declares *here* (shadowing = a nearer
  link, nothing overwritten); assignment *walks the chain* to where the
  variable lives; block ends, env dropped, lifetime for free. This is
  literally how JS scoping works — closures are just environments that
  outlive their block.
- **Runtime with opinions**: `1 + "x"` is an error, not `"1x"` (Tiny
  declines to copy JS's coercion bug factory); conditions must be
  booleans; division by zero and undeclared assignment give positioned,
  suggestion-bearing errors ("did you mean `let`?").
- **`print` output is returned as data**, not spat at the console — the
  whole language is testable end-to-end (12 tests, from fibonacci to
  scoping proofs). And a step budget turns infinite loops into errors.
- **Security by construction**: there is no eval path anywhere, so
  `process` is just an unknown variable (tested).

## Key takeaway

A language is three total functions: `lex`, `parse`, `exec` — every stage
plain data in, plain data out, testable alone. And the deep prize is the
environment chain: once you've built scoping by hand, closures, shadowing,
`var` vs `let`, and "why does my loop variable leak?" stop being trivia —
you've *implemented* the answers. This is the best large refactoring
exercise in the repo: try adding functions (with closures!) and `return`.
