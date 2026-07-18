# 70 — Calculator with a Pratt parser

**Lesson: precedence as a table, associativity as a number — one loop
replaces project 49's ladder, and adding an operator becomes adding a row.**

## Run it

```
node 70-pratt-calculator/original.js    # watch 2^3^2 = 64 and -2^2 = 4
node --test 70-pratt-calculator/
```

## What's wrong with the original?

Project 49's recursive descent, grown two more levels the copy-paste way:

1. **The ladder.** Each precedence level is another hand-written function
   calling the next one down. Comparisons, exponents, logic ops — every
   addition re-wires the chain, and at four levels it's already tedious.
2. **`2^3^2 = 64`.** The while-loop pattern copied from `additive()`
   builds *left*-associative trees; exponentiation is *right*-associative
   (should be `2^(3^2) = 512`). Nothing crashes — it just computes wrong
   numbers, silently.
3. **`-2^2 = 4`.** Unary minus was bolted onto the bottom of the ladder,
   so it binds tighter than `^`. Math says `-(2^2) = -4`. Precedence bugs
   are the quietest bugs there are.

## What changed in the refactor

- **The Pratt core is four lines**: parse a prefix thing; then, while the
  next operator's binding power ≥ the minimum, consume it and recurse
  with *that operator's right binding power*. That one function replaces
  the entire ladder.
- **The language definition became a table.** `'+': [10, 11]`,
  `'^': [40, 40]` — and here's the beautiful part: **associativity is
  just which number you recurse with.** Left-assoc ops recurse with a
  *higher* BP (equal ops won't stack right); right-assoc ops recurse with
  the *same* BP (they will). `2^3^2 = 512` falls out of `[40, 40]`.
- **Unary minus gets its own binding power (30)** — looser than `^` (40),
  tighter than `*` (20): `-2^2 = -4` *and* `3*-2 = -6`, both tested.
- **Variables and function calls** (`sqrt`, `max(1, 2+3)`, …) are a few
  lines each in the prefix parser — growth the ladder made painful.
- **Parse and evaluate stay separate**: the AST is inspectable data (one
  test asserts its exact shape), errors are typed `CalcError`s with
  positions, and evaluation walks the tree with an environment — the
  exact halves project 71 will grow into a language.

## Key takeaway

Pratt parsing is *the* practical answer to operator precedence — it's
inside your JS engine, Rust's compiler, and most linters. The insight
worth keeping: precedence and associativity aren't control flow to
hand-code, they're *data* — two numbers per operator — and the parser is
one loop that reads the table. When syntax is data, extending a language
stops being surgery.
