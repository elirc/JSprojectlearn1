# TS 12 — Exhaustive switches

**Lesson: `default: return 'unknown'` hides every missing case — `never` makes
the compiler find each switch when a union grows.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The business added `'refunded'` to the union last sprint. Both switches over
`OrderStatus` have a `default` bucket, so both *kept compiling* — and
refunded orders have shown **"unknown status"** to customers ever since. No
error, no test failure, no squiggle. The `default` clause is ts#06's `'❓'`
bucket wearing switch syntax: it compiles for any missing case, which means
it *conceals* every missing case. And unions grow — that's their job — so
every switch over one is a landmine the next added member steps on.

## What changed in the refactor

Two idioms, both turning "missing case" into a build failure:

1. **The `assertNever` sentinel.** `never` is the type with *no values*. If
   a switch handles every case, the `default` branch is unreachable and its
   value has type `never` — so `assertNever(status)` typechecks. Miss a
   case, and that case's type flows into the call — `'refunded'` is not
   `never` → compile error *at the switch that needs updating*. Adding a
   union member becomes: add it, build, and the compiler hands you a todo
   list of every switch in the codebase. (The runtime throw inside is the
   second net, for values that lied their way past the types.)
2. **The `Record` table** (ts#06's move, now as the *primary* exhaustiveness
   tool): `Record<OrderStatus, string>` won't compile until every status has
   an entry — no switch at all, and the type test proves an incomplete
   table fails. Prefer it when each case is a *value*; use the switch +
   `assertNever` when cases need *logic*.

The miniature `Coin` example in the type tests shows the mechanism
catching a deliberately broken switch — the `@ts-expect-error` there is
asserting "an unhandled case must not compile."

## Key takeaway

In a codebase with unions, `default: something-vague` is a bug incubator.
End every union switch with `assertNever`, or replace it with a `Record`
table — then growing the union stops being a code hunt and becomes a
compiler-guided checklist. This is the payoff half of project 10: model
states as unions *and* make every consumer provably complete.
