# 02 — Count character occurrences

**Lesson: pure functions, `Map` vs plain object, and hunting edge cases on purpose.**

## Run it

```
node 02-count-characters/original.js
node --test 02-count-characters/
```

## What's wrong with the original?

It works for `"hello world"` — and that's exactly the trap. "It works for the input I
tried" is not the same as "it works."

1. **`str[i]` breaks emoji.** JavaScript strings are UTF-16 under the hood: `"💩".length`
   is `2`, and indexing gives you two meaningless surrogate halves. `for (const char of
   text)` iterates real characters. Run the original and look at the output for `"💩💩"`.
2. **Plain objects are not clean dictionaries.** They inherit keys like `constructor` and
   have the `__proto__` trapdoor. When your keys come from *user input*, use a `Map` —
   it has no inherited baggage, plus `.size` and guaranteed ordering for free.
3. **No input validation.** Pass a number and the original silently returns `{}` — a wrong
   answer that *looks* right. The refactor throws a `TypeError` immediately. Failing loudly
   at the boundary beats failing quietly three functions later.

## What changed in the refactor

- `countCharacters` is **pure**: string in, `Map` out, nothing printed, nothing global.
  Notice how natural the tests read as a result.
- `counts.get(key) ?? 0` replaces the if/else dance. `??` (nullish coalescing) means
  "if missing, use 0" — one line, no branch.
- The optional `{ ignoreCase }` **options object** previews project 11: named options
  beat mystery positional booleans (`countChars(s, true)` — true *what*?).
- The tests document the edge cases *forever*. The next person who touches this file
  can't accidentally reintroduce the emoji bug without a red test telling them.

## Key takeaway

Write down your edge cases as tests before you trust a function: empty input, weird
unicode, hostile keys, wrong types. A pure function makes that cheap; five of the seven
tests here are one line of assertion each.
