# 05 — Text to hex/binary converter

**Lesson: input validation at the boundary, and small composable functions instead of
a mode switch.**

## Run it

```
node 05-text-to-hex/original.js
node --test 05-text-to-hex/
```

## What's wrong with the original?

1. **The `mode` string is a trap.** `convert("Hi!", "Hex")` — capital H — returns `""`.
   No error, no warning, just silently nothing. Stringly-typed mode switches fail like
   this constantly. The refactor deletes the mode entirely: two functions with two
   names, `textToHex` and `textToBinary`. You can't typo a function name silently —
   the program refuses to run.
2. **The two branches are near-duplicates.** Same loop, same padding dance, different
   radix and width. That's not two behaviors, it's one behavior with two *parameters* —
   so the refactor makes it one function, `formatCodePoint(cp, { radix, width })`.
3. **No validation.** `convert(42, "hex")` crashes deep inside with
   `text.charCodeAt is not a function` — an error about the *implementation*, not the
   *mistake*. The refactor checks the type once, at the entry point, and throws a
   message about what the caller did wrong. Validate at the boundary; trust the inside.
4. **Manual padding loops** (`while (b.length < 8) b = "0" + b`) — the platform already
   has `padStart(8, '0')`. Knowing the standard library deletes code.
5. **Trailing space** from `+= h + " "`. Building an array and `join(' ')`-ing it makes
   separator bugs impossible — there's simply no separator after the last item.

## What changed in the refactor

The pipeline shape is the big idea:

```
text  →  toCodePoints  →  map(formatCodePoint)  →  join(' ')
```

Each step is a tiny pure function doing one transformation. `textToHex` and
`textToBinary` are just the same pipeline with different numbers plugged in — four
lines each. And `toCodePoints` is independently useful (project 24 does the same
brightness-mapping pipeline with pixels instead of characters).

## Key takeaway

When a function takes a `mode`/`type` string and branches on it, you usually have two
functions wearing a trench coat. Split them, extract what's shared, and let `map` /
`join` handle the plumbing.
