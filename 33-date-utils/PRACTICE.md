# 🏋️ Practice: Date Utilities

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Copy-first, tested everywhere (warm-up)

Only `addDays` has a "does not touch the input" test. Write one for `nextBusinessDay`: pass Saturday July 11 2026, and assert the input still reads the 11th afterwards. In the same test, assert that `addDays(d, 0)` returns a *different object* (`copy !== d`) holding the *same moment* (`copy.getTime() === d.getTime()`).

**Practices:** project 25's identity-vs-contents distinction, applied to the mutable type where it matters most.

**Hint:** `assert.notEqual(copy, d)` compares references; `.getTime()` compares the moment.

### ⭐⭐ 2. `addBusinessDays(date, n)` (core)

Write `addBusinessDays(date, days)`: move forward `days` *working* days, skipping Saturdays and Sundays, never mutating the input. Expected (July 2026): Friday the 10th + 1 business day = Monday the 13th; + 2 = Tuesday the 14th; Thursday the 9th + 1 = Friday the 10th. The input date is untouched.

**Practices:** composing `addDays` + `isWeekend` — small parts, glued, house rules inherited.

**Hint:** walk one calendar day at a time and only decrement the counter when the landing day is not a weekend.

### ⭐⭐ 3. `startOfWeek(date)` (core)

Write `startOfWeek(date)` returning the Monday of that date's week, at midnight (a policy: weeks start Monday, Sunday belongs to the *previous* Monday's week — write it down). Expected: Wednesday July 8 2026 → Monday July 6; Sunday July 12 → July 6; Monday July 6 → itself; Saturday August 1 → Monday July 27 (crosses a month boundary); and a 12:30pm input comes back with hours `0`.

**Practices:** `getDay()` arithmetic — turning Sunday-first (0–6) numbering into Monday-first.

**Hint:** `(date.getDay() + 6) % 7` gives "days since Monday". Rebuild midnight with `new Date(y, m, d)`.

### ⭐⭐ 4. `age(birthDate, onDate)` (core)

Write `age` returning completed years: the year difference, minus one if the birthday hasn't happened yet in `onDate`'s year. Expected for someone born July 20 2000: on July 19 2026 → `25`; on July 20 2026 → `26`; on January 1 2026 → `25`; on December 31 2026 → `26`.

**Practices:** true calendar math — where subtracting milliseconds and dividing by "a year" would drift on leap years.

**Hint:** "birthday not reached" is: earlier month, OR same month and earlier day.

### ⭐⭐⭐ 5. `businessDaysBetween(a, b)` (challenge)

Count working days between two dates: business days strictly *after* `a`, up to and *including* `b` (state that policy in a comment), signed like `daysBetween`. Expected: Friday July 10 → Monday July 13 is `1`; Monday July 6 → Monday July 13 is `5`; reversed gives `-1`; same day gives `0`. Include a test spanning the March 2026 DST weekend (Friday March 6 → Monday March 9 = `1`) to prove your loop inherits `daysBetween`'s DST safety.

**Practices:** building a bigger calendar tool from the DST-proof primitives instead of raw millisecond math.

**Hint:** walk with `addDays` while `daysBetween(cursor, b) > 0`; handle the negative direction by recursing with the arguments swapped and negating.

## Solutions

### 1. Copy-first tests

```js
test('nextBusinessDay does not mutate; addDays(d, 0) is a fresh copy', () => {
  const saturday = new Date(2026, 6, 11);
  nextBusinessDay(saturday);
  assert.equal(saturday.getDate(), 11);
  const d = new Date(2026, 6, 20);
  const copy = addDays(d, 0);
  assert.notEqual(copy, d);
  assert.equal(copy.getTime(), d.getTime());
});
```

**Why:** the house rule is only real where it's tested. `nextBusinessDay` *does* copy (`new Date(date)`), and this pins it; the `addDays(d, 0)` pair separates "same object" from "same moment" — precisely the reference-vs-value lesson.

### 2. `addBusinessDays`

```js
export function addBusinessDays(date, days) {
  let result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result = addDays(result, 1);
    if (!isWeekend(result)) remaining--;
  }
  return result;
}
```

**Why:** stepping one calendar day at a time and counting only weekdays is the honest algorithm — no `days * 1.4` approximations. Because every step goes through `addDays`, the month/year rollovers and the never-mutate contract come along for free. Verified with node: Fri+1 → Mon 13, Fri+2 → Tue 14.

### 3. `startOfWeek`

```js
export function startOfWeek(date) {
  const offset = (date.getDay() + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  const monday = addDays(date, -offset);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
}
```

**Why:** `getDay()` is Sunday-first; the `+6 % 7` shuffle re-bases it to Monday-first in one expression instead of a seven-branch switch. Rebuilding via `new Date(y, m, d)` zeroes the time *and* returns a fresh object. Verified across a month boundary (Aug 1 → Jul 27).

### 4. `age`

```js
export function age(birthDate, onDate) {
  const years = onDate.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    onDate.getMonth() < birthDate.getMonth() ||
    (onDate.getMonth() === birthDate.getMonth() && onDate.getDate() < birthDate.getDate());
  return years - (beforeBirthday ? 1 : 0);
}
```

**Why:** age is a calendar question, not a duration — "how many birthdays have passed", which milliseconds-per-year arithmetic gets wrong around leap years and DST. Comparing (year, month, day) fields directly keeps the whole computation in DST-free territory. Verified on both sides of the birthday.

### 5. `businessDaysBetween`

```js
export function businessDaysBetween(a, b) {
  // POLICY: counts business days after `a`, up to and including `b`. Signed.
  if (daysBetween(a, b) < 0) return -businessDaysBetween(b, a);
  let count = 0;
  let cursor = new Date(a);
  while (daysBetween(cursor, b) > 0) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor)) count++;
  }
  return count;
}
```

**Why:** both the loop condition and the sign check delegate to `daysBetween`, so the DST-proof UTC-day-number comparison is the only date arithmetic in play — the March-2026 test passes in any timezone. The exclusive-start/inclusive-end policy is stated, not implied, exactly as the README demands of rounding rules. Verified with node, including the DST-crossing case and both signs.
