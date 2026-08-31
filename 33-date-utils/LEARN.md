# 📘 Learning Guide: Date Utilities

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

Helper functions for a project deadline tracker:

```js
const deadline = new Date(2026, 6, 20);        // July 20, 2026
addDays(deadline, -7)                          // a new Date: July 13
daysBetween(new Date(2026, 2, 7), new Date(2026, 2, 9))  // 2 — even across a clock change
isWeekend(new Date(2026, 6, 11))               // true (a Saturday)
nextBusinessDay(new Date(2026, 6, 11))         // Monday July 13
describeRelative(today, addDays(today, 3))     // "in 3 days"
formatDate(deadline)                           // "Jul 20, 2026"
```

Running `node original.js` shows three live disasters: computing a reminder *moves the deadline itself*, "days between March 7 and March 9" comes out as 1, and month numbers turn out not to mean what anyone expects.

## 2. Concepts you need first

### The `Date` object

A **`Date`** stores one moment in time — internally just a number: milliseconds since midnight UTC on January 1, 1970 (the **epoch**). You read pieces of it with getters:

```js
const d = new Date(2026, 6, 20);   // year, month, day
console.log(d.getFullYear());      // 2026
console.log(d.getDate());          // 20   (day of month)
console.log(d.getDay());           // 1    (weekday: 0=Sunday ... 6=Saturday)
console.log(d.getTime());          // 1784523600000-ish (ms since 1970)
```

Watch out: `getDate()` is the day-of-month, `getDay()` is the weekday. Everyone mixes these up once.

### The zero-indexed month trap

In `new Date(2026, 6, 20)` and `getMonth()`, months count from **0**. January is 0, July is 6, December is 11:

```js
console.log(new Date(2026, 6, 20).getMonth()); // 6 ... which means JULY
console.log(new Date(2026, 12, 1));            // no error — rolls into Jan 2027!
```

Out-of-range values silently roll over instead of erroring. (Days and years are 1-based and normal. Just months. Yes, really.)

### Dates are mutable

Most core values you work with (strings, numbers) can't be changed in place — but a `Date` can, via setters:

```js
const d = new Date(2026, 6, 20);
d.setDate(d.getDate() + 1);       // d itself is now July 21
```

Combine this with the fact that variables hold **references** (an "address" of the object, not a copy — see project 25/26), and you get the bug: a function that calls `set...` on a Date it was *handed* is editing the caller's object.

```js
const a = new Date(2026, 6, 20);
const b = a;               // same object, two names
b.setDate(1);
console.log(a.getDate());  // 1 — a changed too!
```

The safe copy: `new Date(d)` builds a fresh Date with the same moment.

### Timezones, UTC, and DST

- A **timezone** is a region's offset from the world reference clock.
- **UTC** (Coordinated Universal Time) is that reference: no offsets, no seasonal changes.
- **DST** (Daylight Saving Time) is the ritual of moving local clocks an hour in spring and fall. On the "spring forward" date (March 8, 2026 in the US), the local day is only **23 hours long**; in fall, one day is 25 hours.

So "every day has 24 hours" is *false* in local time — and true in UTC. That single fact breaks any code that computes days as `milliseconds / 86,400,000` on local dates.

```js
// In a US timezone, midnight Mar 7 -> midnight Mar 9, 2026:
// 47 hours, not 48. floor(47 / 24) = 1. Off by one.
```

`Date.UTC(year, month, day)` returns the millisecond timestamp of that calendar date *as if in UTC* — a DST-free number line where day math is exact.

### `Math.floor` vs `Math.round`

`Math.floor` always rounds down (`floor(1.96)` is `1`); `Math.round` goes to the nearest (`round(1.96)` is `2`). The original's `floor` turns "almost 2 days" into 1; the refactor's `round` would forgive even an hour of drift — though after the UTC conversion there's no drift left to forgive.

### `while` loops

Repeat while a condition holds:

```js
let n = 1;
while (n < 5) { n = n * 2; }
console.log(n); // 8
```

Used here to hop forward one day at a time until we're off the weekend.

### Composition — small parts, glued

`nextBusinessDay` doesn't contain any new date logic; it *composes* two existing pieces: `isWeekend` (a question) and `addDays` (a step). Building bigger behavior by gluing small tested parts is the cleanest way code grows.

### `Intl` — built-in formatting for humans

Node's internationalization toolkit replaces hand-rolled name tables:

