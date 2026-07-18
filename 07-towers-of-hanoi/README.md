# 07 — Towers of Hanoi

**Lesson: clean recursion with a real base case, and returning data instead of printing.**

## Run it

```
node 07-towers-of-hanoi/original.js
node 07-towers-of-hanoi/refactored/cli.js 4
node --test 07-towers-of-hanoi/
```

## What's wrong with the original?

1. **The global `moveCount`.** Run `hanoi` twice and it says 14 total moves. The state
   of one call leaks into the next, and every caller must remember to reset a variable
   they shouldn't know exists. Globals that functions secretly write to are the #1
   source of "works alone, breaks together" bugs.
2. **It prints instead of returning.** The moves are the *answer*, and the original
   throws them at the console where no code can use them. Want to animate the solution?
   Verify it's legal? Count moves without a global? All impossible.
3. The recursion itself was actually fine — beginners often think recursion is the hard
   part. Usually the hard part is everything *around* it.

## What changed in the refactor

- **`solveHanoi` returns an array of move objects.** The recursive case builds
  `[...before, thisMove, ...after]` — the structure of the returned data *is* the
  structure of the algorithm. `moveCount` becomes `moves.length`, and it can't drift.
- **The base case is `0`, not `1`.** Beginners often write `if (n === 1) return
  [oneMove]`, which works but duplicates logic — the n=1 case already falls out of the
  n=0 case naturally. The simplest base case is usually the *empty* one: "zero discs,
  zero moves."
- **Look at the third test.** Because moves are data, the test can *replay* them on
  simulated pegs and assert that every single move is legal and the puzzle ends solved.
  That's a far stronger guarantee than eyeballing console output — and it was only
  possible because the solver stopped printing.
- The `2^n - 1` test pins the classic property for all n up to 10 in four lines.

## Key takeaway

"Return data, don't print" isn't about style — it changes what's *possible*. The
printing version can only be watched; the data version can be tested, animated,
verified, counted, and reversed. When a function produces something, `return` it and
let the caller decide what doing looks like.
