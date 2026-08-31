# 07 — First Unique Character

Given a string, return the **index of the first character that appears
exactly once** in the whole string. If every character repeats (or the
string is empty), return `-1`.

"First" means leftmost by position — not the first unique one you happen to
find while counting.

## Signature

```js
/**
 * @param {string} s - any string (may be empty)
 * @returns {number} index of the first non-repeating character, or -1
 */
export function firstUniqChar(s) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `firstUniqChar("leetcode")` | `0` | `l` appears once and is first |
| `firstUniqChar("loveleetcode")` | `2` | `l` and `o` both repeat; `v` at index 2 is the first singleton |
| `firstUniqChar("aabb")` | `-1` | every character appears twice |
| `firstUniqChar("aabbc")` | `4` | the only singleton is the last character |

## Constraints & edge cases

- Empty string → `-1`.
- A single character is always unique: `firstUniqChar("z")` → `0`.
- The answer may be the very first or the very last character.
- **Case-sensitive**: in `"Aa"` the `A` and the `a` are different
  characters, so both are unique and the answer is `0`.
- Spaces, digits and punctuation are ordinary characters and can be the
  answer: `"a b a"` → `2` (the `b`).
- Return an **index**, not the character itself.
- Aim for O(n): two passes over the string, not a scan-inside-a-scan.

## Hints (take them one at a time!)

1. The slow way asks, for each character, "does this appear anywhere else?"
   — and answers by scanning the whole string again. Notice you end up
   recomputing the same facts over and over. What if you computed them all
   once, up front?
2. You already know how to build a tally of character → count (problem 06).
   Build it for the whole string *first*. Now "is this character unique?"
   is a single instant lookup instead of a scan.
3. Two passes. Pass 1: fill a `Map` with `char → count`. Pass 2: walk the
   string **again from index 0**, and return the first index `i` where
   `counts.get(s[i]) === 1`. If the second pass finishes without a hit,
   return `-1`. The second pass is what makes "first" mean *leftmost*.

## Run it

```
node --test dsa/07-first-unique-char/attempt.test.js
```
