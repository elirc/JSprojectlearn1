# 72 — Regex engine

**Lesson: backtracking — quantifiers are choice points, recursion is the
undo log, and the "magic" of regex is 60 lines of disciplined search.**

## Run it

```
node 72-regex-engine/original.js    # watch a*a fail against "aaa"
node --test 72-regex-engine/
```

Supported: literals, `.`, `*`, `+`, `?`, `[abc]` `[a-z]` `[^...]`, `^` `$`,
and `\` escapes.

## What's wrong with the original?

1. **The fatal greed.** Its `*` consumes every matching character, then
   moves on — a choice it can never revisit. `a*a` against `"aaa"` fails:
   the star ate all three a's and the final `a` starves. `.*x` against
   `"abcx"` fails the same way. Greedy-without-backtracking is *the*
   misstep that makes regex engines seem like magic.
2. **Anchored-only**: matching always starts at `text[0]`, so `b.g` is
   invisible inside `"a big dog"` — and there's no `^`/`$` to *choose*
   anchoring, no classes, no `+`/`?`.

## What changed in the refactor

- **Parse first** (projects 69–71's two-stage shape): the pattern becomes
  `{atom, quant}` nodes — classes, ranges, negation, and escapes resolved
  *once*, so the matcher never re-reads pattern syntax. Malformed patterns
  (`*a`, `[abc`, trailing `\`) are loud SyntaxErrors at parse time.
- **The matcher backtracks.** A quantifier match is a loop of choice
  points: consume the minimum, ask "can the *rest* of the pattern match
  from here?", and only on refusal consume one more and ask again. Each
  failed recursive call unwinds automatically — **the call stack is the
  undo log** (project 07's recursion, weaponized). `a*a` vs `"aaa"` is
  the three-line proof.
- **Unanchored by default**: try every starting position; `^` and `$`
  are explicit flags from the parse, checked at the two ends of the walk.
- **A spot-check suite runs the same cases through JavaScript's own
  `RegExp`** — the platform is the referee (project 69's round-trip
  trick).

## Key takeaway

Backtracking search — make a choice, recurse, undo on failure — is the
algorithm under regex engines, sudoku solvers, parsers, and type
inference. Regex is just its most famous costume. (It's also why
`(a+)+$` can melt a real engine: exponential choice points — "ReDoS".
Production engines like RE2 avoid it by compiling to automata instead —
the natural next rabbit hole from here.)
