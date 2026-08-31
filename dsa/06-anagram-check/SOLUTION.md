# Solution walkthrough — Anagram Check

## The naive approach (and what it costs)

The one-liner everybody writes first:

```js
export function isAnagram(a, b) {
  const norm = (s) => s.split("").sort().join("");
  return norm(a) === norm(b);
}
```

Sort both strings; if the sorted forms match, the originals used the same
characters. This is **correct**, short, and honestly fine in a code review.
But it costs **O(n log n)** — sorting is doing far more than you asked. You
only wanted to know *how many of each character*; sorting also decides a
total order among them, work you immediately throw away.

The genuinely bad naive version is the "cross out" one:

```js
for (const ch of a) {
  const i = b.indexOf(ch);
  if (i === -1) return false;
  b = b.slice(0, i) + b.slice(i + 1);   // remove one copy
}
```

Correct, but `indexOf` scans and `slice` rebuilds the whole string, once
per character: **O(n²)**, plus it quietly reassigns `b`.

## The insight

Order is the thing you're being asked to *ignore*. So throw it away
immediately and keep only what matters: **a tally of how many times each
character appears.** Two strings are anagrams exactly when their tallies
are identical.

A `Map` from character → count is that tally, and every operation on it is
O(1). Build one from `a`, then spend it down with `b`.

The "spend it down" framing beats "build two maps and compare them"
because it needs no comparison pass at the end — and it fails fast, the
instant it meets a character `b` can't afford.

One more freebie: if the lengths differ, they cannot possibly be anagrams.
That's an O(1) check that rejects most bad inputs before any real work.
It also makes the ending clean, as you'll see.

## The real approach, step by step

1. `if (a.length !== b.length) return false;`
2. Build `counts`, a `Map` from character to occurrences in `a`:
   ```js
   for (const ch of a) counts.set(ch, (counts.get(ch) ?? 0) + 1);
   ```
   The `?? 0` handles "first time I've seen this character" — `get` returns
   `undefined` for a missing key, and `undefined + 1` is `NaN`.
3. Walk `b` and spend the tally:
   ```js
   for (const ch of b) {
     const left = counts.get(ch) ?? 0;
     if (left === 0) return false;     // absent, or already used up
     counts.set(ch, left - 1);
   }
   ```
4. `return true;`

Why is step 4 safe with no final check? Because of step 1. The two strings
have the same length, and every character of `b` consumed exactly one unit
of tally. So `b` spent exactly as many units as `a` deposited — the map
must be all zeros. Without the length check you'd have to sweep the map
afterwards looking for leftovers, which is exactly the bug in "`"abc"` vs
`"ab"` returns true".

Trace `isAnagram("aab", "abb")`:

| step | detail |
|------|--------|
| lengths | 3 === 3, continue |
| count `a` | `{a: 2, b: 1}` |
| `b`[0] = `a` | left 2 → set 1 |
| `b`[1] = `b` | left 1 → set 0 |
| `b`[2] = `b` | left **0** → `return false` |

Exactly right: same letters, wrong counts.

## Complexity

- **Time: O(n).** One pass to count (`n` map writes), one pass to spend
  (`n` map reads/writes), each O(1). The length check is O(1).
- **Space: O(k)** where `k` is the number of *distinct* characters. For
  lowercase English that's at most 26 — effectively constant. Even for
  full Unicode text it's bounded by `n`, so O(min(n, k)).
- **Versus sorting: O(n log n) time, O(n) space** (`split` builds an array
  of every character). The counting version wins on both, and it can bail
  out early on the first mismatch instead of always doing the full sort.

## Common mistakes

- **Comparing sets instead of counts.** `new Set("aacc")` and
  `new Set("ccac")` are both `{a, c}` — equal, but the strings aren't
  anagrams. Sets forget multiplicity; that's the whole trap.
- **Skipping the length check *and* the final sweep.** With only the
  spend-down loop, `isAnagram("abc", "ab")` returns `true`: `b` never runs
  out of budget because it's shorter. Pick one — the length check is
  cheaper and clearer.
- **`counts.get(ch) + 1` without a default.** `undefined + 1` is `NaN`, and
  `NaN === 0` is `false`, so counts silently become garbage. Use `?? 0`.
- **Using a plain object for the tally.** `counts["constructor"]` is a
  function, not `undefined`, so a string containing that word behaves
  bizarrely. `Map` has no inherited keys. (`Object.create(null)` also
  works, but at that point just use `Map`.)
- **Normalizing case or stripping spaces** because the word "anagram"
  usually implies phrase anagrams. This problem says exact comparison —
  read the spec, then follow it. (The phrase version is variation 1 in
  LEARN.md.)
- **Mutating an input** in a cross-out solution. Even reassigning the `b`
  parameter is a smell; keep inputs read-only.
