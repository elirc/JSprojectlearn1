// Date helpers for a project deadline tracker.

function addDays(date, days) {
  date.setDate(date.getDate() + days); // modifies... whose date?
  return date;
}

function daysBetween(a, b) {
  var ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)); // exact days, right?
}

var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDate(date) {
  return monthNames[date.getMonth()] + " " + date.getDate();
}

// --- Bug 1: addDays MUTATES the caller's date. ---
var deadline = new Date(2026, 6, 20);   // July 20 (month 6?! see below)
var reminder = addDays(deadline, -7);   // "a week before the deadline"
console.log("reminder:", formatDate(reminder)); // Jul 13, good
console.log("deadline:", formatDate(deadline)); // Jul 13 ?! The deadline
// itself MOVED. reminder and deadline are the SAME object. Every
// Date "helper" that calls set* on its argument does this.

// --- Bug 2: daysBetween breaks when the clocks change. ---
// US DST starts 2026-03-08: that "day" is only 23 hours long.
var beforeDst = new Date(2026, 2, 7);   // Mar 7, local midnight
var afterDst = new Date(2026, 2, 9);    // Mar 9, local midnight
console.log(daysBetween(beforeDst, afterDst));
// 1 (in a DST timezone) — Mar 7 to Mar 9 is obviously 2 days, but the
// span is 47 hours, floor(47/24) = 1. Off-by-one deadlines, twice a year.

// --- Bug 3 (the one everyone hits): months are ZERO-indexed. ---
console.log(new Date(2026, 6, 20).getMonth()); // 6 means JULY
// new Date(2026, 12, 1) doesn't error — it rolls into January 2027.
