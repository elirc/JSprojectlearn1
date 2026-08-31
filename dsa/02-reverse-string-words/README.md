# 02 — Reverse String Words

Given a string, return a new string with the **words in reverse order**.
A word is a run of non-space characters. On top of reversing, clean up the
spacing: no leading or trailing spaces in the output, and exactly **one**
space between words — no matter how messy the input spacing was.

## Signature

```js
/**
 * @param {string} str - any string; words separated by one or more spaces
 * @returns {string} words in reverse order, single-spaced, trimmed
 */
export function reverseWords(str) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `reverseWords("the sky is blue")` | `"blue is sky the"` | plain reversal |
| `reverseWords("  hello world  ")` | `"world hello"` | outer spaces dropped |
| `reverseWords("a good   example")` | `"example good a"` | inner runs collapse to one space |
| `reverseWords("solo")` | `"solo"` | one word reverses to itself |

## Constraints & edge cases

- Separator is the space character `" "` (no tabs/newlines to worry about).
- The empty string `""` and all-spaces strings like `"   "` → `""`.
- Words keep their own internal characters untouched — you reverse the
  *order of words*, not the letters inside them. `"ab cd"` → `"cd ab"`,
  not `"dc ba"`.
- Punctuation is just part of a word: `"hi, there!"` → `"there! hi,"`.
- Don't mutate anything — strings in JS are immutable anyway, so you'll
  naturally build a new one.

## Hints (take them one at a time!)

1. Trying to walk the string character by character is the hard road.
   JavaScript gives you tools to go string → array → string. Which three
   built-ins would chain here?
2. `str.split(" ")` gets you close but leaves junk: splitting
   `"a  b"` on one space gives `["a", "", "b"]` — empty strings where the
   extra spaces were. You need to either filter those out... or split
   smarter.
3. Two clean routes: (a) `str.split(" ").filter(w => w !== "")`, or
   (b) `str.trim().split(/ +/)` — a regex that eats *runs* of spaces
   (trim first, or a leading space still yields one empty word). Either
   way, then `.reverse().join(" ")`. Special-case: an empty/all-space
   input should come out as `""` (check what your split produces for it!).

## Run it

```
node --test dsa/02-reverse-string-words/attempt.test.js
```
