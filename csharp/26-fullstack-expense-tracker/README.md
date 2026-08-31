# CS 26 — Fullstack expense tracker

**Lesson: derived data is computed, never stored. One source of truth, one
derivation, and every panel on screen agrees by construction — js#63's rule,
now enforced server-side.**

## Run it

```
dotnet run csharp/26-fullstack-expense-tracker/original.cs
dotnet run --project csharp/26-fullstack-expense-tracker/refactored
dotnet run --project csharp/26-fullstack-expense-tracker/refactored -- test
```

Open http://localhost:5026 (one app at a time). In the original: add three
expenses, **delete one**, then compare the page with `/api/summary` and
`/api/stats`. Three answers to "how much did I spend?" — two right, one
frozen in the past.

## What's wrong with the original?

1. **The summary math exists in triplicate**: once in the HTML endpoint,
   once in `/api/summary`, once in `/api/stats`. Three hand-typed copies of
   the same loops — the fizzbuzz duplication problem wearing a money hat.
2. **THE BUG: `/api/stats` reads a cache.** "For performance", add keeps
   `cachedTotal` and `cachedByCategory` up to date. Delete... doesn't. One
   forgotten update site and the stats endpoint disagrees with reality
   forever. That's not bad luck — it's the *guaranteed* fate of stored
   derived data: every mutation site must remember every cache, and one day
   one won't.
3. **Dates are strings** (`"2026-08-21"`, hopefully) and month filtering is
   `StartsWith` on them; **amounts are parsed from form text** with a silent
   `TryParse` — `"abc"` becomes a 0-cost expense, in whatever number format
   the server's OS culture happens to use.
4. No validation anywhere: blank categories and zero amounts sail straight
   into the list.

## What changed in the refactor

- **`ExpenseBook` is the single source of truth.** The expense list is the
  only stored data. `Summarize(year?, month?)` derives total, per-category
  totals (LINQ `GroupBy` → `Sum`, cs#04) and biggest category **fresh from
  the list on every call**. Delete an expense and every number simply comes
  out right, because no number was ever stored.
- **The three endpoints collapsed into one** `/api/summary` — there's nothing
  for endpoints to disagree about when none of them do math.
- **`decimal` for money, `DateOnly` for dates.** C#'s `decimal` is exact for
  money — the test proves `0.10m + 0.20m == 0.30m`, the same lesson js#63
  needed integer cents for. Real date types make "same month" a comparison,
  not string surgery.
- **Validation at the door** (cs#17): amount > 0, non-blank fields, strict
  `yyyy-MM-dd` parsing — garbage gets a 400, never a ledger entry.
- **The frontend re-fetches list + summary together** after every change and
  renders both from that one response pair — so the two panels can't drift
  apart on screen either. A month filter just adds `?year=&month=` to the
  summary call.
- Tests cover the empty book, one category, ranking + "rows sum to the
  total" (js#63's anti-bug assertion), month filtering, validation, and the
  delete-then-recompute path that killed the original.

## Key takeaway

Store facts; compute conclusions. A cache is a *copy* of a conclusion, and
copies drift — the react#09 lesson (don't put derived values in state) is
the same law on the server. If a number can be computed from your data,
computing it every time is the version that's easy to change; store it only
when a profiler tells you to, and then treat every mutation site as a bug
farm.
