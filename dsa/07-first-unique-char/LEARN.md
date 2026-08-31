# 📘 Learning Guide: First Unique Character

Two passes, one tally — and the first time you'll deliberately choose to
loop twice instead of trying to be clever once.

## 1. The problem in plain words

Given a string, find the leftmost character that shows up **exactly once**
in the whole string, and report *where* it is. If no such character exists,
report `-1`.

```
"loveleetcode"
 l o v e l e e t c o d e
 ↑ ↑ ↑
 │ │ └── 'v' appears once  →  answer: 2
 │ └──── 'o' appears twice
 └────── 'l' appears twice
```

Note the two words doing all the work: **first** (leftmost by position) and
**unique** (count of exactly 1).

## 2. Concepts you need first

### Index vs. character, again

You return `2`, not `"v"`. Problem 01 made the same distinction for arrays;
it's worth re-noticing, because half the wrong answers on this problem are
"right character, wrong type".

### The `-1` sentinel

When a function returns a position, it needs some way to say "no such
position". It can't use `0` — that's a perfectly good answer meaning "index
zero". So the convention (shared by `indexOf`, `findIndex`, `search`) is
the impossible index `-1`:

```js
"abc".indexOf("z");        // -1
[1, 2].findIndex((n) => n > 9);  // -1
```

A value chosen to mean "nothing" is called a **sentinel**. Whenever you
design one, the test is: could this value ever be a legitimate answer? If
yes, pick something else.

### Reusing the counting Map

Straight from problem 06:

```js
const counts = new Map();
for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
```

Same three moving parts: `get` (or `undefined`), `?? 0` for the default,
`set` it back. If that line still feels like an incantation, type it out
from memory once before continuing — it appears in problems 07, 08 and 29.

### Two loops is not "twice as slow"

```js
for (const ch of s) { /* count */ }        // n steps
for (let i = 0; i < s.length; i++) { }     // n more steps
```

That's `2n` steps. In big-O we drop constant factors, so `2n` is **O(n)** —
the same category as `n`. What's *not* the same category is a loop nested
inside a loop, which is `n × n`. The rule of thumb: **sequential loops
add, nested loops multiply**, and only multiplication changes your
complexity class.

## 3. How to think about it

Start by saying the obvious plan out loud: "for each character, check
whether it appears again anywhere else." Then listen to it. To check
"appears anywhere else", you scan the string. So you're scanning the string
once per character — a scan inside a scan. That's O(n²), and worse, you
recompute the same fact repeatedly: `"leetcode"` asks "how many `e`s?"
three separate times, and the answer never changes.

The fix is the same reframe as problem 01: **precompute the facts, then
answer questions instantly.**

> Pass 1: count every character. Pass 2: walk the string from the left and
> return the index of the first character whose count is 1.

Why must pass 2 walk the *string* rather than the tally? Because "first"
means leftmost *in the string*, and only the string knows about positions —
a Map entry is just `character → count`, with no index attached. Walking
the string hands you `i` for free.

## 4. Common wrong turns

- **Returning the character.** `"l"` instead of `0`. Check the signature.
- **Returning `0` or `null` for "none found".** `0` is a real answer;
  `null` isn't a number. The contract says `-1`.
- **Trying to do it in one pass.** You cannot know whether the character at
  index 0 is unique until you've seen the entire string — the duplicate
  might be the very last character. Any "one-pass" version secretly does a
  second pass at the end. Two honest passes are clearer and just as fast.
- **Nested loops out of habit.** `for i { for j { if (s[i] === s[j]) } }`
  is O(n²), and it's easy to forget to skip `j === i` (which makes every
  character look repeated, so you always return `-1`).
- **Special-casing `""`.** Not needed: both loops skip, and you fall
  through to `-1`. Extra branches are extra places to be wrong.
- **Lowercasing.** The spec is case-sensitive. `"Aa"` → `0`, not `-1`.

## 5. The solution, step by step

```js
export function firstUniqChar(s) {
  const counts = new Map();
  for (const ch of s) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);   // pass 1: the facts
  }

  for (let i = 0; i < s.length; i++) {
    if (counts.get(s[i]) === 1) return i;        // pass 2: leftmost hit
  }

  return -1;                                     // none found (or empty)
}
```

Trace `firstUniqChar("aabbc")`:

| pass 1 | | |
|---|---|---|
| after counting | `a:2, b:2, c:1` | |

| pass 2 | char | count | action |
|--------|------|-------|--------|
| i=0 | a | 2 | continue |
| i=1 | a | 2 | continue |
| i=2 | b | 2 | continue |
| i=3 | b | 2 | continue |
| i=4 | c | **1** | return `4` |

Now trace `"aabb"` in your head: pass 2 never fires, the loop ends, and
`-1` comes out. Same code, no special case.

## 6. Complexity, gently

- **Time: O(n).** `n` map writes plus at most `n` map reads, every one of
  them O(1). Roughly `2n` steps — and doubling the input still just doubles
  the work, which is what "linear" means.
- **The nested-loop version: O(n²).** Compare at n = 100,000: about 200,000
  operations versus up to 10,000,000,000. Same answer; one of them finishes
  before you blink.
- **Space: O(k)** for the tally, where `k` is the number of distinct
  characters — at most 26 for lowercase English, so people often just say
  O(1) for that variant. In the worst case (every character different) it's
  O(n).

This is the third time in this track you've spent a little memory to
delete a nested loop. That's not a coincidence; it's the move.

## 7. Words you learned

- **Sentinel value** — a value that means "no result" (`-1` here), chosen
  so it can never be mistaken for a real answer.
- **Two-pass algorithm** — gather facts, then use them. Still linear.
- **Precomputation** — doing work once so later questions are cheap.
- **Frequency map** — key → occurrence count (problem 06's tool, reused).
- **Constant factor** — the `2` in `2n`; ignored by big-O because it
  doesn't change how the cost *grows*.

## 8. Variations to try

1. **firstUniqCharCI(s)** — case-insensitive: `"aAb"` → index of `b`.
   Count `ch.toLowerCase()` but return the original index.
2. **lastUniqChar(s)** — rightmost singleton. Change one loop's direction;
   the tally is identical.
3. **firstRepeatingChar(s)** — index of the first character that appears
   *more than* once (`"loveleetcode"` → `0`). Careful: "first" could mean
   first *occurrence* or first character to be *seen twice* — those give
   different answers. Pick one and say which.
4. **allUniqueChars(s)** — return every singleton in order, as a string.
   `"loveleetcode"` → `"vtcd"`. Same two passes, collect instead of return.
5. **firstUniqWord(text)** — same algorithm one level up: split on spaces
   and find the first word that appears exactly once. Notice the algorithm
   didn't change at all — only what counts as an "item". That's the sign
   you've learned a *pattern* rather than a trick.
