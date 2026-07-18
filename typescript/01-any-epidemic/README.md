# TS 01 — The `any` epidemic

**Lesson: `any` doesn't skip checking — it disables it and *spreads*. `unknown`
is the honest type for data you haven't checked yet.**

## Run it

```
npm run typecheck                                   (must be clean)
node --experimental-strip-types typescript/01-any-epidemic/original.ts
```

## What's wrong with the original?

It compiles **cleanly under strict mode** and computes `NaN`. One
`parseOrder(): any` at the entry point, and everything downstream is
unchecked: `item.quantety` (typo → `undefined` → `NaN`), `customer.adress`
(typo → `"undefined"` in the label). `any[anything]` is `any`; `any` assigned
to `number` is fine — so `total: number` is a *typed lie*, and everything
computed from it inherits the lie, exactly the way NaN spreads through
arithmetic. Strict mode can't help; `any` is the off switch, and it flows
through assignments, returns, and parameters.

## What changed in the refactor

- **Named shapes** (`Order`, `OrderItem`, `Customer`) — three interfaces that
  make both typos *impossible to write*. The type tests at the bottom prove
  it: the original's exact bugs, marked `@ts-expect-error`, i.e. "this must
  NOT compile" — and tsc fails the build if any of them ever *does*.
- **`unknown` at the boundary** — the honest type for `JSON.parse`'s result.
  Unlike `any`, `unknown` infects nothing: you can't touch it until you've
  narrowed it (`isOrder` guard, project 11 formalizes). Same edge-validation
  as js#30, now with the compiler enforcing that you did it.
- **Annotations only at the boundary.** Inside `orderTotal`, `sum` and `item`
  are inferred from `Order` — fix the edges and inference types the middle
  (project 02's whole topic).

## Key takeaway

Every `any` is a hole in the hull, and holes leak into whatever they touch.
When you genuinely don't know a shape yet, say `unknown` — it forces the
check `any` lets you skip. Grep your codebase for `: any`; each one marks the
exact place a typo becomes a production NaN.
