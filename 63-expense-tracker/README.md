# 63 — Expense tracker with charts

**Lesson: persisted data is input, money is integer cents, and every
displayed number comes from one derivation — then charts are just geometry.**

## Run it

Open both HTML files (add `0.10` and `0.20` in the original and read the
total). Then:

```
node --test 63-expense-tracker/
```

## What's wrong with the original?

1. **Money as floats** — `0.10 + 0.20` shows `0.30000000000000004`, and
   because the ledger is *persisted*, the rot compounds forever. Project
   32's lesson, unlearned in the one app where it matters most.
2. **localStorage as an afterthought**: the raw array is stringified with
   no version and no validation. Rename one field and every existing
   user's app breaks on load — `JSON.parse` succeeds, then the code hits
   undefined fields.
3. **Derived numbers computed in three places** that can (and do)
   disagree — the category breakdown double-counts, so categories sum to
   more than the total on screen.
4. `parseFloat("abc")` → `NaN`, pushed into the ledger anyway.

## What changed in the refactor

- **`derive.js` is the data layer, fully unit-tested**: `parseAmount`
  (strict — garbage returns `null`, never NaN), `deriveTotals` (total and
  by-category from *one loop*, so they cannot disagree; the test asserts
  categories sum to the total), `chartData`, `loadState`, `formatCents`
  (`Intl.NumberFormat` — never hand-rolled currency strings).
- **Integer cents everywhere** (project 32). The float test is literal:
  `0.10 + 0.20` is exactly 30.
- **Persistence with a spine**: a `version` field, per-record validation
  on load (project 31 — *stored data is input*), and old/corrupt records
  dropped instead of crashing. The test feeds it float-era ghosts and
  renamed fields.
- **One `dispatch` path** mutates state, saves, and renders (project 59's
  moral in miniature) — persistence can't be forgotten at a call site.
- **The chart is drawn by hand on canvas** — and it's easy, *because* the
  data arrives as sorted rows with precomputed fractions. The canvas code
  does geometry only; the decide/do split reaches the pixels.

## Key takeaway

Apps rot at their boundaries: user input (validate it), stored data
(version and validate it — your past self is an untrusted source), and
derived values (compute, never copy). Get the shapes right and features
like charts fall out as pure rendering. `chartData → fillRect` is all a
bar chart is.
