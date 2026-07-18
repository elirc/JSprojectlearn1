/**
 * Date helpers with two house rules:
 *
 *   1. NEVER mutate a Date argument — copy first (`new Date(date)`).
 *      Date is one of the few mutable core types; treat every Date
 *      you didn't create as read-only.
 *
 *   2. For CALENDAR math (what date is it?), don't do millisecond
 *      arithmetic on local times — DST makes some days 23 or 25 hours
 *      long. Convert to a timezone-free day number first.
 */

/** A new Date, n days later. The input is untouched. */
export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Calendar days between two dates (time-of-day ignored).
 * Trick: rebuild each date as UTC — UTC has no DST, so every day is
 * exactly 24h and the division is exact.
 */
export function daysBetween(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utcDay(b) - utcDay(a)) / MS_PER_DAY);
}

export function isWeekend(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

/** The next business day ON OR AFTER the given date. */
export function nextBusinessDay(date) {
  let candidate = new Date(date);
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/** "in 3 days" / "2 days ago" / "today" — Intl does the language. */
export function describeRelative(from, to, locale = 'en') {
  const days = daysBetween(from, to);
  if (days === 0) return 'today';
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    .format(days, 'day');
}

/** Format without the month-index trap ever being visible. */
export function formatDate(date, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(date);
}
