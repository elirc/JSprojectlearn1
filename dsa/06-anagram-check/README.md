# 06 — Anagram Check

Two strings are **anagrams** when one is a rearrangement of the other: the
same characters, each appearing the same number of times. Write a function
that answers `true` or `false`.

Compare the strings **exactly as given** — case matters, and spaces and
punctuation count as characters. (`"Listen"` and `"silent"` are *not*
anagrams here, because `"L"` and `"l"` are different characters.)

## Signature

```js
/**
 * @param {string} a - first string (may be empty)
 * @param {string} b - second string (may be empty)
 * @returns {boolean} true if b is a rearrangement of a
 */
export function isAnagram(a, b) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `isAnagram("listen", "silent")` | `true` | same six letters, rearranged |
| `isAnagram("rat", "car")` | `false` | `t` isn't in `"car"` |
| `isAnagram("aab", "abb")` | `false` | same letter *set*, different counts |
| `isAnagram("a", "ab")` | `false` | different lengths can never match |

## Constraints & edge cases

- Either string may be empty. `isAnagram("", "")` is `true` (nothing is a
  rearrangement of nothing); `isAnagram("", "a")` is `false`.
- **Counts matter, not just which letters appear.** `"aacc"` vs `"ccac"` is
  `false` — both use only `a` and `c`, but not the same number of each.
- Case-sensitive: `"Ab"` and `"ba"` → `false`.
- Non-letters are ordinary characters: `"a b"` and `"b a"` → `true`
  (two letters and a space each).
- Aim for O(n) time — one pass to count, one pass to check. Sorting both
  strings also works but costs O(n log n).

## Hints (take them one at a time!)

1. What's the cheapest possible thing you could check *first*, that rules
   out most non-anagrams instantly? (Think about how long each string is.)
2. Forget order entirely — anagrams are about *how many of each character*.
   What structure lets you keep a tally per character and look one up
   instantly? (You built exactly this kind of memory in problem 01.)
3. Two passes. First loop over `a` and count each character in a `Map`
   (`counts.set(ch, (counts.get(ch) ?? 0) + 1)`). Then loop over `b`,
   *decrementing*: if a character is missing or its count is already 0,
   return `false`; otherwise subtract 1. Survive both loops (with equal
   lengths already checked) and it's `true`.

## Run it

```
node --test dsa/06-anagram-check/attempt.test.js
```
