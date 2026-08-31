# 12 — Longest Substring Without Repeating Characters

Given a string, find the length of the longest **substring** that
contains no repeated character. A substring is contiguous — letters
sitting next to each other — unlike a subsequence, which may skip.

Return the **length**, not the substring itself.

## Signature

```js
/** @param {string} s @returns {number} */
export function lengthOfLongestSubstring(s)
```

## Worked examples

**Example 1:** `lengthOfLongestSubstring("abcabcbb")` → `3`
The winner is `"abc"` (appearing twice, both length 3). `"abca"` fails —
two `a`s.

**Example 2:** `lengthOfLongestSubstring("bbbbb")` → `1`
Every substring longer than one letter repeats `b`. Best: `"b"`.

**Example 3:** `lengthOfLongestSubstring("pwwkew")` → `3`
The answer is `"wke"` (or `"kew"`). Note `"pwke"` is a sub*sequence*,
not a substring — it skips the middle `w`, so it doesn't count.

**Example 4:** `lengthOfLongestSubstring("abba")` → `2`
`"ab"` or `"ba"`. This one breaks sloppy implementations — see the
constraints below, and test your code on it early.

## Constraints & edge cases

- Empty string → `0`. Single character → `1`.
- The string may contain letters, digits, spaces, punctuation — any
  character. `" "` (one space) → `1`.
- Case-sensitive: `"aA"` has no repeat.
- Strings can be long (say 100 000 chars). Checking every substring is
  O(n³)-ish; aim for **one pass, O(n)**.
- Watch `"abba"` and `"tmmzuxt"` (→ `5`): a repeat can appear *behind*
  where your window has already moved past.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

Brute force: for every starting index, extend right until you hit a
character you've already seen in this run. What structure from
`09-longest-consecutive-sequence` answers "have I seen this?" in O(1)?
</details>

<details><summary>Hint 2 (direction)</summary>

Keep a *window* `[left..right]` that never contains a repeat. Advance
`right` one character per step. When the new character would create a
repeat, don't restart from scratch — *shrink* the window from the left
just enough to make it legal again.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Store the window's characters in a `Set`. When `s[right]` is already in
the set, delete `s[left]` and do `left++` — repeatedly — until
`s[right]` is no longer in the set. Every character enters the set once
and leaves at most once, so the total work stays O(n).
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

`left = 0`, `best = 0`, `seen = new Set()`. For each `right` from 0 to
`s.length - 1`: while `seen.has(s[right])` → `seen.delete(s[left]);
left++`. Then `seen.add(s[right])` and
`best = Math.max(best, right - left + 1)`. Return `best`.
</details>

## Run

```
node --test dsa/12-longest-substring-no-repeat/attempt.test.js
```
