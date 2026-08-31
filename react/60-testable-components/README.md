# React 60 — Testable components

**Lesson: the capstone. Separate deciding from doing, and "is this app
correct?" stops being a question you answer by clicking.**

## Run it

Open both pages side by side and read the **Audit** box before touching
anything. Same three expenses; same three people.

| | original | refactor |
|---|---|---|
| Ana | owes $2.10 | owes **$2.12** |
| balances sum to | `0.020000000000000018` | `0` |
| total owed / moved | $5.40 / $5.38 | $5.40 / $5.40 |

Two cents left the group, and every number on screen looked plausible.

```
node --test react/60-testable-components/refactored/split.test.js
```

## What's wrong with the original?

It works. That's the point — this is the last project in the track, and
the flaw isn't a crash, it's that *nobody can prove anything about it*.

1. **Money is floats.** `10 / 3` is `3.3333…`, `toFixed(2)` makes it
   `3.33`, three of those is `9.99`, and the payer was credited `10`. A
   cent per uneven split, silently. js#32's lesson, in the place it
   actually costs money.
2. **The settlement is short.** Because the balances don't sum to zero,
   the transfers move $5.38 to clear $5.40, and the greedy loop simply
   stops with a cent unaccounted for.
3. **The maths lives in event handlers — three copies of it.**
   `addExpense`, `deleteExpense`, and a third for the first render,
   because nothing is computed until a handler runs. Three copies means
   three chances to fix a bug in two places.
4. **Derived values are stored in state** (project 09), so the screen can
   disagree with the expenses list whenever a handler forgets to recompute.
5. **`parseFloat(amount)` with no validation**: type "ten" and `NaN`
   flows into the books. There is nowhere for the check to live, so
   there is no check.
6. **None of it is testable.** "Does a three-way split lose a cent?"
   currently requires a browser, a click, and someone who thinks to look.

## What changed in the refactor

- **Every decision moved to `split.js`**: `parseCents`, `formatCents`,
  `splitEvenly`, `computeBalances`, `settle`. No React, no DOM, no
  `document`. 24 Node tests, including 5000 generated split cases and
  100 random groups that must all settle to exactly zero.
- **`splitEvenly` is cent-exact**: the remainder is handed out one cent
  at a time from the front, so `splitEvenly(1000, 3)` is `[334, 333,
  333]`. Somebody pays a cent more — that's unavoidable. The choice is
  whether the difference lands on a person or vanishes from the books.
- **The rounding bug is caught by a test, not by a user.** `sum(shares)
  === total` fails instantly on the float version, for every uneven
  split, before it can ship.
- **`computeBalances` has an invariant worth stating**: balances always
  sum to zero, and there's a test that says so. When that breaks it
  breaks by one cent — the kind of wrong nobody notices for a month.
- **`settle` is deterministic** — sorted by amount then by id — so the
  same balances always produce the same instructions, which is what
  makes it testable at all.
- **The component became a shell.** It holds state, renders, and
  dispatches; it computes `balances` and `transfers` during render
  (project 09) rather than storing them. Search it for a `+` or a `/`:
  there isn't one.
- **Validation found a home.** `parseCents` returns `null` for junk, so
  the handler can say "Enter an amount like 12.50" instead of feeding
  `NaN` into the books.

## Key takeaway

This is the thesis of both tracks in one file. **Deciding** — what a
share is, what a balance is, who pays whom — is pure, and belongs
somewhere a test can reach it. **Doing** — rendering, clicking, storing
state — is React's job and needs a browser. The original mixed them, so
its correctness was a matter of opinion; the refactor separated them, so
its correctness is a matter of `npm test`. Nothing about the app got
smarter. It just got *checkable*, and it turned out to be wrong.
