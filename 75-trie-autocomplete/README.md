# 75 — Trie autocomplete

**Lesson: stop re-deriving what you already knew — store the data in the shape of
the question, and the ninety-six percent you already ruled out never gets looked at
again.**

## Run it

```
node 75-trie-autocomplete/original.js
node 75-trie-autocomplete/refactored/cli.js
node --test 75-trie-autocomplete/refactored/trie.test.js
```

## What's wrong with the original?

Autocomplete for a search box. It works on twenty words, and the same three
diseases as project 74 are waiting inside it:

1. **Every keystroke rescans the entire dictionary.** Type `vzciz` into 50,000
   words and the original examines **250,000 words in 5.8 seconds** — because
   after the first letter narrowed the field to 1,923 candidates, it threw that
   knowledge away and re-tested all 50,000 against `vz`. The work you did for `v`
   is exactly the work you need for `vz`, and it is discarded every time.
2. **"Find and rank matches" is written twice, and the copies disagree.**
   `suggest` lowercases both sides; `suggestPopular` — a copy someone later
   edited — lowercases neither. Run it: `suggest("doo")` finds `door` and
   `Doorbell`; `suggestPopular("doo")` silently loses `Doorbell`. No error, no
   warning, just a word that stops existing on one code path.
3. **Logic welded to I/O.** Suggestions are printed, never returned. You cannot
   test the ranking, render it in a dropdown, or count matches. And the empty
   result prints `z -> ` — a blank where "no matches" should be.

## What changed in the refactor

- **A `Trie`: a tree where the path spells the word.** `car` and `cat` share the
  `c → a` links instead of storing `ca` twice. Finding everything under `ca` is
  not a search — you walk two links to the `ca` node, and its entire subtree *is*
  the answer set, by construction. Typing `vzciz` narrows 1,923 → 74 → 3 → 1, and
  the words ruled out by letter one are never touched again.
- **One `#find`, one `#collect`, one `#key`.** Case-folding lives in a single
  private method, so `suggest('doo')` and `suggest('DOO')` cannot disagree — the
  original's headline bug is unrepresentable, not merely fixed.
- **`byPopularity` is one exported comparator**, with an alphabetical tie-break so
  equal-weight results are *stable* instead of depending on insertion order.
- **The trie returns arrays; `cli.js` prints.** That is what lets the tests assert
  on the empty prefix, the no-match case, and the limit — the three corners the
  original could only mumble about.
- **The trade is now visible, not hidden.** Building the trie costs a few seconds
  *once*; each keystroke afterwards costs almost nothing. That is the deal every
  index makes, and `cli.js` prints both halves so you can judge it.

## Key takeaway

When the same query runs over and over with a slightly different argument, the
speedup usually isn't a faster loop — it's a data structure that makes the loop
unnecessary. Ask what shape would make your question trivial to answer, then pay
once to put the data in that shape.
