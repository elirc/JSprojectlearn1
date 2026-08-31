# 77 — Text diff

**Lesson: to find what changed, find what *stayed* — and compute the answer as data
before deciding how to draw it.**

## Run it

```
node 77-diff-text/original.js
node 77-diff-text/refactored/cli.js
node --test 77-diff-text/refactored/diff.test.js
```

## What's wrong with the original?

A line-by-line diff — the thing behind `git diff` and every code-review screen. It
compares line 1 to line 1, line 2 to line 2, and gives up entirely if the files
have different lengths:

1. **It reports 100% churn on a one-line change.** Add a comment at the top of a
   3-line file and the output is 3 deletions and 4 additions. Every later line
   shifted by one, and an index-by-index comparison sees a shifted line as a
   changed line. The one job of a diff — *show me the small thing that changed* —
   fails on the most common edit there is. Worse, the length mismatch triggers a
   `return` that dumps both files wholesale.
2. **Even when the lengths match, it can only compare by position.** Insert
   `blueberry` before `banana` and `banana` is reported as changed — it merely
   moved down a row.
3. **Four pasted prefixes, one already drifted.** `"- "`, `"+ "`, `"  "` are typed
   out four times, and one copy lost its space: `"+" + line`. Nothing catches it,
   because nothing returns a value.
4. **Logic welded to I/O.** `diff()` prints as it walks and returns `undefined`.
   You cannot count the changes, build a patch, colourise the output, collapse the
   unchanged parts, or write a single test.

## What changed in the refactor

- **Longest Common Subsequence.** Instead of asking "what changed?", ask "what is
  the longest run of lines, in order, that both files share?" Everything outside
  that is a deletion or an addition. A table of `old.length × new.length` answers
  it, each cell built from cells already computed — the dynamic-programming move
  behind project 70's parser tables.
- **`diffLines` returns `{ type: 'same' | 'add' | 'del', line }` operations**, and
  they're *complete*: filter to `same`+`del` and you rebuild the old file exactly;
  filter to `same`+`add` and you rebuild the new one. A property test asserts that
  on 200 random file pairs, and another checks the `same` count equals a
  brute-force LCS — so the diff is provably **minimal**, not merely plausible.
- **`format.js` never computes and `diff.js` never prints.** That split is what
  buys three views — full, `git`-style summary, and a compact view that collapses
  untouched stretches behind `...` — from one algorithm. The prefixes now live in
  a single `PREFIX` table.
- **The corners are pinned down**: empty files in all four combinations, CRLF,
  a file that is only a blank line, and `toLines('')` being zero lines rather than
  the one phantom empty line `''.split('\n')` hands you.

## Key takeaway

When a problem looks like "spot the differences", try inverting it into "find the
biggest thing in common" — the inverse is often the one with a clean algorithm.
And keep the result as data for as long as you can: the original could only ever
print, while a list of operations can be printed, counted, collapsed, applied, or
tested.
