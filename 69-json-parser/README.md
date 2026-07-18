# 69 — JSON parser from scratch

**Lesson: tokenizer + recursive descent — input stays data, errors get
coordinates, and strictness is a feature. The foundational
language-shaped skill.**

## Run it

```
node 69-json-parser/original.js     # watch "ARBITRARY CODE RAN" print
node --test 69-json-parser/
```

## What's wrong with the original?

`new Function("return (" + text + ")")()` — eval by another name:

1. **It executes the input.** A malicious config file *runs* the moment
   you parse it (the demo prints proof). This is literally how JSON was
   parsed before 2009, and json2.js/`JSON.parse` exist because of how
   that went.
2. **It accepts non-JSON** — single quotes, trailing commas, comments,
   `undefined`, hex — silently forking the format; configs that "work"
   here break under any real parser.
3. **Errors are whatever the engine says about the *generated code***:
   "Unexpected token )" with no line, no column, no clue which byte of
   which file.

## What changed in the refactor

- **Stage 1, `tokenize`**: characters → `{type, value, pos}` tokens.
  Strings handle every escape (`\n`, `\"`, `\\`, `\uXXXX`) and reject raw
  control characters; numbers follow the JSON grammar exactly (leading
  zeros are an error). Every token carries its byte position.
- **Stage 2, recursive descent**: one function per grammar rule —
  `parseValue`, `parseObject`, `parseArray` — with the grammar's
  recursion giving nesting for free (project 49's shape; project 37's
  recursion lesson). A final `expect('eof')` refuses trailing junk.
- **`JsonError` converts positions to line/column** and says what was
  *expected* — "Expected a value but found `}` at line 4, column 1" is a
  fix-it message, not a shrug.
- **The security proof is a test**: the original's payload shape is a
  syntax error here, and code inside strings stays a string. Parsing is
  reading, never evaluating.
- **A property test**: a gnarly document must round-trip identically to
  the real `JSON.parse` — the spec is the referee, not our intuition.

## Key takeaway

"Too permissive" is a parser bug as real as "too strict" — accept more
than the spec and you've invented a private dialect everyone else's tools
reject. And note what made both safety and good errors *possible*: the
two-stage structure. Tokens with positions are why errors have
coordinates; a grammar walked by functions is why nothing executes. This
is the warm-up for project 71's full language.
