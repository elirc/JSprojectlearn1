# 📘 Learning Guide: Anagram Check

Character counting — the technique you'll reuse in problems 07, 08 and 29,
and your first "throw away the ordering, keep the tally" reframe.

## 1. The problem in plain words

Given two strings, say whether one is a shuffle of the other. Same
characters, same number of each, any order.

```
"listen"  vs  "silent"   →  true
 l i s t e n      s i l e n t     (same six letters, rearranged)

"aab"     vs  "abb"      →  false
 two a's, one b   one a, two b's  (same letters, wrong amounts)
```

Here we compare exactly what we're given: uppercase `A` and lowercase `a`
are different characters, and a space is a character like any other.

## 2. Concepts you need first

### Strings are iterable

```js
for (const ch of "cat") console.log(ch);   // "c", "a", "t"
"cat".length;                              // 3
"cat"[0];                                  // "c"
```

`for...of` over a string hands you one character at a time — no index
bookkeeping, no `split("")` allocation. (Technically it yields code points,
which is *better* than indexing for emoji and accents, but you won't need
that detail today.)

Also: strings are **immutable**. `s[0] = "x"` silently does nothing. Any
"editing" of a string builds a new one, which is why `slice`-in-a-loop
solutions get expensive fast.

### A counting Map

Problem 01 used a `Map` as "have I seen this?". Now use it as "**how many
times** have I seen this?":

```js
const counts = new Map();
for (const ch of "aab") {
  counts.set(ch, (counts.get(ch) ?? 0) + 1);
}
counts.get("a");   // 2
counts.get("b");   // 1
counts.get("z");   // undefined
```

Read that `set` line carefully — it's the single most reused line in this
whole track:

- `counts.get(ch)` → the current tally, or `undefined` the first time.
- `?? 0` → the **nullish coalescing** operator: "use the left side unless
  it's `null`/`undefined`, in which case use 0". Without it you'd compute
  `undefined + 1`, which is `NaN`, and every count would rot from there.
- `+ 1` and `set` → store it back.

### Set vs. Map — a trap worth meeting now

```js
new Set("aacc");   // Set { 'a', 'c' }
new Set("ccac");   // Set { 'a', 'c' }   ← identical!
```

A `Set` remembers *which* characters appeared; it forgets *how many*. Those
two strings are not anagrams (`aacc` has two of each, `ccac` has one `a`
and three `c`s), but their sets are the same. When the question involves
"how many", you need a Map, not a Set.

## 3. How to think about it

The problem says: order doesn't matter. So the very first move is to
**destroy the order** and keep only what does matter.

What's left when you delete the order from a string? A tally: `a` appears
twice, `b` once. Two strings are anagrams exactly when their tallies are
identical. Now the question is just "are these two tallies equal?"

You *could* build two Maps and compare them, but there's a slicker
version — say it out loud:

> Count everything in `a` as a budget. Then walk `b` and spend the budget,
> one character at a time. If `b` ever wants a character the budget can't
> pay for, they're not anagrams.

And before any of that, a free win: if the two strings have different
lengths, stop. Rearranging never changes how many characters there are.
That one line also makes the ending clean — see step 5.

## 4. Common wrong turns

- **Using a Set instead of a Map.** Loses the counts. `"aacc"` vs `"ccac"`
  is the test that catches you.
- **Forgetting `?? 0`.** `undefined + 1` is `NaN`. `NaN` compares false to
  everything, including itself, so the failure is confusing rather than
  loud.
- **No length check and no leftover check.** Spend-down alone says `"abc"`
  and `"ab"` are anagrams, because the shorter string simply never runs out
  of budget. You need *one* of: the length guard, or a final sweep
  confirming every count is 0. The length guard is cheaper.
- **Sorting and calling it done.** `a.split("").sort().join("")` twice is
  correct! But it's O(n log n) for a job that's O(n), and you should be
  able to say why.
- **Lowercasing or stripping spaces "because that's what anagrams mean".**
  Solve the spec in front of you. Then do variation 1.
- **Plain objects as tallies.** `obj["constructor"]` isn't `undefined` — it
  inherits from `Object.prototype`. Rare, but it's a genuinely confusing
  bug when it hits.

## 5. The solution, step by step

```js
export function isAnagram(a, b) {
  if (a.length !== b.length) return false;    // free rejection

  const counts = new Map();                    // char -> budget
  for (const ch of a) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }

  for (const ch of b) {
    const left = counts.get(ch) ?? 0;
    if (left === 0) return false;              // missing, or used up
    counts.set(ch, left - 1);
  }

  return true;
}
```

Trace `isAnagram("aab", "abb")`:

| what | map | verdict |
|------|-----|---------|
| lengths 3 vs 3 | — | continue |
| count `"aab"` | `{a:2, b:1}` | — |
| spend `a` | `{a:1, b:1}` | ok |
| spend `b` | `{a:1, b:0}` | ok |
| spend `b` again | budget is **0** | `false` |

And why `return true` is safe with no final map check: the strings are the
same length, and each character of `b` spent exactly one unit. So `b` spent
precisely as many units as `a` deposited — nothing can be left over. The
length guard is doing double duty.

## 6. Complexity, gently

- **Time: O(n).** Two passes, `n` steps each, and every Map operation is
  O(1). Doubling the string length doubles the work.
- **Sorting version: O(n log n).** For a 1,000,000-character string that's
  ~20,000,000 comparison-ish steps versus ~2,000,000. Also, sorting can't
  bail out early; the counting version returns `false` the moment it finds
  a problem.
- **Space: O(k)**, where `k` is the number of *distinct* characters. For
  plain lowercase English, `k ≤ 26` — a constant, no matter how long the
  strings are. That's why people say "O(1) space" for the 26-letter
  variant.

## 7. Words you learned

- **Anagram** — a rearrangement of the characters of another string.
- **Frequency map / tally / histogram** — key → how many times it occurred.
- **Multiset** — a set that remembers duplicates. A tally *is* a multiset.
- **Nullish coalescing (`??`)** — "use this default when the left side is
  `null` or `undefined`" (unlike `||`, it does not treat `0` as missing —
  which matters a lot when your values are counts).
- **Early exit / fail fast** — returning as soon as the answer is known.
- **Immutable** — strings can't be changed in place; "edits" make copies.

## 8. Variations to try

1. **isPhraseAnagram(a, b)** — the everyday meaning: ignore case, spaces
   and punctuation. `"Dormitory"` / `"Dirty Room"` → `true`. One
   normalization step (`s.toLowerCase().replace(/[^a-z0-9]/g, "")`) in
   front of the code you already have.
2. **countingWithAnArray** — for lowercase-only input, replace the Map with
   `new Array(26).fill(0)` and index by `ch.charCodeAt(0) - 97`. Same
   algorithm, no hashing. Then say out loud why it's still O(n).
3. **areAnagramsSet(words)** — given a list of words, return `true` if they
   are *all* anagrams of one another. Don't compare every pair; compare
   each to the first.
4. **maxAnagramGroup(words)** — how big is the largest group of mutual
   anagrams? You're now one small step from problem 08.
5. **isAnagramOfPalindrome(s)** — can `s` be rearranged into a palindrome?
   Count characters; at most one may have an odd count. A lovely two-line
   payoff for the tally idea, and a nice warm-up for problem 10.
