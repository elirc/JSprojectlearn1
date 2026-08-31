# Solution walkthrough — Group Anagrams

## The naive approach (and what it costs)

You already have `isAnagram` from problem 06, so the obvious plan is: for
each word, look through the groups built so far and see if it belongs to
any of them.

```js
export function groupAnagrams(words) {
  const groups = [];
  for (const word of words) {
    const home = groups.find((g) => isAnagram(g[0], word));
    if (home) home.push(word);
    else groups.push([word]);
  }
  return groups;
}
```

This is correct, and the ordering falls out right. But count the work:
every word is compared against a representative of every existing group.
With `n` words of length `L` and few duplicates, that's up to `n²/2`
comparisons, each costing O(L): **O(n² · L)**. For 10,000 words that's
~50,000,000 anagram checks.

The deeper problem is that the comparison is *pairwise*: each word asks "am
I like you?" of many partners, when it could simply announce what it is.

## The insight

Replace comparison with **classification**. Instead of asking whether two
words match, give each word a **key** that all its anagrams — and nothing
else — will also produce. Then words with equal keys are automatically in
the same group; no comparing required.

What key? Anagrams differ *only* in letter order. So take any function that
throws away the order but keeps the letters, and it's a valid key. The
easiest one: sort the letters.

```
"eat" → "aet"
"tea" → "aet"
"ate" → "aet"
"bat" → "abt"
```

This is called a **canonical form**: one chosen representative for a whole
family of equivalent things. Once you can compute a canonical form, "group
by equivalence" becomes "group by exact key", and a hash map does that in
one pass.

The ordering requirements then come free from an underrated JavaScript
guarantee: **`Map` iterates its entries in insertion order.** A key is
inserted the first time its group opens, so `[...map.values()]` is exactly
first-appearance order. And since you `push` words as you meet them,
members are in input order too.

## The real approach, step by step

1. `const groups = new Map();` — key → array of words.
2. For each `word` in `words`:
   - `const key = word.split("").sort().join("");`
     - `split("")` → array of characters (a new array; the string itself is
       immutable, so nothing is mutated).
     - `.sort()` with no comparator is correct **here** because we're
       sorting single-character strings, and the default sort is
       lexicographic on strings. (For *numbers* the default sort is a bug —
       see problem 04.)
   - If `!groups.has(key)`, `groups.set(key, [])` — open a new group.
   - `groups.get(key).push(word)` — `get` returns the actual array, so
     pushing to it updates what's stored. No need to `set` again.
3. `return [...groups.values()];`

Trace `["eat","tea","tan","ate","nat","bat"]`:

| word | key | map after |
|------|-----|-----------|
| eat | aet | `aet: [eat]` |
| tea | aet | `aet: [eat, tea]` |
| tan | ant | `aet: […], ant: [tan]` |
| ate | aet | `aet: [eat, tea, ate], ant: […]` |
| nat | ant | `ant: [tan, nat]` |
| bat | abt | `abt: [bat]` |

`[...values()]` → `[["eat","tea","ate"], ["tan","nat"], ["bat"]]`. Exactly
the required order, with no sorting of the output at all.

## Complexity

- **Time: O(n · L log L)**, where `n` is the number of words and `L` the
  typical word length. Each word is visited once; its cost is dominated by
  sorting its own letters (`L log L`). Map operations are O(1) each — well,
  O(L) to hash a length-`L` string, which is smaller than the sort.
- **Naive pairwise: O(n² · L).** At n = 10,000, L = 8: roughly 240,000
  operations versus 400,000,000.
- **Space: O(n · L)** — every word appears once in the output, plus one key
  per group.
- **Faster key, no sorting:** a 26-slot count array joined into a string
  (`"1#0#0#…"`) is a canonical form computable in O(L), giving **O(n · L)**
  overall. Worth knowing; the sorted key is usually clearer.

## Common mistakes

- **Sorting the output** (by group size, alphabetically, anything). The
  spec asks for first-appearance order, which `Map` already gives you.
  Sorting is extra work *and* wrong.
- **Using a plain object instead of a `Map`.** Mostly works, but objects
  reorder integer-like keys (`Object.keys({2:1, 1:1})` → `["1","2"]`, not
  insertion order). `Map` promises insertion order for every key type.
- **`groups.set(key, groups.get(key).push(word))`.** `push` returns the new
  *length*, so this stores a number. Push and stop.
- **`word.sort()`.** Strings have no `sort` method. You need
  `split("").sort().join("")`.
- **Deduping accidentally** with a `Set` per group. Duplicates are members.
- **Lowercasing the key** to be "helpful". This spec is case-sensitive; the
  test `["Ab","ba","ab"]` catches it.
- **Reordering the input** with `words.sort()` before grouping. That
  mutates the caller's array *and* destroys the first-appearance order the
  answer depends on.
