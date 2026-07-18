# 33 — Date utilities

**Lesson: `Date` is mutable and DST is real — copy before you touch, and do calendar
math on day numbers, not milliseconds.**

## Run it

```
node 33-date-utils/original.js
node --test 33-date-utils/
```

## What's wrong with the original?

Three classics, each demonstrated live in the file:

1. **`addDays` mutates its argument.** Computing "a week before the deadline" *moved
   the deadline*. `Date` is one of the few mutable core objects, and every `setDate`/
   `setMonth` on a Date you were *handed* edits the caller's copy — the same
   spooky-action bug as project 26's `sort()`, with higher stakes.
2. **Millisecond division breaks on DST.** March 8, 2026 is a 23-hour day in US
   timezones, so midnight-Mar-7 → midnight-Mar-9 is 47 hours, and
   `floor(47h / 24h) = 1` — off by one, twice a year, only in some timezones, only
   for spans crossing the change. The worst kind of bug: rare, environmental, and
   quiet.
3. **Months are zero-indexed.** `new Date(2026, 6, 20)` is *July*. And out-of-range
   values don't error — month 12 rolls silently into next January. Every JS developer
   gets bitten once; the refactor confines month numbers to as few places as
   possible and lets `Intl` do all display.

## What changed in the refactor

- **House rule: copy first.** Every function begins `new Date(date)` and returns the
  copy. The first test asserts the input is untouched — the same "never mutate
  arguments" contract as project 26, now for the type where violations hurt most.
- **`daysBetween` converts to UTC day numbers** (`Date.UTC(y, m, d)`) before
  subtracting. UTC has no DST, every UTC day is exactly 24h, so the arithmetic is
  exact — and time-of-day drops out for free, which is what "days between" should
  mean anyway. There's a test aimed square at the March 2026 boundary.
- **`Intl` replaces the hand-rolled month table** — `DateTimeFormat` for dates,
  `RelativeTimeFormat` for "in 3 days"/"2 days ago"/"tomorrow" (`numeric: 'auto'`
  gives the natural words). Deleting the `monthNames` array deletes its localization
  problem too.
- `nextBusinessDay` composes `isWeekend` + `addDays` — small parts, glued.

## Key takeaway

Dates deserve paranoia: copy anything you didn't create, keep month numbers out of
sight, and never trust `ms / 86400000` for calendar questions — convert to a DST-free
representation first. (When date work gets heavier than this file, that instinct is
telling you to reach for a library like date-fns or Temporal.)
