# TS 33 — Typed state machine

**Lesson: js#40's transition table with the whole rulebook lifted into types —
illegal transitions don't run *or compile*.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The table-as-data instinct survived the port (good — js#40's core); the
types around it didn't: `Record<string, Record<string, string>>` plus a
`?? state` fallback means *everything* is a silent no-op — typo'd states,
events that exist nowhere, and js#40's forbidden cancel-after-ship all
"succeed" by standing still, indistinguishable from legitimate rejections.
(js#40 at least threw; the port lost even that.) And the table itself is
unchecked: a transition targeting the nonexistent state `'payed'` compiles.

## What changed in the refactor

- **Everything derives from the one table** (`as const`, ts#31):
  `OrderState` from its keys; **`EventFor<S>`** — the events state S
  allows — from each row's keys; **`NextState<S, E>`** from double
  indexing. `transition('pending', 'ship')` is a *compile* error because
  `'ship'` isn't in `EventFor<'pending'>`; terminal states allow nothing
  because `keyof {}` is `never`. All five original no-ops are type tests.
- **Chaining works**: `transition(transition('pending','pay'), 'cancel')`
  — the result type `'paid'` feeds the next call's `S`. The types walk
  the machine with you.
- **The table audits itself** — with an honest lesson attached: the
  obvious `satisfies Record<..., OrderState>` is **circular** (OrderState
  derives from the table), so the audit is a separate assertion that
  collects every transition target and checks it against the state
  union. The corrupt `'payed'` table is a type test. Real constraint,
  real workaround — worth knowing both.
- Runtime callers with dynamic states (from a DB, a user) can't use the
  literal-typed `transition` directly — they narrow first (ts#11's
  guards over `OrderState`), then the typed core takes over. Edges
  validate; interiors prove.

## Key takeaway

The whole track in one artifact: rules as data (js#40), literals preserved
(ts#31), unions derived (ts#07), keys correlated (ts#18), impossibilities
unrepresentable (ts#10/30). When the table is the single source of truth
and every type derives from it, the compiler becomes the enforcement arm
of your business rules.
