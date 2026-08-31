# TS 45 — Fluent builder

**Lesson: a builder whose type doesn't change as you build it offers
`.build()` to a half-built object. Make each step return a richer
type, and "not ready yet" stops compiling.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

Every method returns `this`, so the builder has exactly one type from
`new` to `.build()` — and the compiler offers every method at every
moment with equal confidence. `new QueryBuilder().where('active =
1').limit(10).build()` compiles and throws ("no table"). Worse,
`new QueryBuilder().from('users').build()` compiles and *doesn't*
throw: it returns `'SELECT  FROM users'`, invalid SQL that travels one
more layer before a database rejects it at 3am, in a stack trace that
names the driver instead of the call site.

The knowledge that matters — *a table has been set*, *columns have
been chosen* — lives in three runtime fields the type checker never
looks at. `build()`'s `if (this.table === null) throw` is that
knowledge, written in the one language that only speaks at runtime.

## What changed in the refactor

- **The builder's type advances with the chain.** `Query<Have extends
  Part>` carries a union of the steps completed so far;
  `from()` returns `Query<Have | 'table'>` and `select()` returns
  `Query<Have | 'columns'>`. Optional steps (`where`, `limit`) return
  `Query<Have>` — unchanged, because they gate nothing. Order stays
  free: unions don't care which member arrived first, and adding a
  flag twice is a no-op.
- **`build()` is gated by a `this` parameter.** `build(this:
  Query<'table' | 'columns'>)` is not a runtime argument — it's a
  requirement on the *receiver*, checked at every call site. A
  `Query<'table'>` isn't assignable to it, so `.build()` simply isn't
  available yet.
- **A phantom makes the flags real.** `declare private readonly have:
  Record<Have, true>` is ts#29's brand pointed at *progress* instead
  of units: never assigned, erased at runtime, and the only reason
  `Query<'table'>` and `Query<'table' | 'columns'>` differ
  structurally. Delete that one line and every type test below goes
  green-but-meaningless — with `Have` otherwise unused, the compiler
  has nothing to compare. (LEARN 8.1 makes you watch it happen.)
- **The runtime guard is gone.** `build()` no longer checks for a
  missing table, because a builder without one can't reach it. ts#30's
  rule, applied to a *sequence* instead of a state object: when the
  bad state is unrepresentable, the defensive `throw` has nothing left
  to defend.

## Key takeaway

Fluent APIs read like sentences, and `this`-returning builders let you
write nonsense sentences fluently. The fix isn't documentation, it's a
type parameter: track what's been done, return a richer type from each
required step, and gate the terminal method on a `this` parameter.
This is **typestate** — the same idea ts#46 applies to a connection's
lifecycle, here applied to an object under construction.
