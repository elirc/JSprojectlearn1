# 04 — Caesar cipher solver

**Lesson: generalize when the second use case arrives — the rule of three — and let
the machine do the eyeballing.**

## Run it

```
node 04-caesar-solver/original.js
node 04-caesar-solver/refactored/cli.js
node 04-caesar-solver/refactored/cli.js "Mjqqt, Btwqi!"
node --test 04-caesar-solver/
```

## What's wrong with the original?

1. **Copy-paste generalization.** `rot1` and `rot2` are the ROT13 function with one
   number changed — and the plan was 23 more copies. When you catch yourself copying a
   function to change one value, that value wants to be a **parameter**. This is the
   "rule of three": one copy is fine (project 03 rightly didn't generalize), a second
   copy is a warning, a third means extract the abstraction *now*.
2. **The human is part of the algorithm.** The original prints 25 candidates and makes
   *you* find the English one. Recognizing English is exactly the kind of fuzzy job we
   assume needs a person — but a 20-word frequency list does it fine. If your program
   ends with "and then read the output carefully," ask if the program can do the reading.

## What changed in the refactor

- **`caesarShift(text, shift)`** is project 03's function with the shift promoted to a
  parameter. Note `rot13` is now a one-liner — the special case *falls out* of the
  general one, not the other way around.
- **`((shift % 26) + 26) % 26`** — JavaScript's `%` keeps the sign of the left operand
  (`-3 % 26 === -3`), so the double-modulo is the standard idiom to normalize negative
  shifts. Worth memorizing; it bites everyone once.
- **`englishScore` is its own tiny function** with its own test. Scoring is a separate
  *idea* from cracking, so it gets a separate name. `crack` reads like the plan you'd
  say out loud: try every shift, score each, keep the best.
- **`crack` returns data** (`{ shift, plaintext, score }`), and `cli.js` does the
  printing — same split as FizzBuzz, now paying off: the test calls `crack` directly
  and asserts on the result. No console-scraping.

## Key takeaway

Duplication is a *signal*, not a sin. The first copy tells you nothing; the second
tells you what the parameter is. Generalizing at the right moment gives you
abstractions shaped by real needs — generalizing on day one gives you guesses.
