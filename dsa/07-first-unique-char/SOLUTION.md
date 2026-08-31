# Solution walkthrough — First Unique Character

## The naive approach (and what it costs)

For each character, ask "does this appear anywhere else?" and answer by
looking:

```js
export function firstUniqChar(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.indexOf(s[i]) === s.lastIndexOf(s[i])) return i;
  }
  return -1;
}
```

(If the first and last occurrence of a character are the same position,
there's only one of it.) This is correct and quite readable. But
`indexOf` and `lastIndexOf` each **scan the string**, and you call them
once per character: **O(n²)**. For a 100,000-character string that's up to
10,000,000,000 character comparisons.

The hand-rolled version of the same idea — a nested loop counting matches —
has exactly the same cost, and is easier to get wrong (forgetting to skip
`j === i` makes every character look repeated).

## The insight

Look at what the inner scan actually computes: *how many times does this
character occur?* And it recomputes that for the `e` in `"leetcode"` twice,
for every repeated character every time it appears. The facts don't change
between questions.

So compute them **once**, up front, into a tally — exactly the
character-count `Map` from problem 06. After one pass, "how many `e`s are
there?" is an O(1) lookup instead of a scan.

Then a second insight, smaller but load-bearing: the answer must be the
**leftmost** unique character, so the second pass has to walk the *string*
in index order. Walking the map instead would give you the right character
(Map iterates in insertion order, which here is first-appearance order),
but not its index — you'd need another `indexOf` to recover it. Walking the
string gives you the index for free.

## The real approach, step by step

1. Build the tally:
   ```js
   const counts = new Map();
   for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
   ```
   The `?? 0` supplies the "first time seen" value; without it you'd be
   computing `undefined + 1` → `NaN`.
2. Walk the string by index, left to right:
   ```js
   for (let i = 0; i < s.length; i++) {
     if (counts.get(s[i]) === 1) return i;
   }
   ```
   The first hit is the answer — no need to keep looking, and no need to
   compare candidates.
3. `return -1;` if the loop ends. This covers both "everything repeats" and
   "the string was empty" (the loop body never ran), so you don't need a
   special empty-string case.

Trace `firstUniqChar("loveleetcode")`:

| pass | detail |
|------|--------|
| count | `l:2, o:2, v:1, e:4, t:1, c:1, d:1` |
| i=0 `l` | count 2 → keep going |
| i=1 `o` | count 2 → keep going |
| i=2 `v` | count **1** → return `2` |

Note this is a **two-pass** algorithm, and that's fine. Two passes is still
O(n): `2n` steps grows linearly, exactly like `n` does. Beginners often
contort themselves trying to do everything in one pass; two clean passes
beat one clever one almost every time.

## Complexity

- **Time: O(n).** Pass 1 does `n` O(1) map writes; pass 2 does at most `n`
  O(1) map reads. Total ~`2n` — linear.
- **Space: O(k)**, where `k` is the number of distinct characters. For
  lowercase English that's ≤ 26, i.e. effectively constant; in general it's
  bounded by `n`.
- **Versus the naive O(n²).** At 100,000 characters: ~200,000 steps versus
  up to ~10,000,000,000. That's the difference between instant and "did it
  crash?".

## Common mistakes

- **Returning the character instead of the index.** `"leetcode"` → `"l"`
  when the spec wants `0`. Read the return type; this is the most common
  miss on this problem.
- **Returning `0` instead of `-1`** for "not found". `0` is a *valid
  answer* (it means "the first character is unique"), so it can't double as
  the failure signal. That's exactly why the convention is `-1`.
- **Scanning the Map in pass 2 and reporting a position from it.** Map
  entries carry no index. You'd have to call `s.indexOf(ch)` to recover
  one, which works but adds a scan for no reason.
- **Checking `counts.get(ch) < 2` instead of `=== 1`.** Works, but if you
  ever build the tally slightly differently (e.g. counts that can be 0
  after a decrement) it stops meaning what you think. Say `=== 1`.
- **Special-casing the empty string.** Unnecessary — both loops simply
  don't run and you fall through to `return -1`. Let the structure handle
  it; fewer branches, fewer bugs.
- **Lowercasing the input.** The spec is case-sensitive: in `"Aa"` both
  characters are unique, so the answer is `0`. Lowercase it first and you
  get `"aa"` → `-1`. (`"aAa"` is the same trap: correct answer `1`,
  normalized answer `-1`.)
- **Using `s.split("")` when you only need to iterate.** It allocates a
  whole array of one-character strings. `for (const ch of s)` doesn't.