```js
new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  .format(new Date(2026, 6, 20));   // "Jul 20, 2026"

new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(1, 'day');  // "tomorrow"
new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-2, 'day'); // "2 days ago"
```

`numeric: 'auto'` swaps "in 1 day" for the natural word "tomorrow". A **locale** (`'en-US'`, `'de'`) picks the language — so deleting your `monthNames` array also deletes your future translation problem.

## 3. Walking through the original code

**`addDays`** — four lines, one landmine:

```js
function addDays(date, days) {
  date.setDate(date.getDate() + days); // modifies... whose date?
  return date;
}
```

`setDate` mutates the very Date object the caller passed in, then returns *that same object*. Caller and "result" are one.

**`daysBetween`** — the plausible-looking division:

```js
var ms = b.getTime() - a.getTime();
return Math.floor(ms / (1000 * 60 * 60 * 24)); // exact days, right?
```

Milliseconds apart, divided by milliseconds-per-day. Correct exactly as long as every day in the span had 24 hours — which DST breaks twice a year.

**`formatDate`** — a hand-rolled month table:

```js
var monthNames = ["Jan", "Feb", ..., "Dec"];
return monthNames[date.getMonth()] + " " + date.getDate();
```

Works — in English, forever, and it quietly *depends on* the zero-index trap (as an array index, 0-based is exactly what you want... which is how the trap camouflages itself).

**The demos:** the reminder computation prints `reminder: Jul 13` and then `deadline: Jul 13` — the deadline moved, because `reminder` and `deadline` are the same object. The DST demo prints `1` for the days between March 7 and 9. The month demo shows `getMonth()` returning 6 for July and month 12 rolling silently into next year.

## 4. What's wrong with it (in beginner terms)

**Bug 1 — the moving deadline.** Story: your tracker computes "send a reminder a week early". The reminder logic runs... and now the deadline *is* the reminder date. The user's July 20 deadline displays as July 13. Worse, the corruption doesn't happen where you're looking: any code, anywhere, that innocently calls `addDays(someSharedDate, n)` silently rewrites that date for everyone holding a reference to it. This is project 26's `sort()` mutation bug with higher stakes — nobody audits a *deadline* for having been edited.

**Bug 2 — the 47-hour "day".** March 8, 2026 is 23 hours long in US timezones. So midnight-March-7 to midnight-March-9 is 47 hours, and `floor(47/24) = 1`. Why this is the *worst kind* of bug: it's rare (two dates a year), environmental (only in DST timezones — your colleague in Arizona can't reproduce it), and quiet (no error, just an off-by-one). A subscription billed by `daysBetween` shorts someone a day, twice a year, in some countries.

