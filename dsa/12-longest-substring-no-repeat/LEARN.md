# 📘 Learning Guide: Longest Substring Without Repeating Characters

The sliding window: how two pointers moving the *same* direction turn an O(n²) re-scan into one clean pass.

## 1. The problem in plain words

Read a string left to right and find the longest stretch of
*consecutive* characters where nothing appears twice. `"abcabcbb"`
contains the stretch `"abc"` (length 3) but not `"abca"` (the `a`
repeats). Report the length of the best stretch.

The word **substring** is doing real work here. A substring is a
contiguous slice — `"wke"` inside `"pwwkew"`. A **subsequence** may
skip characters — `"pwke"` — and does *not* count. If your answer for
`"pwwkew"` is 4, you solved the wrong problem.

## 2. Concepts you need first

- **`Set`** — `add`, `has`, `delete`, all O(1). You leaned on Set
  membership in `09-longest-consecutive-sequence`; here it answers
  "is this character currently inside my window?"
- **Two pointers, same direction** — in `04-merge-sorted-arrays` and
  `05-move-zeroes` you ran two indexes forward through data. A sliding
  window is exactly that: `left` and `right` both only move right.
- **An invariant** — a statement you keep true at every step. Ours:
  *"the characters between `left` and `right` contain no duplicate."*
  Every move either preserves it (grow right when safe) or restores it
  (shrink left until safe).
- **Best-so-far** — same running-max habit as Kadane in
  `03-max-subarray`: measure every legal window, remember the widest.

## 3. How to think about it

Start with brute force: try every starting index, extend until a
repeat. It works, but it's O(n²), and the waste has a specific smell:
**overlapping re-scans**. After checking the stretch starting at index
0, the stretch starting at index 1 is 99% the same characters — and we
check them all again.

The sliding window deletes that waste. Think of the window as a
caterpillar on the string:

```
p  w  w  k  e  w
[p]              grow →
[p  w]           grow →
 p [w]           duplicate! shrink from the left, then grow
 p  w [w  k]     ...wait — let's slow that down.
```

The rules, precisely:

- **Grow:** move `right` one step per loop turn. The new character
  `s[right]` wants to join the window.
- **Restore:** if `s[right]` is already in the window, evict characters
  from the *left edge* — `seen.delete(s[left]); left++` — until the
  copy of `s[right]` is gone. Only then admit `s[right]`.
- **Measure:** the window is now legal; `right - left + 1` is its
  width; keep the max.

Why evict from the left edge instead of surgically removing the one
duplicate? Because the window must stay *contiguous*. If the duplicate
is three characters in, everything before it is doomed anyway — no
legal window can include both those characters and the new `s[right]`.

The efficiency argument is worth saying out loud: `right` takes n
steps. `left` never moves backward, so across the entire run it also
takes at most n steps. Even though there's a `while` inside a `for`,
the total work is bounded by *total pointer movement* — about 2n. This
"charge the work to the pointer, not the loop nesting" argument comes
back again and again (you'll see it next in `15-queue-with-two-stacks`).

## 4. Common wrong turns

- **Restarting on every duplicate** (`left = right`, clear the Set).
  Correct answers, O(n²) behavior on adversarial input — you've
  rebuilt the brute force with extra steps. Shrink, don't reset.
- **The `abba` trap.** A popular variant stores each character's last
  seen index in a Map and jumps `left` straight past the duplicate.
  On `"abba"`, when the second `a` arrives, `a`'s remembered index (0)
  is *behind* the window (`left` is 2) — jumping to `0 + 1 = 1` moves
  `left` backward and re-admits the duplicated `b`s, answering 3
  instead of 2. If you take that route, you need
  `left = Math.max(left, lastIndex + 1)`. The Set version can't make
  this mistake — which is why we teach it first.
- **`if (seen.has(...))` instead of `while`.** One eviction may not be
  enough; keep evicting until the duplicate is actually gone.
- **Forgetting to add `s[right]` after the eviction loop** — the window
  silently drops characters and lengths come out short.
- **Measuring before restoring the invariant.** Only legal windows may
  be measured; measure after the `while`, never before.

## 5. The solution, step by step

```js
export function lengthOfLongestSubstring(s) {
  const seen = new Set(); // characters inside [left..right]
  let left = 0;
  let best = 0;

  for (let right = 0; right < s.length; right++) {
    while (seen.has(s[right])) {   // restore the invariant...
      seen.delete(s[left]);
      left++;
    }
    seen.add(s[right]);            // ...then admit the newcomer
    best = Math.max(best, right - left + 1); // and measure
  }

  return best;
}
```

Trace `"tmmzuxt"` — the one with a repeat far behind:

| right | char | evict            | window    | best |
|-------|------|------------------|-----------|------|
| 0     | t    | —                | `t`       | 1    |
| 1     | m    | —                | `tm`      | 2    |
| 2     | m    | t, m             | `m`       | 2    |
| 3     | z    | —                | `mz`      | 2    |
| 4     | u    | —                | `mzu`     | 3    |
| 5     | x    | —                | `mzux`    | 4    |
| 6     | t    | —                | `mzuxt`   | **5**|

The last `t` triggers *no* eviction: the first `t` left the Set back at
step 2. The Set always mirrors exactly the current window — that's the
invariant paying rent.

## 6. Complexity, gently

Time: the `for` moves `right` n times. The `while` moves `left` — and
`left` starts at 0, only ever increments, and never exceeds n. So all
executions of the `while` body, summed over the whole run, are at most
n. Total ≤ 2n pointer moves, each with O(1) Set work: **O(n)**.

This is called **amortized analysis** — a single loop turn might do a
lot of evicting, but the *total* across the run is bounded, so the
average per turn is O(1).

Space: the Set holds the current window's distinct characters — at most
the whole alphabet in play, at most n: **O(min(n, alphabet))**.

## 7. Words you learned

- **Substring vs subsequence** — contiguous slice vs skip-allowed
  selection. Interviewers love watching people mix these up.
- **Sliding window** — a `[left..right]` range over sequential data;
  grows on the right, shrinks on the left, both edges monotonic.
- **Invariant** — the property you keep true every iteration; design
  the loop around restoring it.
- **Amortized O(1)** — expensive occasionally, cheap on average, with
  a guarantee about the total.
- **Monotonic pointer** — an index that only moves one way; the source
  of most O(n) guarantees in window problems.

## 8. Variations to try

1. **Return the substring itself** (any winner). Track the winning
   `left` alongside `best`.
2. **At most k distinct characters:** longest substring containing at
   most `k` *different* characters (use a `Map` of counts; shrink while
   `map.size > k`). This is the general-purpose window template.
3. **Longest substring with no repeats, given a stream:** you only see
   one character at a time and can't index backward. Which part of the
   solution already works that way?
4. **Minimum window instead of maximum:** find the *shortest* substring
   of `s` containing all characters of a small target string `t`.
   Same skeleton, opposite measure — grow until legal, shrink while
   legal, measure at the shrink.
