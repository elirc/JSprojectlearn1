# TS 39 — Strictness flags

**Lesson: `strict: true` is the floor, not the ceiling — four latent bugs
that pass strict, and the flag that catches each.**

## Run it

```
npm run typecheck                    (original compiles CLEAN — that's the point)
npx tsc -p typescript/39-strictness-flags/refactored/tsconfig.stricter.json
                                     (original now fails with exactly 4 errors)
```

## What's wrong with the original?

Nothing that `strict` can see — it compiles clean and carries four bugs:

1. **`WEEKDAYS[index].toUpperCase()`** — default indexing pretends arrays
   have no edges; `weekdayName(9)` crashes.
   → **`noUncheckedIndexedAccess`** types indexing `string | undefined`
   (ts#05 for indexes). The highest-value flag not in `strict`.
2. **`{ ...prefs, nickname: undefined }`** — writes a *present*
   undefined, blurring js#25's missing-vs-present distinction (`'nickname'
   in prefs` is now true).
   → **`exactOptionalPropertyTypes`** keeps `?` (may be absent) and
   `| undefined` (present, maybe empty) as different claims — ts#04's
   distinction, enforced.
3. **The grade ladder with no else** — `gradeFor(50)` returns `undefined`
   typed as `string`. → **`noImplicitReturns`**.
4. **The missing `break`** — `describeKey('Enter')` returns `'cancel'`.
   → **`noFallthroughCasesInSwitch`**.

## What changed in the refactor

- `fixed.ts` satisfies the stricter config — and every fix is a *real*
  fix, not appeasement: a loud RangeError at the edge (js#30), key
  *removal* instead of undefined-writing, the forgotten `'F'` grade
  (half the class!), and return-per-case (no `break` to forget — ts#12's
  style for a reason).
- `tsconfig.stricter.json` deliberately includes `../original.ts` so you
  can watch it fail — the config *is* the test harness here.
- **The adoption playbook** (in the code): one flag at a time; the
  genuinely-buggy hits are the payoff; scope to new code if the tail is
  long. Hundreds of errors on day one isn't noise — it's a prioritized
  backlog of latent bugs, generated free.

## Key takeaway

Set `strict: true` on day one, then reach for the second shelf —
`noUncheckedIndexedAccess` above all. Each flag is a class of bug you
stop being able to write; the errors it surfaces in old code were
always there, just quiet.
