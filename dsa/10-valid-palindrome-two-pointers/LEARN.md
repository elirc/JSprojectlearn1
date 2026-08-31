# 📘 Learning Guide: Valid Palindrome (Two Pointers)

Converging pointers — two indexes walking toward each other — plus the art
of filtering *while* you scan instead of building a cleaned copy first.

## 1. The problem in plain words

Does the string read the same forwards and backwards, if you ignore
punctuation, spaces and capitalisation?

```
"A man, a plan, a canal: Panama"

 keep only letters/digits, lowercase them:
  a m a n a p l a n a c a n a l p a n a m a
  ↑                                       ↑   a = a  ✓
    ↑                                   ↑     m = m  ✓
      ↑                               ↑       a = a  ✓
                    …meet in the middle…      → true
```

Only letters `a`–`z`/`A`–`Z` and digits `0`–`9` count. A string with no
alphanumerics at all (like `" "` or `""`) counts as a palindrome — there's
nothing in it to disagree with itself.

## 2. Concepts you need first

### Converging pointers

Problem 04 had two pointers moving through two arrays in the *same*
direction. Problem 05 had two pointers in one array at different speeds.
This is the third shape: two pointers at opposite ends of one sequence,
walking **toward each other**.

```js
let left = 0;
let right = s.length - 1;
while (left < right) {
  // compare s[left] and s[right]
  left++;
  right--;
}
```

The loop is guaranteed to end because the gap shrinks by 2 every round.
Use `left < right`, not `<=`: when they're equal you're looking at the
single middle character, and a character always equals itself.

### Testing a character with a regex

```js
/[a-z0-9]/i.test("q");   // true
/[a-z0-9]/i.test("7");   // true
/[a-z0-9]/i.test("_");   // false
/[a-z0-9]/i.test(" ");   // false
```

`[a-z0-9]` is a character class ("any one of these"), and the `i` flag
makes it case-insensitive so `A`–`Z` is covered too. `.test()` returns a
plain boolean. That's the whole regex knowledge you need today.

### Case folding, carefully

```js
"A".toLowerCase();   // "a"
"0".toLowerCase();   // "0"  — digits are unaffected, which is what we want
```

Beware clever bit tricks. `charCode | 32` maps `A`(65)→`a`(97) — and also
maps `0`(48)→`0`(48)... but `P`(80)→`p`(112) while `0` stays `48`. The
danger is the *other* direction: some folding shortcuts make `0` and `P`
compare equal. The test `isPalindrome("0P") === false` exists precisely to
catch that. `toLowerCase()` is boring and correct.

### `undefined` doesn't throw, it lies

```js
const s = "ab";
s[5];                       // undefined — no error
/[a-z0-9]/i.test(s[5]);     // true!  (undefined stringifies to "undefined")
```

`test` coerces its argument to a string, so an out-of-bounds character
*looks alphanumeric*. That's why every skip loop needs a bounds guard —
without one, a string of pure punctuation walks off the end and behaves
bizarrely rather than crashing loudly.

## 3. How to think about it

First, solve the easy version out loud: if the string were already cleaned
and lowercased, you'd compare the ends and work inward. First vs last,
second vs second-to-last, stop when the pointers meet. Simple.

Now add the mess. The tempting move is to clean the string first
(`s.toLowerCase().replace(/[^a-z0-9]/g, "")`) and run the easy version.
That's a fine answer! But it builds several full copies of the input.

The two-pointer version does the filtering **in flight**:

> Before each comparison, walk `left` forward past anything that isn't
> alphanumeric, and walk `right` backward the same way. Then compare what
> the two pointers landed on, case-folded. Disagree → `false`. Agree → step
> both inward and repeat. Pointers meet → `true`.

Nothing is copied. And it can quit on the very first mismatch instead of
processing the whole string.

## 4. Common wrong turns

- **Skip loops without a bounds guard.** `while (!isAlnum(s[left])) left++;`
  runs off the end on `".,;!"`, where `s[left]` is `undefined` and the
  regex says "alphanumeric". Always
  `while (left < right && !isAlnum(s[left])) left++;`.
