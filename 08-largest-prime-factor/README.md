# 08 — Largest prime factor

**Lesson: performance awareness — "correct" and "usable" are different bars.**

## Run it

```
node 08-largest-prime-factor/original.js
node --test 08-largest-prime-factor/
```

## What's wrong with the original?

It gives right answers on small inputs — and would take hours-to-forever on
`600851475143` (the actual Project Euler input this puzzle comes from). Two compounding
problems:

1. **`isPrime` checks every number below x.** For a candidate near 600 billion that's
   600 billion modulo operations — for *one* candidate.
2. **The outer loop starts from `n` and counts down**, calling that `isPrime` on
   billions of non-factors before reaching anything useful.

Neither is a bug. The program is *correct*. It's still useless, and that's the lesson:
you don't need big-O formalism to catch this — just the habit of asking **"roughly how
many steps is this?"** before trusting a nested loop. Billions × billions = no.

## What changed in the refactor

The algorithm changed shape entirely — this is a case where refactoring means
*rethinking*, not tidying:

- **Divide factors out instead of testing primality.** Divide out all the 2s, then 3s,
  then 4s (which can't divide — their 2s are gone)... any factor that divides is
  automatically prime. The entire `isPrime` function is *deleted*.
- **Stop at `factor * factor <= remaining`.** Factors come in pairs around the square
  root, so past sqrt there's nothing new to find. This is the single most useful trick
  in number-crunching loops. Note it's `remaining`, not `n` — the ceiling drops as we
  divide out, making it faster still.
- **Early exit as a guard clause.** Invalid input throws a `RangeError` on line one,
  and the rest of the function gets to assume clean input. Guard-then-work beats
  wrapping the whole body in an `if`.
- The test suite now includes the "impossible" input — it runs in microseconds, so the
  performance claim is *tested*, not promised in a comment.

## Key takeaway

Estimate steps before you trust a loop. And when a solution is too slow, don't
micro-optimize the slow idea (caching `isPrime`, counting by 2...) — look for the
insight that deletes the expensive part altogether.
