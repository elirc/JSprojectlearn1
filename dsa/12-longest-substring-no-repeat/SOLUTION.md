# Solution — Longest Substring Without Repeating Characters

## The naive approach and its cost

For every starting index `i`, walk right collecting characters into a
Set until you hit a duplicate; record the run length:

```js
let best = 0;
for (let i = 0; i < s.length; i++) {
  const seen = new Set();
  let j = i;
  while (j < s.length && !seen.has(s[j])) {
    seen.add(s[j]);
    j++;
  }
  best = Math.max(best, j - i);
}
```

That's **O(n²)** — each start can re-scan nearly the whole string. On
`"abcdefg...xyzabc..."` repeated, every start redoes work the previous
start already did. The waste is obvious: after finding that
`s[0..25]` is clean, starting over at `s[1]` re-checks 25 characters we
already know are clean.

## The insight

When the window `[left..right]` hits a duplicate at `right`, we don't
need to restart at `left + 1` and re-scan. Two observations:

1. Everything inside the window is *already known* to be repeat-free.
2. The only problem is the one duplicate of `s[right]` — so slide
   `left` rightward just far enough to evict it, keeping the rest.

The window never moves backward on either side. Each character is
added to the Set once (when `right` passes it) and removed at most once
(when `left` passes it). Total work: about `2n` Set operations.

This is the **sliding window** pattern: grow on the right, shrink on
the left, maintain an invariant ("no repeats inside") at all times.

## The approach, step by step

1. `seen = new Set()`, `left = 0`, `best = 0`.
2. For `right` from `0` to `s.length - 1`:
   a. While `seen.has(s[right])`: `seen.delete(s[left]); left++`.
      (Evict from the left until the incoming character is unique.)
   b. `seen.add(s[right])` — the window `[left..right]` is legal again.
   c. `best = Math.max(best, right - left + 1)`.
3. Return `best`.

Trace on `"abba"`:

| right | char | evictions            | window | best |
|-------|------|----------------------|--------|------|
| 0     | a    | —                    | "a"    | 1    |
| 1     | b    | —                    | "ab"   | 2    |
| 2     | b    | delete a, delete b   | "b"    | 2    |
| 3     | a    | —                    | "ba"   | 2    |

Note step 2 evicted *two* characters — the `a` had to go even though it
wasn't the duplicate, because eviction only happens from the left edge.
That's what keeps `left` from ever moving backward.

## Complexity

- **Time: O(n).** `right` advances n times; `left` advances at most n
  times total across the whole run (it never retreats). Set ops are O(1).
- **Space: O(min(n, alphabet size)).** The Set holds at most one copy
  of each distinct character in the current window.

## Common mistakes

- **The `abba` bug.** Implementations that remember each character's
  last index and jump `left = lastIndex + 1` forget to guard against
  jumping *backward*. At the final `a`, the remembered index of `a` is
  0, and `left` is already 2 — jumping to 1 re-admits the duplicate
  `b`s. The fix is `left = Math.max(left, lastIndex + 1)`; the Set
  version sidesteps the whole issue.
- **Deleting only the duplicate** from the Set instead of everything
  from the old `left` up to it. The window must stay contiguous.
- **`if` instead of `while`** when evicting: one eviction may not be
  enough (see the trace above).
- **Counting a subsequence.** `"pwke"` from `"pwwkew"` is not valid;
  if your answer for `"pwwkew"` is 4, your window isn't contiguous.
- **Returning the substring** instead of its length (read the signature).
- **Forgetting `right - left + 1`** and using `right - left`. Off by
  one: a single-character window has length 1, not 0.
