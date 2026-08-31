# 📘 Learning Guide: Reverse String Words

A string-manipulation warm-up whose real lesson is *edge cases*: the messy
inputs that break tidy plans.

## 1. The problem in plain words

Take a sentence, say its words backwards, and tidy the spacing while
you're at it:

```
"  the   sky is blue "   →   "blue is sky the"
```

Three jobs hiding in one: (1) find the words, (2) reverse their order,
(3) output with exactly one space between words and none at the ends.

## 2. Concepts you need first

### Strings are immutable

In JavaScript you can never change a string — every "change" builds a new
one. `str.trim()` doesn't modify `str`; it *returns* a trimmed copy. So
string problems are always "build the answer", never "edit in place".

### The split / transform / join pipeline

The workhorse pattern for string manipulation. Try each line in a Node
REPL (`node`, paste away):

```js
"a-b-c".split("-")          // ["a", "b", "c"]     string → array
["a", "b", "c"].reverse()   // ["c", "b", "a"]     transform the array
["c", "b", "a"].join("-")   // "c-b-a"             array → string
```

Convert to an array, use array superpowers, convert back. Huge amounts of
real-world string code is exactly this shape.

### split's sharp edge

`split(" ")` cuts at *every single* space — and when two cuts touch, the
piece between them is the **empty string**:

```js
"a b".split(" ")     // ["a", "b"]          fine
"a  b".split(" ")    // ["a", "", "b"]      debris!
" a".split(" ")      // ["", "a"]           debris at the front
"".split(" ")        // [""]                even empty input gives debris
```

Burn this into memory: messy spacing in, empty strings out.

### filter — keep only what passes the test

```js
["a", "", "b", ""].filter(w => w !== "")   // ["a", "b"]
[1, 2, 3, 4, 5].filter(n => n % 2 === 0)   // [2, 4]
```

`filter` builds a new array containing only the elements for which your
function returned true.

### join's quiet guarantee

`join(" ")` puts the separator **between** elements only — never before
the first or after the last. And `[].join(" ")` is `""`. These two facts
kill the "trailing space" and "empty input" bugs before they're born.

## 3. How to think about it

Before coding, restate the job in terms of the pipeline: "split the
string into words, drop the debris, reverse, join with single spaces."
That sentence *is* the program — each clause is one method call.

Then — and this is the real skill — ask: **"what's the ugliest input I
can imagine?"** and walk your plan through it by hand:

- `""` — empty
- `"   "` — only spaces
- `"solo"` — one word
- `"a  b"` — double space inside

If your plan survives all four on paper, code it. If you skipped this
step and coded first, you'd likely ship the double-space bug: it's
invisible in the happy-path example.

## 4. Common wrong turns

- **Reversing the wrong thing.** `[...str].reverse().join("")` reverses
  *characters* (`"blue"` → `"eulb"`). The unit here is the word.
- **Trusting split blindly.** Forgetting the debris means your reversed
  array contains `""` entries, which join turns into double spaces.
- **Hand-rolling the join.** `out += word + " "` leaves a trailing
  space; then you "fix" it with a slice; then the empty-input case
  breaks the slice... Use `join`.
- **Overusing trim.** `trim()` fixes the *ends* but does nothing about
  inner runs — `"a  b".trim()` is still `"a  b"`.

## 5. The solution, step by step

```js
export function reverseWords(str) {
  return str
    .split(" ")                        // words + empty-string debris
    .filter((word) => word !== "")     // drop the debris
    .reverse()                         // flip the word order
    .join(" ");                        // glue: single spaces, no ends
}
```

Trace `"  a good   example "`:

| Step | Result |
|------|--------|
| split(" ") | `["", "", "a", "good", "", "", "example", ""]` |
| filter | `["a", "good", "example"]` |
| reverse | `["example", "good", "a"]` |
| join(" ") | `"example good a"` |

And the ugliest input, `"   "`: split → `["", "", "", ""]`, filter →
`[]`, reverse → `[]`, join → `""`. No special case needed — the pipeline
absorbs it.

## 6. Complexity, gently

Let n be the length of the string.

- **Time: O(n).** split reads every character once; filter, reverse, and
  join each touch every word once. That's about four passes — 4n steps —
  and in big-O notation constant multipliers are dropped, so 4n is
  "O(n)". Why drop them? Because the question big-O answers is "what
  happens when input *doubles*?" — and 4n doubles exactly like n does.
- **Space: O(n).** The words array plus the output string are together
  about the size of the input. Since JS strings are immutable, an
  output-sized allocation is unavoidable — this is as good as it gets.

## 7. Words you learned

- **Immutable** — cannot be changed after creation; "edits" create copies.
- **Pipeline** — chaining transformations, each feeding the next.
- **Edge case** — a legal but extreme input (empty, single item, all
  separators) that breaks naive plans.
- **Token / word** — a meaningful chunk a string is cut into.
- **Separator / delimiter** — the character(s) marking the cut points.

## 8. Variations to try

1. **reverseLetters(str)** — reverse the characters of the whole string:
   `"abc de"` → `"ed cba"`. (The spread-reverse-join one-liner.)
2. **reverseEachWord(str)** — keep word *order* but reverse letters
   *inside* each word: `"the sky"` → `"eht yks"`. Combine this problem's
   pipeline with a `map`.
3. **capitalizeWords(str)** — same split/clean pipeline, but transform
   each word to Capitalized: `"  hello   world "` → `"Hello World"`.
4. **reverseWordsHard(str)** — re-solve *without* split/reverse/join:
   walk the string with indexes and build the answer manually. Painful on
   purpose — it makes you appreciate the pipeline and teaches the
   index-walking used by problems 05 and 10.
