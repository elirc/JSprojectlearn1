# 09 — Best stock trading period

**Lesson: naming intermediate values is what makes an algorithm readable — plus the
classic single-pass pattern.**

## Run it

```
node 09-best-stock-trade/original.js
node --test 09-best-stock-trade/
```

## What's wrong with the original?

1. **The names carry zero information.** `m`, `a`, `b`, `p`, `r`. To understand the
   function you must *execute it in your head* and reconstruct what the author meant.
   Compare the refactor: `profitIfSoldToday > best?.profit` reads as the sentence it
   is. Naming isn't cosmetic — it's the difference between *reading* code and
   *decoding* it.
2. **`return [a, b, m]`** — positional results make every caller memorize an order,
   and `r[1]` at the call site is meaningless. An object with named fields
   (`{ buyDay, sellDay, profit }`) documents itself.
3. **Magic `-1` for "no trade".** The caller must know the convention and remember to
   check. Returning `null` makes "there is no answer" a first-class, un-ignorable case.
4. **O(n²) pairs.** Fine for 8 prices; at a million data points that's ~500 billion
   comparisons.

## What changed in the refactor

- **The single-pass insight:** for any sell day, the only buy day worth considering is
  the cheapest day *so far*. So one forward walk, tracking `cheapestPriceSoFar`, asking
  "what if I sold today?" at each step. The "buy before sell" constraint is satisfied
  by construction — the cheapest-so-far is always in the past.
- **The two named intermediates ARE the algorithm.** `cheapestPriceSoFar` and
  `profitIfSoldToday` — name those two things well and the code explains itself.
  When a line feels dense, don't add a comment; extract a named variable.
- **Look at the last test.** It cross-checks the clever algorithm against the dumb
  brute-force on 50 random inputs. When you replace a slow-but-obvious solution with
  a fast-but-subtle one, *keep the obvious one as the referee*. This is a mini
  property-based test and it will catch off-by-one errors nothing else catches.

## Key takeaway

If you need comments to explain what `m` and `a` are, the fix is not comments — it's
names. Variables are free; rename until the code reads like the explanation you'd
give a colleague.
