# 18 — Yahtzee scoring

**Lesson: rules as pure functions in a table, and table-driven tests — the sweet spot
for test-driven development.**

## Run it

```
node 18-yahtzee/original.js
node --test 18-yahtzee/
```

## What's wrong with the original?

1. **One 90-line function with 9 else-if arms.** The counting loop ("how many of each
   face?") is copy-pasted **five times** — into three-of-a-kind, four-of-a-kind, full
   house, yahtzee... The upper section repeats a target-mapping if-ladder that is
   itself pure duplication.
2. **Unknown categories silently score 0.** `score(dice, "fullHous")` — a typo —
   returns 0 with no complaint. In a real game that's a player quietly robbed of 25
   points, and nothing anywhere will ever tell you why.
3. Nothing is independently testable: you can't test "the full house rule" — only the
   whole switch.

## What changed in the refactor

- **`counts(dice)` is the one true counting function.** Almost every Yahtzee rule is a
  question about face-counts; write that helper once and the categories collapse into
  one-liners: full house is literally `perFace.includes(3) && perFace.includes(2)`.
- **Categories are entries in a `CATEGORIES` table** — project 10's operator table,
  scaled up. Look at the two *function factories*: `ofAKind(n)` returns the scoring
  function for any n, so `threeOfAKind: ofAKind(3)` and `fourOfAKind: ofAKind(4)` share
  one implementation. Same for `straight(4, 30)` / `straight(5, 40)`, which also
  replaces the original's hand-enumerated `1234 / 2345 / 3456` combinations with a
  loop over start positions. A function that returns a function is just configuration
  you get to name.
- **Typos throw**, with the list of valid categories in the message. Dice are validated
  too (five dice, faces 1–6) — one guard at the boundary, every category trusts it.
- **The test file is a rulebook you can execute.** The `CASES` table reads like the
  Yahtzee instructions, including the traps: five-of-a-kind is *not* a full house;
  a large straight *does* contain a small straight; three-of-a-kind sums *all* dice.
  This is the TDD workflow at its best — each rule became a row, each row forced the
  code to handle it. When rules are pure functions, a test is one line per fact.

## Key takeaway

When requirements arrive as a list of rules (scoring, pricing, permissions, tax
brackets...), mirror the list in code: one small pure function per rule, in a table,
with a table of test cases beside it. The code stays shaped like the requirements,
so requirement changes stay small code changes.
