# 32 — Money & shopping cart

**Lesson: floating point is not broken, it's binary — and money must be integer cents.**

## Run it

```
node 32-money-cart/original.js
node --test 32-money-cart/
```

## What's wrong with the original?

Run it. `3 × $10.35 + 2 × $0.10` totals `31.249999999999996`.

1. **`0.1 + 0.2 !== 0.3` is not a JavaScript bug** — binary floats can't represent
   most decimal fractions, the same way decimal can't write ⅓ exactly. Every
   arithmetic step adds a little dust, and sums of many items accumulate it.
2. **`toFixed(2)` only launders the display.** The dust stays in the *data*, so the
   discount computation inherits it, and the customer misses the free-shipping
   threshold by `4e-15` dollars — a comparison bug you could stare at for hours.
   And `toFixed` has its own surprise: `(1.005).toFixed(2)` is `"1.00"` (because
   1.005 *already* isn't 1.005 in binary).
3. Money as floats eventually fails an accountant: pennies appear and vanish.

## What changed in the refactor

- **THE RULE: store and compute in integer cents.** `1035`, not `10.35`. Integer
  adds and multiplies are *exact* in JS up to ~9×10¹⁵ (about $90 trillion in cents).
  This is how real payment systems work — Stripe's API speaks integer cents for
  exactly this reason. The first test replays the original's cart and asserts
  `3125`, exactly.
- **Floats appear at exactly two edges, each handled once:**
  - *In*: `toCents` does **one** `Math.round(value * 100)` to absorb input dust
    (note `10.35 * 100` is `1034.9999…` — even the conversion needs the round).
  - *Out*: `formatCents` divides by 100 for `Intl.NumberFormat`, which handles
    symbols, thousands separators, and other currencies as *parameters*.
- **Rounding policy is explicit.** `applyDiscountCents` documents half-up rounding
  as a *decision* — when money rounding is implicit, nobody chose it, and someday an
  auditor asks who did.
- Totals via `reduce` — the natural fold for "combine many into one" (project 26's
  toolkit in use).

## Key takeaway

For any value where exactness matters — money, quantities, ratings ×10 — store
integers of the smallest unit and convert at the edges. More generally: know which
of your numbers are *measurements* (floats fine) versus *ledger entries* (must be
exact), and never let the second kind touch floating point except to be displayed.
