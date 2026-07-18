# 35 — Template engine

**Lesson: regex `replace` done right, and the security default that separates toys
from real template engines: escape by default.**

## Run it

```
node 35-template-engine/original.js
node --test 35-template-engine/
```

## What's wrong with the original?

Four bugs, in ascending severity:

1. **`replace("{{name}}", ...)` replaces only the FIRST occurrence.** String-pattern
   replace always does; you need a regex with the `/g` flag for all of them.
2. **No nested paths** — `{{user.name}}` looks up the literal key `"user.name"`.
3. **`$` is magic in replacement *strings*.** `"$&"` expands to the matched text —
   so user data containing `$` corrupts the output in baffling ways. Using a
   replacement *function* opts out of the whole substitution language.
4. **XSS — the one that gets you hacked.** User data flows into HTML verbatim, so a
   "name" of `<img src=x onerror="...">` *executes in every reader's browser*. This
   is cross-site scripting, perennial #1 web vulnerability, and it comes from
   exactly this line of code being written innocently, everywhere, forever.

## What changed in the refactor

- **Escaping is the default; raw is opt-in.** `{{name}}` HTML-escapes, `{{{widget}}}`
  (triple) inserts raw and is *visibly* a decision at the call site. Safe-by-default
  with loud opt-outs is the design of every serious template system (Mustache, JSX,
  Django...) — copy it in yours. The test injects a live payload and asserts it
  comes out inert.
- **`escapeHtml` neutralizes the five break-out characters, `&` first** — otherwise
  the `&` from `&lt;` gets re-escaped. Order dependencies deserve a comment; this one
  has it.
- **`replace(/\{\{\s*([\w.]+)\s*\}\}/g, fn)`** — the regex + callback combo is the
  workhorse: `/g` fixes bug 1, the *capture group* hands the path to the callback,
  the callback fixes bug 3 (no `$` magic) and gives a place for logic. Triple-brace
  runs first so double-brace can't half-eat it — replacement *order as correctness*,
  noted in a comment.
- **`lookup` is `split('.')` + `reduce` + `?.`** — three idioms in one line, and the
  reason `{{a.b.c}}` with a missing `b` renders `''` instead of crashing.

## Key takeaway

Two reflexes to leave with: any user-shaped string entering HTML gets escaped
*by default* — one missed spot is a vulnerability, so defaults must do the work.
And `replace` with a regex + callback function is the right form the moment your
substitution has any logic; replacement strings are for trivial cases only.
