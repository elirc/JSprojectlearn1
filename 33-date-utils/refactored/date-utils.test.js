import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, daysBetween, isWeekend, nextBusinessDay, describeRelative,
} from './date-utils.js';

test('addDays returns a new date and DOES NOT touch the input', () => {
  const deadline = new Date(2026, 6, 20); // July 20 (months are 0-indexed!)
  const reminder = addDays(deadline, -7);
  assert.equal(reminder.getDate(), 13);
  assert.equal(deadline.getDate(), 20); // the original moved this to the 13th
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays(new Date(2026, 0, 31), 1).getMonth(), 1); // Jan 31 -> Feb 1
  assert.equal(addDays(new Date(2026, 11, 31), 1).getFullYear(), 2027);
});

test('daysBetween across the March 2026 DST change is exact', () => {
  // The original's floor(ms/86400000) says 1 here in a DST timezone.
  const beforeDst = new Date(2026, 2, 7);
  const afterDst = new Date(2026, 2, 9);
  assert.equal(daysBetween(beforeDst, afterDst), 2);
});

test('daysBetween ignores time of day', () => {
  const morning = new Date(2026, 5, 1, 8, 0);
  const night = new Date(2026, 5, 2, 23, 59);
  assert.equal(daysBetween(morning, night), 1);
});

test('daysBetween is signed', () => {
  const a = new Date(2026, 5, 1);
  const b = new Date(2026, 5, 4);
  assert.equal(daysBetween(a, b), 3);
  assert.equal(daysBetween(b, a), -3);
});

test('isWeekend', () => {
  assert.equal(isWeekend(new Date(2026, 6, 11)), true);  // Saturday
  assert.equal(isWeekend(new Date(2026, 6, 12)), true);  // Sunday
  assert.equal(isWeekend(new Date(2026, 6, 13)), false); // Monday
});

test('nextBusinessDay skips the weekend (and leaves weekdays alone)', () => {
  const saturday = new Date(2026, 6, 11);
  assert.equal(nextBusinessDay(saturday).getDate(), 13); // Monday
  const wednesday = new Date(2026, 6, 8);
  assert.equal(nextBusinessDay(wednesday).getDate(), 8); // already fine
});

test('describeRelative speaks human', () => {
  const today = new Date(2026, 6, 9);
  assert.equal(describeRelative(today, addDays(today, 3)), 'in 3 days');
  assert.equal(describeRelative(today, addDays(today, -2)), '2 days ago');
  assert.equal(describeRelative(today, today), 'today');
  assert.equal(describeRelative(today, addDays(today, 1)), 'tomorrow'); // numeric:'auto'
});
