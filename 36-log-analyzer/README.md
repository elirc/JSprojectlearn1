# 36 — Log analyzer

**Lesson: parse, *then* analyze — regex named groups turn strings into typed objects
at the boundary, and analysis becomes plain data-crunching.**

## Run it

```
node 36-log-analyzer/original.js
node --test 36-log-analyzer/
```

## What's wrong with the original?

1. **`substring(21, ...)` — position surgery.** The magic 21 assumes every timestamp
   is exactly 20 characters forever. Any deviation — fractional seconds, a missing
   field, a corrupted line — doesn't *fail*; it slices the wrong characters and the
   analysis quietly computes nonsense. Wrong numbers you *trust* are far worse than
   a crash.
2. **`parseInt("1240ms")` returning `1240`** looks like a feature — parseInt just
   stops at the `m`! — but the same leniency means `parseInt("garbage from a shifted
   slice")` gives `NaN` or worse, and nothing ever complains.
3. **Parsing and analyzing are fused.** The substring surgery is *inside* the
   counting loop, so each new question ("count by level?", "slowest per path?")
   means pasting the surgery again.

## What changed in the refactor

- **One regex with named groups is the format spec:**
  `(?<level>[A-Z]+)`, `(?<durationMs>\d+)ms`, anchored with `^`/`$`. Read it
  top-to-bottom and you can *see* the line format. Anchoring makes matching
  all-or-nothing: a line either has exactly this shape or `parseLine` returns
  `null` — shifted-column half-parses are impossible. `match.groups` destructures
  into real names, no `match[3]` counting.
- **Types are assigned once, at the boundary** (`Number(status)`), so everything
  downstream does math on numbers, never re-parses strings. The same
  "validate/convert at the edge, trust the inside" as projects 05 and 30.
- **Malformed lines are *counted*, not swallowed.** `parseLog` returns
  `{ entries, malformed }` — because "3% of our log lines don't parse" is itself a
  finding you want surfaced, not hidden in a silent `continue`.
- **`analyze` is three lines per question** — `countBy`, `filter`, `sortBy` over
  plain objects, imported from project 26. New question = new one-liner, because
  parsing is already done. This two-stage shape (extract → aggregate) is every data
  pipeline you'll ever write, from spreadsheets to Spark.

## Key takeaway

Never analyze strings — parse them into typed objects at the edge (regex named
groups are perfect for line formats), keep half-parses impossible with anchored
all-or-nothing matching, and count your rejects. Analysis over clean objects is so
easy it barely needs tests; parsing is where the danger lives, so that's where the
rigor goes.
