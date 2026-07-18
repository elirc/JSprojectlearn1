# TS 14 — satisfies vs as

**Lesson: `as` overrules the compiler; annotations widen your values;
`satisfies` checks without changing — know which of the three you're doing.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The author faced a real dilemma and picked the worst horn:

- **`as Theme`** kept the object "typed"... by *overruling* the check: a
  missing `text` field sails through (typed `string`, is `undefined`), and a
  typo'd extra (`primry`) is waved along silently. `as` is not "check this"
  — it's "stop checking this."
- **The annotation alternative** (`routes: Record<string, string>`) *does*
  check — but it **widens**: the compiler forgets which keys exist, so
  `routes.amdin` compiles (typed `string`, is `undefined`). Precision
  traded for checking.

Checked-but-widened vs precise-but-unchecked. The original didn't know
there's a third option.

## What changed in the refactor

- **`satisfies Theme`** — check against the contract *without becoming* it.
  Missing field: error. Typo'd excess: error. And `theme` keeps its precise
  inferred type, so downstream code retains literal knowledge. All four
  failure modes are pinned as type tests.
- **The routes table is where it shines**: `satisfies Record<string,
  string>` verifies every value is a string, while `routes` keeps its
  literal keys — so `routes.amdin` is now a compile error and `routes.`
  autocompletes real routes. Checked AND precise; the dilemma dissolves.
- **The decision table** to internalize:
  - *annotate* (`: T`) — when you want the variable to BE the general type
    (parameters, empty containers — ts#02);
  - *`satisfies T`* — when you want conformance checked but precision kept
    (config objects, tables, route maps — most literal data);
  - *`as T`* — almost never; legitimate only when *removing* capability
    (`any → unknown`, ts#13) or in its `as const` special form (ts#31).
  In review, every other `as` deserves the question: *what check is this
  replacing?*

## Key takeaway

For literal data with a contract — configs, tables, theme objects — default
to `satisfies`: the compiler audits the shape, your code keeps the
precision, and nothing is overruled. Save `:` for declarations that should
widen, and treat `as` as a red flag with two known exceptions.
