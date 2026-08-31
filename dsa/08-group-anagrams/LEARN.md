# 📘 Learning Guide: Group Anagrams

Computed keys and canonical forms — how to turn "compare everything with
everything" into "look it up once".

## 1. The problem in plain words

You get a list of words. Put the ones that are anagrams of each other into
the same bucket, and hand back the buckets.

```
["eat", "tea", "tan", "ate", "nat", "bat"]

  eat ─┐
  tea ─┼→ ["eat", "tea", "ate"]
  ate ─┘
  tan ─┬→ ["tan", "nat"]
  nat ─┘
  bat ──→ ["bat"]
```

Two ordering rules matter: buckets come out in the order they were *opened*
(`eat`'s bucket first, because `eat` appeared first), and inside a bucket
the words stay in input order. Duplicate words stay as separate members.

## 2. Concepts you need first

### Building a key from a value

You've used a `Map` with keys that *were* the data (`value → index` in
problem 01, `character → count` in 06). Now the key is something you
**compute**:

```js
const key = word.split("").sort().join("");
// "eat" → ["e","a","t"] → ["a","e","t"] → "aet"
```

Three steps: `split("")` makes an array of characters, `sort()` reorders it
in place (it's a fresh array, so nothing you care about is harmed), and
`join("")` glues it back into a string. The result is a *label* for the
word, not the word itself.

A key like this is called a **canonical form**: from a whole family of
equivalent things, you pick one standard representative. `"eat"`, `"tea"`
and `"ate"` are all *represented by* `"aet"`.

### `.sort()` on strings vs. numbers

```js
["e","a","t"].sort();     // ["a","e","t"]  ✅ lexicographic is what we want
[1, 5, 10].sort();        // [1, 10, 5]     ❌ also lexicographic!
[1, 5, 10].sort((a,b) => a - b);  // [1, 5, 10] ✅
```

Default `sort` converts everything to strings and compares those. For
single characters that's exactly right. For numbers it's the classic bug
you met in problem 04. Know which case you're in.

`sort` also mutates the array it's called on. Here it's a throwaway array
from `split`, so that's fine — but never call `.sort()` on an array a
caller handed you unless you meant to rearrange theirs.

### Map of arrays: the get-or-create dance

```js
if (!groups.has(key)) groups.set(key, []);
groups.get(key).push(word);
```

The first line opens an empty bucket the first time a key shows up. The
second line matters more than it looks: `groups.get(key)` returns **the
actual array object** stored in the map, not a copy. Pushing to it updates
what's in the map. You do *not* need to `set` it back.

### Map iterates in insertion order

```js
const m = new Map();
m.set("b", 1); m.set("a", 2);
[...m.keys()];   // ["b", "a"]  — insertion order, not sorted
```

This is a guarantee, not an accident, and it's exactly what "groups in
first-appearance order" needs — a key is inserted the moment its group
opens. Plain objects do *not* promise this for every key type: integer-like
keys get sorted numerically (`Object.keys({"2":1,"1":1})` → `["1","2"]`).
One more reason to reach for `Map`.

## 3. How to think about it

The brute force plan is: "for each word, check it against a member of every
existing group." Say it out loud and hear the cost — a loop inside a loop,
O(n²) anagram checks. Every word is *asking around*.

Flip it. What if each word could just **announce which group it belongs
to**, without knowing anything about the other words?

That's possible whenever "belongs to the same group" can be reduced to
"produces the same key". So the question becomes: what do all anagrams of
one another have in common that nothing else shares? Their letters, ignoring
order. Sort the letters and you've got it.

> For each word, compute its sorted-letter key. Look up that key in a map
> of buckets, creating one if it's new, and push the word in. At the end,
> the buckets are the answer.

One pass. No word ever looks at another word.

## 4. Common wrong turns

- **Comparing words pairwise.** Correct but O(n²·L). If you find yourself
  writing a loop inside a loop over the same list, ask what key would let
  you drop the inner loop. This is *the* recurring instinct in this track.
- **`word.sort()`.** Strings are immutable and have no `sort`. You need the
  split/sort/join trio.
- **Storing the result of `push`.** `map.set(key, arr.push(word))` stores
  the array's new *length* (a number). `push` and move on.
- **Sorting the output.** The spec wants first-appearance order and `Map`
  hands it to you. Sorting is both wasted work and a wrong answer.
- **Using a `Set` per bucket.** That silently drops duplicate words.
  `["go","og","go"]` must keep both `"go"`s.
- **Lowercasing the key.** This problem is case-sensitive, matching problem
  06. `"Ab"` and `"ba"` are different groups.
- **`words.sort()` first**, to "make grouping easier". It mutates the
  caller's array and destroys the ordering your answer depends on.

## 5. The solution, step by step

```js
export function groupAnagrams(words) {
  const groups = new Map();                  // sorted-letters -> words

  for (const word of words) {
    const key = word.split("").sort().join("");

    if (!groups.has(key)) groups.set(key, []);   // open a bucket
    groups.get(key).push(word);                  // input order kept
  }

  return [...groups.values()];                   // insertion order kept
}
```

Trace `["eat","tea","tan","ate","nat","bat"]`:

| word | key | map after |
|------|-----|-----------|
| eat | `aet` | `aet: [eat]` |
| tea | `aet` | `aet: [eat, tea]` |
| tan | `ant` | `aet: […]`, `ant: [tan]` |
| ate | `aet` | `aet: [eat, tea, ate]`, `ant: […]` |
| nat | `ant` | `ant: [tan, nat]` |
| bat | `abt` | `abt: [bat]` |

`[...groups.values()]` → `[["eat","tea","ate"],["tan","nat"],["bat"]]`.

Notice how much of the spec you never had to *implement*: group order,
member order, duplicate handling. They all fall out of choosing the right
data structure and touching the words in the right sequence. That's what a
good structure buys you.

## 6. Complexity, gently

- **Time: O(n · L log L).** `n` words, each sorted in `L log L` where `L`
  is its length. Everything else per word is O(1)-ish. Since `L` is usually
  tiny (a word, not a novel), in practice this behaves like O(n).
- **Brute force: O(n² · L).** At 10,000 words of 8 letters: ~240,000
  operations versus ~400,000,000. Same answer, 1,600× the work.
- **Space: O(n · L)** — every word ends up in the output exactly once, plus
  one key per group.
- **Could it be O(n · L)?** Yes: instead of sorting, build a count of the
  26 letters and join it into a string like `"1#0#2#…"`. Same idea — a
  canonical form — computed in linear time. Try it as variation 2.

## 7. Words you learned

- **Canonical form** — one standard representative for a family of
  equivalent values; equality of canonical forms means equivalence.
- **Computed key / key function** — a value derived from an item, used to
  index it in a map.
- **Bucketing / group-by** — collecting items into per-key lists.
- **Insertion order** — the order keys were first added; `Map` iterates
  this way, plain objects don't always.
- **Equivalence class** — the maths word for "one of the groups".

## 8. Variations to try

1. **groupAnagramsCI(words)** — case-insensitive grouping, but the words
   come back exactly as they went in. Change only the key.
2. **countKey(word)** — replace the sorted key with a 26-slot letter count
   joined by a separator. Why does the separator matter? (Hint: without it,
   counts `1,11` and `11,1` both become `"111"`.)
3. **largestAnagramGroup(words)** — return just the biggest group. One
   `reduce` over the values you already build.
4. **groupBy(items, keyFn)** — extract the pattern: a generic function that
   buckets anything by any key function, so `groupAnagrams` becomes
   `groupBy(words, sortedLetters)`. Then use it to group numbers by parity
   or people by first initial. Recognising that this problem is an instance
   of `groupBy` is the real prize.
5. **anagramPairs(words)** — return the number of unordered pairs that are
   anagrams. Careful: a group of size `k` contributes `k·(k−1)/2` pairs,
   not `k`.