**Bug 3 — month 6 is July.** You write `new Date(2026, 6, 20)` meaning June 20; you get July 20. And when you accidentally compute month 12, nothing errors — the date rolls into January of *next year* and your "December report" quietly becomes a January one. The refactor's answer isn't to fix the indexing (it can't) but to *confine* it: month numbers appear in as few lines as possible, and all display goes through `Intl`.

## 5. Try it yourself first!

Try fixing all three before reading on. Hints, vague → specific:

1. For `addDays`: the logic is fine; the *target* of `setDate` is wrong. What one line at the top makes it safe?
2. `const copy = new Date(date);` — then set and return the copy. The input stays pristine.
3. For `daysBetween`: the division is only wrong because local days aren't always 24h. Is there a clock where they always are?
4. Rebuild each date's year/month/day with `Date.UTC(y, m, d)` — that gives DST-free timestamps. Subtract those, then divide.
5. Bonus: notice that using only y/m/d also makes time-of-day irrelevant — 8am Monday to 11:59pm Tuesday should be "1 day".
6. For formatting: throw away `monthNames` and let `Intl.DateTimeFormat` produce the text.
7. New feature: `nextBusinessDay(date)` — a `while (isWeekend(candidate))` loop that steps forward with your fixed `addDays`.

## 6. Understanding the refactored solution

**House rule 1 — copy first:**

```js
export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
```

One added line makes mutation impossible. Bonus from `setDate`'s roll-over behavior (the same behavior that was a *trap* in constructors): Jan 31 + 1 day correctly becomes Feb 1, Dec 31 + 1 becomes next year — tested.

**House rule 2 — calendar math on a DST-free number line:**

```js
export function daysBetween(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utcDay(b) - utcDay(a)) / MS_PER_DAY);
}
```

`utcDay` strips a date down to its calendar day and restates it in UTC, where every day is exactly 24h. The subtraction is now exact, the March 2026 test passes with `2`, time-of-day drops out for free, and the result is **signed** — `daysBetween(b, a)` is negative, which `describeRelative` uses for "ago" vs "in".

**Composition:**

```js
export function nextBusinessDay(date) {
  let candidate = new Date(date);
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}
```

No new date arithmetic — just `isWeekend` (a two-line question about `getDay()`) glued to `addDays`. A weekday returns unchanged (well — an untouched *copy*); a Saturday hops to Monday.

**`Intl` does the talking:**

```js
export function describeRelative(from, to, locale = 'en') {
  const days = daysBetween(from, to);
  if (days === 0) return 'today';
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    .format(days, 'day');
}
```

`daysBetween`'s signed result feeds straight in: `3` → "in 3 days", `-2` → "2 days ago", and `numeric: 'auto'` upgrades `1` to "tomorrow". `formatDate` likewise delegates to `Intl.DateTimeFormat` — the month-index trap never surfaces in output code, and other languages are a parameter.

**The tests**: the first one is the anti-mutation contract — compute the reminder, then assert the *deadline* still says 20. Boundary tests cover month/year roll-over. The DST test aims square at March 2026. Others pin time-of-day independence, signedness, weekend detection, the business-day hop, and the exact strings "in 3 days", "2 days ago", "today", "tomorrow".

## 7. Words you learned (glossary)

- **`Date`**: JavaScript's moment-in-time object; internally ms since the epoch.
- **Epoch**: midnight UTC, January 1, 1970 — timestamp zero.
- **Timestamp**: a moment expressed as one number (usually milliseconds).
- **`getDate()` vs `getDay()`**: day of month vs weekday (0=Sunday).
- **Zero-indexed months**: January is 0, July is 6, December is 11.
- **Roll-over**: out-of-range date parts silently spilling into the next unit (month 12 → next January).
- **Mutable / mutation**: changeable in place; `set*` methods edit the Date itself.
- **Reference**: variables hold an object's address; two names can share one Date.
- **Defensive copy**: `new Date(date)` — work on a clone, keep the input pristine.
- **UTC**: the reference clock; no timezone offset, no DST, every day 24h.
- **DST**: seasonal clock shifting; creates 23- and 25-hour local days.
- **`Date.UTC(y, m, d)`**: timestamp of that calendar date as if in UTC.
- **`Math.floor` / `Math.round`**: round down / round to nearest.
- **Signed result**: positive one direction, negative the other.
- **Composition**: building functions by gluing smaller tested ones.
- **`Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`**: built-in date text / "in 3 days"-style text.
- **Locale**: language+region for formatting (`'en-US'`, `'de'`).
- **Environmental bug**: one that only reproduces under certain machine settings (like timezone).

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the shared-reference bug in miniature.** Scratch file: `const a = new Date(2026, 6, 20); const b = a; b.setMonth(0); console.log(a);` Expected: `a` now says January — one object, two names. Then change `const b = a` to `const b = new Date(a)` and see `a` survive.
2. **Delete the copy, watch the contract test catch it.** In `refactored/date-utils.js`, change `addDays` to operate on `date` directly (like the original) and run `node --test 33-date-utils/`. Expected: "addDays returns a new date and DOES NOT touch the input" fails — the deadline moved to the 13th again.
3. **Prove the UTC trick is load-bearing.** Replace `daysBetween`'s body with the original's `Math.floor((b - a) / 86400000)` and run the tests. Expected (if your machine is in a DST-observing timezone like US or EU): the March 2026 test fails with 1 ≠ 2, and "ignores time of day" fails too (8am→11:59pm is 1.66 days, floored to... check!). If you're in a non-DST timezone, only the second fails — *that's* the "environmental bug" lesson in person.
4. **Month roulette.** Scratch file: `console.log(new Date(2026, 12, 1), new Date(2026, -1, 1), new Date(2026, 1, 30));` Predict all three first. Expected: Jan 2027, Dec 2025, and March 2 2026 (Feb 30 rolls over!). No errors anywhere.
5. **Speak another language for free.** Add a scratch call: `describeRelative(today, addDays(today, 3), 'es')` and `formatDate(new Date(2026, 6, 20), 'de-DE')`. Expected: Spanish along the lines of "dentro de 3 días", and a German-styled date like "20. Juli 2026" (abbreviated) — the hand-rolled `monthNames` table could never do this.
