# Solution walkthrough — Valid Palindrome (Two Pointers)

## The naive approach (and what it costs)

Clean the string, reverse it, compare:

```js
export function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean === [...clean].reverse().join("");
}
```

This is **correct**, it's three lines, and in most real codebases it's the
right thing to ship. Its time is O(n) — nothing quadratic hiding here.

What it costs is **space**. `toLowerCase` builds a new string, `replace`
builds another, the spread builds an array of every character, `reverse`
rearranges it and `join` builds a fourth string. That's several full copies
of the input, so **O(n) extra space**. It also can't stop early: even if
the first and last characters disagree, it cleans and reverses the entire
string before finding out.

## The insight

You don't need the cleaned string. You need to *compare* the cleaned
string's first character with its last, its second with its second-to-last,
and so on — and you can do that by looking at the original string from both
ends, stepping over the characters that don't count.

> Walk one index in from the left and one in from the right. Skip anything
> that isn't alphanumeric. Compare what's left, case-folded. Stop the
> moment they disagree, or when the two indexes meet in the middle.

The pointers do the filtering *as they travel*, so no filtered copy ever
exists. And the loop ends as soon as the pointers meet: each character is
examined at most once from one side, never both.

This is the same two-pointer family as problem 04, with a twist — there the
pointers moved through two arrays in the same direction; here they move
through one string in **opposite** directions, converging. That
"converging pointers" shape is the whole toolkit for problems 11 and 12.

## The real approach, step by step

1. A tiny helper: `const isAlnum = (ch) => /[a-z0-9]/i.test(ch);`
   The `i` flag makes it case-insensitive, so `A`–`Z` is covered without
   spelling it out.
2. `let left = 0; let right = s.length - 1;`
3. `while (left < right)`:
   - `while (left < right && !isAlnum(s[left])) left++;`
   - `while (left < right && !isAlnum(s[right])) right--;`
   - `if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;`
   - `left++; right--;`
4. `return true;`

Two details are doing quiet, important work:

**The `left < right` guard inside the skip loops.** Without it, a string
like `".,;!"` sends `left` walking past the end of the string, where
`s[left]` is `undefined`, and `isAlnum(undefined)` coerces it to the string
`"undefined"` — which *does* contain letters, so the loop stops in a
nonsense state and the comparison throws. With the guard, `left` can never
pass `right`.

**Why comparing `s[left]` with itself is fine.** When the skips collapse
both pointers onto the same index (odd-length cleaned string, or the
all-punctuation case), the comparison is `x === x` — true — and then
`left++ / right--` ends the loop. No special case needed.

Trace `isPalindrome("ab_a")`:

| left | right | after skipping | compare | next |
|------|-------|----------------|---------|------|
| 0 | 3 | both already alnum | `a` vs `a` ✓ | left 1, right 2 |
| 1 | 2 | `s[2]` is `_` → right drops to 1 | `b` vs `b` ✓ | left 2, right 0 |
| 2 | 0 | `left < right` is false | — | **true** |

Cleaned, `"ab_a"` is `"aba"` — a palindrome. Correct.

## Complexity

- **Time: O(n).** Each of `left` and `right` only ever moves toward the
  other, so between them they advance at most `n` positions in total. Every
  character is inspected a constant number of times. The nested `while`
  loops don't multiply — same total-work argument as problem 09.
- **Space: O(1).** Two integers. Nothing is copied. (Strictly,
  `s[left].toLowerCase()` allocates a one-character string per comparison —
  constant size, and avoidable with `charCodeAt` arithmetic if you care.)
- **The clean-and-reverse version: O(n) time but O(n) space**, with several
  full passes and no early exit. Same complexity class for time, very
  different constant factors and memory profile.

## Common mistakes

- **Dropping the `left < right` guard in the skip loops.** The failure mode
  is a crash or a wrong answer on all-punctuation input like `" "` or
  `".,;!"` — both of which must return `true`.
- **Testing alphanumeric with `ch.toLowerCase() !== ch.toUpperCase()`.**
  That's a cute "is it a letter?" trick, but it excludes digits — so `"0P"`
  and `"12321"` go wrong.
- **Case-folding with `charCodeAt` maths like `code | 32`.** It maps `A`→`a`
  correctly, but also mangles digits and symbols. `"0P"` is the test that
  catches this; `0` must never fold onto `p`.
- **Using `while (left <= right)`.** Harmless (it compares the middle
  character with itself) but it's an extra iteration and it invites
  off-by-one confusion. `<` is the honest bound.
- **Forgetting to advance after a successful comparison.** If `left++` and
  `right--` sit inside an `if`, some path loops forever. Put them at the
  end of the loop body, unconditionally.
- **`s.replace(/[^a-zA-Z0-9]/g, "")` without the `g` flag.** Only the first
  offending character is removed. Silent and confusing.
- **Assuming the string is already lowercase.** `"A man, a plan…"` is the
  first test for a reason.
