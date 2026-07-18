# 26 — Array utilities

**Lesson: the two `.sort()` traps everyone hits, mutation as a contract violation,
and `keyOf` functions as the reusability trick.**

## Run it

```
node 26-array-utils/original.js
node --test 26-array-utils/
```

## What's wrong with the original?

1. **`[100, 9, 80, 12].sort()` returns `[100, 12, 80, 9]`.** With no comparator,
   `sort()` converts elements to *strings* and sorts alphabetically — `"9" > "80"`.
   This is probably the most-hit trap in all of JavaScript. Always pass a comparator
   for anything but plain strings.
2. **`sort()` (and `reverse()`) mutate the array in place.** `topScores(scores)`
   silently reordered the *caller's* leaderboard — a spooky-action bug that surfaces
   far from its cause, in whatever other code was relying on that array's order.
   Copy first: `[...items].sort(...)`. (Newer runtimes have `toSorted()`, which is
   this exact idiom built in.)
3. **The manual dedupe is an O(n²) nested scan** — a `Set` does it in one pass, and
   `[...new Set(items)]` even preserves first-seen order.
4. **`groupBy` into a plain object** — project 02's `__proto__`/`constructor` key
   hazard again, now with team names as the attacker.

## What changed in the refactor

- **House rule #1: never mutate inputs.** Every function returns fresh data, and
  there's a test that *asserts* `sortBy` leaves its input untouched. A utility that
  mutates its argument has a side effect its signature doesn't admit to.
- **House rule #2: take `keyOf` functions, not property names.** `sortBy(players,
  p => p.score)` — the caller supplies *how to measure*, so the same five functions
  cover any shape of data. This is the design of lodash and of `Array.prototype.map`
  itself: **higher-order functions** (functions taking functions) are how utilities
  stay general. Project 36 consumes these exact utilities.
- **The comparator contract, spelled out**: return negative / zero / positive.
  Comparing extracted keys with `<`/`>` sidesteps the "subtract them" habit
  (`a - b`), which breaks on strings and on huge numbers.
- `chunk` validates its size argument loudly (`RangeError`) — an infinite loop is the
  alternative when `size` is `0`.

## Key takeaway

Know your standard library's sharp edges: `sort()` is alphabetical-by-default *and*
mutating — the double trap in one method. And when you write a utility, take the
key-extractor as a function parameter; it's the difference between a helper you use
once and one you use in every project after.
