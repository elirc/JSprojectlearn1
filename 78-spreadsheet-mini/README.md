# 78 — Mini spreadsheet

**Lesson: when values depend on other values, the ORDER you compute in is part of
the program. Find it from the data (topological sort) instead of hoping the loop
order is right.**

## Run it

Open `original.html` and `refactored/index.html` side by side. Both start with the
same sheet: `A1 = =B1+1`, `B1 = =C1*2`, `C1 = 5`, and a `D1`/`E1` pair that refer
to each other.

```
node --test 78-spreadsheet-mini/
```

## What's wrong with the original?

1. **It recomputes in *grid* order, not *dependency* order.** A1 needs B1, but the
   loop reaches A1 first, so A1 is computed from B1's value from the **previous
   pass**. Open the page: A1 says 1 when it should say 11. Type a space in any
   cell and delete it — A1 crawls to 11 over three keystrokes. A ten-cell chain
   needs ten. The values on screen are a *lagging echo* of the real answer, and
   nothing warns you.
2. **Nothing knows what depends on what, so cycles are invisible.** `D1 = E1+1`
   and `E1 = D1+1` is nonsense, and the original answers it with numbers that grow
   by two forever.
3. **`new Function(...)` is `eval` wearing a hat.** The formula language is all of
   JavaScript: type `=(document.title='pwned!')` and the tab renames itself.
   Project 49 already settled this — user input is *data*, never code.
4. **Find-and-replace is not parsing.** The regex doesn't know what a cell name is,
   so `=A11` becomes `=51`: a wrong number, silently.
5. All 25 formulas are re-parsed on every keystroke, and the sheet's data lives in
   the `<input>` elements (project 14's disease, in a grid).

## What changed in the refactor

- **`engine.js` is the whole spreadsheet, minus the pixels** — text in, values out,
  no DOM, no `eval`, so `node --test` can check every rule about what a formula
  means. Four stages: `tokenize` → `parse` → `computeOrder` → evaluate.
- **`computeOrder` is the star: a topological sort** (Kahn's algorithm). Count how
  many uncomputed cells each cell is waiting for; compute the ones waiting for
  nothing; repeat. Chains come out right in **one** pass, whatever order they sit
  in on the grid.
- **Cycle detection is not extra code — it's the leftovers.** Cells that never stop
  waiting are, by definition, waiting on each other, so they get `#CYCLE!` and the
  rest of the sheet still computes. The page even prints the order it used.
- **A real tokenizer and a recursive-descent parser** (project 49's pipeline,
  reused): precedence is the call structure, so `=A1+B2*2` can only mean
  `A1 + (B2*2)`, `A11` is one reference, and `alert` is a syntax error rather than
  a security incident.
- **Errors are values that travel**: `#DIV/0!` in C1 makes `=C1+1` say `#DIV/0!`
  too, because a cell that reads a broken cell cannot honestly be a number.

## Key takeaway

Anything where "changing X should update Y" — spreadsheets, build systems, package
installs, React's re-render order, database migrations — is a dependency graph, and
the fix is always the same two moves: **write down the edges, then sort them.**
Guessing the order with a convenient loop works right up until someone puts the
answer above the question.
