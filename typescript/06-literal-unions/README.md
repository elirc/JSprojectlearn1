# TS 06 — Literal unions

**Lesson: `string` means "any of infinitely many"; your function means "one of
these three." Literal unions close the gap where typos live.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`direction: string` accepts `'ascending'`, `'ASC'`, `'up'`, and every typo —
and the implementation's `else` silently maps all of them to *descending*.
Wrong sort order, no error, ever. `badge(status: string)` has the same
disease with a tell: the `return '❓'` bucket — a "shouldn't happen" case
that exists *because the type allows it to happen*. js#05 met this bug as
runtime data (the `"Hex"` mode string); here the type system was available
and simply wasn't asked.

## What changed in the refactor

- **`type SortDirection = 'asc' | 'desc'`** — the type now states the
  contract exactly. All four bad call sites became compile errors (the type
  tests keep them that way), and *inside* the function the `else` branch is
  provably `'desc'` — the logic got simpler because the input space shrank.
- **`Record<StockStatus, string>`** — the badge table is js#10's
  rules-as-data with a compiler audit attached: add `'preorder'` to the
  union and the table *won't compile* until it has a badge. Union and table
  can't drift; the `'❓'` bucket is deleted because unrepresentable inputs
  need no bucket (js#40's principle at the type level).
- **Free tooling dividends**: autocomplete offers exactly the legal values;
  find-all-references on `SortDirection` shows every mode-touching call
  site; renaming a status is a compiler-guided refactor.
- Where do the strings come from at runtime (user input, URLs, APIs)? Then
  you *narrow* at the boundary — project 13's job. Literal unions type the
  inside; validation converts the outside.

## Key takeaway

Whenever a `string` parameter has a known set of meaningful values — modes,
directions, statuses, sizes — write the union. It's one line, it deletes the
"shouldn't happen" handling, it makes tables self-auditing, and it upgrades
every typo from a quiet wrong answer to a red squiggle.
