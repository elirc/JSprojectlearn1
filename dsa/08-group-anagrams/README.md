# 08 — Group Anagrams

Given a list of words, group together the ones that are anagrams of each
other (problem 06's relationship: same characters, same counts). Return an
array of groups.

Ordering is part of the spec: **groups appear in the order their first
member appeared in the input**, and **within a group, words keep their
input order**. Duplicate words are kept, not merged.

## Signature

```js
/**
 * @param {string[]} words - list of words (may be empty; may contain "")
 * @returns {string[][]} groups of mutual anagrams, in first-appearance order
 */
export function groupAnagrams(words) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `groupAnagrams(["eat","tea","tan","ate","nat","bat"])` | `[["eat","tea","ate"],["tan","nat"],["bat"]]` | `eat` opened group 1, `tan` group 2, `bat` group 3 |
| `groupAnagrams(["ab","ba","ab"])` | `[["ab","ba","ab"]]` | duplicates are kept as separate members |
| `groupAnagrams(["abc","def"])` | `[["abc"],["def"]]` | no anagrams: every word is its own group |
| `groupAnagrams([])` | `[]` | nothing in, nothing out |

## Constraints & edge cases

- Empty input → `[]`. A single word → `[[word]]`.
- The empty string is a valid word: `groupAnagrams([""])` → `[[""]]`, and
  `["", ""]` → `[["", ""]]`.
- Words of different lengths can never be anagrams.
- **Case-sensitive**, like problem 06: `["Ab","ba"]` → `[["Ab"],["ba"]]`.
- Group order is first-appearance order; member order is input order. Do
  not sort the output.
- Don't mutate the input array or reorder it.
- Aim for O(total characters × log(word length)) — one pass over the words,
  no comparing every word against every other word.

## Hints (take them one at a time!)

1. The brute force compares every word with every other word using your
   `isAnagram` from problem 06. That's a loop inside a loop. What if
   instead each word could compute a **label** that all its anagrams —
   and only its anagrams — would also compute?
2. Anagrams differ only in the *order* of their letters. So any label that
   destroys the order but keeps the letters works. Sorting a word's letters
   does exactly that: `"eat"`, `"tea"` and `"ate"` all become `"aet"`.
3. Build a `Map` from label → array of words. For each word, compute
   `key = word.split("").sort().join("")`; if the map has no entry for
   `key`, create one with `[]`; then push the word onto it. Finally return
   `[...map.values()]` — a `Map` iterates in *insertion* order, which is
   exactly the first-appearance order the spec wants.

## Run it

```
node --test dsa/08-group-anagrams/attempt.test.js
```