- **Only skipping on one side.** `"a...b...a"` still works, but
  `"ab_a"` (skip needed only on the right) breaks. Skip on both.
- **Using `<=` in the outer loop.** Not wrong, just an extra iteration
  comparing the middle character with itself — and it makes the off-by-one
  reasoning murkier.
- **Advancing the pointers inside the `if`.** If `left++`/`right--` only
  run on some branch, another branch loops forever. Put them at the end of
  the body, unconditionally.
- **A letters-only test** like `ch.toLowerCase() !== ch.toUpperCase()`.
  Neat trick, but digits fail it, so `"12321"` returns the wrong answer.
- **`replace` without the `g` flag.** Removes only the first offender.
- **Forgetting that empty means true.** `""` and `" "` are palindromes
  here. Good news: with `left < right`, the loop simply never runs.

## 5. The solution, step by step

```js
function isAlnum(ch) {
  return /[a-z0-9]/i.test(ch);
}

export function isPalindrome(s) {
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    while (left < right && !isAlnum(s[left])) left++;    // skip junk
    while (left < right && !isAlnum(s[right])) right--;  // both ends

    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;

    left++;
    right--;
  }

  return true;     // met in the middle without ever disagreeing
}
```

Trace `isPalindrome("ab_a")` — indexes `0:a 1:b 2:_ 3:a`:

| left | right | after skipping | compare | next |
|------|-------|----------------|---------|------|
| 0 | 3 | both already alnum | `a` vs `a` ✓ | left 1, right 2 |
| 1 | 2 | `s[2]` is `_` → right drops to 1 | `b` vs `b` ✓ | left 2, right 0 |
| 2 | 0 | `left < right` is false | — | **true** |

Notice row 2: the skip collapsed both pointers onto index 1, and the
comparison became `b === b`. That's not a bug you have to guard against —
it's the loop gracefully handling the odd-length middle. Cleaned, `"ab_a"`
is `"aba"`, which is indeed a palindrome.

## 6. Complexity, gently

- **Time: O(n).** `left` only increases, `right` only decreases, and they
  stop when they cross. Between them they cover each position at most once,
  so the inner skip loops add up to at most `n` steps *in total* — the same
  total-work argument you met in problem 09. Nested loops, linear cost.
- **Space: O(1).** Two integers. No cleaned copy, no reversed array. This
  is the payoff over the three-line version, which allocates several full
  copies of the string.
- **Early exit.** `"zabcdefg…a"` fails on the very first comparison. The
  clean-and-reverse version does all its work before it can notice.

Both approaches are O(n) *time*. Knowing when the difference is space and
constants rather than complexity class — and being able to say so — is more
valuable than always reaching for the fancier one.

## 7. Words you learned

- **Palindrome** — a sequence that reads the same in both directions.
- **Converging (opposite-end) two pointers** — indexes starting at the ends
  and moving inward until they meet.
- **In-flight filtering** — skipping unwanted items during the scan instead
  of pre-building a filtered copy.
- **Normalization / case folding** — reducing values to a comparable form
  (here, lowercase).
- **Character class** — regex `[a-z0-9]`, "any one character from this set".
- **Bounds guard** — the `left < right` inside a skip loop that keeps an
  index from running off the end.

## 8. Variations to try

1. **isPalindromeStrict(s)** — no filtering at all: `"aba"` true,
   `"a b a"` false. Delete the skip loops and see how little is left.
2. **longestPalindromicPrefix(s)** — how many characters from the start
   form a palindrome? Same comparison, different bookkeeping.
3. **isPalindromeAllowingOneRemoval(s)** — you may delete at most one
   character. When the pointers disagree, try skipping `left` *or*
   skipping `right` and check whether either remainder is a palindrome.
   A genuinely good interview follow-up.
4. **isPalindromeNumber(n)** — for an integer, without converting to a
   string. Build the reverse with `% 10` and `Math.floor(n / 10)` and
   compare. (Negative numbers are never palindromes — why?)
5. **Compare the two implementations.** Write the clean-and-reverse version
   too, then say out loud which you'd ship in a web app and which you'd
   write in an interview, and why they might be different answers. Being
   able to defend both is the actual skill.
