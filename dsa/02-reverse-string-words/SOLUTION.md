# Solution walkthrough — Reverse String Words

## The naive approach (and what it costs)

Walk the string character by character, collecting letters into a
"current word" buffer; when you hit a space, push the buffer onto a list
and reset it. Then walk the list backwards, gluing words with single
spaces, being careful not to add a trailing space, and remembering to
push the *final* buffer after the loop ends...

It works, and it's a great exercise in careful indexing — but it's maybe
25 lines with four separate edge cases to hand-manage (leading spaces,
trailing spaces, double spaces, the last word). Every one of those is a
bug waiting to happen. The cost here isn't big-O (it's O(n) either way) —
it's *correctness risk and effort*.

## The insight

JavaScript already has the three moves you need, each one bulletproof:

- `split(" ")` — string → array of pieces
- `reverse()` — flip an array in place
- `join(" ")` — array → string with a chosen separator

The only wrinkle: `split` on a single space is *literal*. Every extra
space produces an **empty string** in the output array:

```js
"  a  b ".split(" ")   // ["", "", "a", "", "b", ""]
```

Those empty strings are exactly where the unwanted spaces were. So the
"collapse messy spacing" requirement translates to one operation:
**filter out the empty strings.**

## The real approach, step by step

1. `str.split(" ")` — cut on every single space. Messy input gives you
   real words *plus* empty-string debris.
2. `.filter(word => word !== "")` — sweep out the debris. Now you hold
   exactly the words, in order.
3. `.reverse()` — flip the order. (It mutates the array it's called on,
   but that array is our own freshly created one, so no harm.)
4. `.join(" ")` — glue with single spaces. `join` only puts separators
   *between* elements, so there's never a leading or trailing space.

Edge cases dissolve on their own:

- `""` → split gives `[""]` → filter gives `[]` → join gives `""`. ✓
- `"   "` → split gives `["", "", "", ""]` → `[]` → `""`. ✓
- `"solo"` → `["solo"]` → reversed is itself → `"solo"`. ✓

An equally good route: `str.trim().split(/ +/)` — the regex ` +` means
"one **or more** spaces", so runs are eaten in one bite and no debris is
produced. You must `trim()` first though: `" a".split(/ +/)` is
`["", "a"]` (the split still cuts *before* the leading run, leaving an
empty first piece). And `"".split(/ +/)` is `[""]`, so the empty case
needs a check. The filter version needs neither caveat, which is why the
solution uses it.

## Complexity

- **Time: O(n)** where n is the string length. Each of split, filter,
  reverse, join walks the data once — four passes, but 4 × n is still
  O(n) (constant factors don't change the growth curve).
- **Space: O(n).** The word array and the output string are each about
  as big as the input. There's no way around output-sized space here,
  since strings are immutable in JS.

## Common mistakes

- **Forgetting the empty-string debris.** `"a  b".split(" ")` has length
  3, not 2. If your output has double spaces in it, this is why.
- **Reversing the characters instead of the words.**
  `[...str].reverse().join("")` gives `"eulb si yks eht"` — a different
  (also classic) problem. Read what's being reversed.
- **Splitting on `/ +/` without trimming first** — a leading space run
  leaves an empty first element that reverses to the *end* and produces
  a trailing space after join.
- **Hand-building the string with `result += word + " "`** — the classic
  trailing-space bug. `join` exists precisely so separators only go
  between elements.
- **Expecting `"".split(" ")` to be `[]`.** It's `[""]` — an array with
  one empty string. The filter step is what saves you.
