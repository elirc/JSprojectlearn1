# TS 51 — Event payload maps

**Lesson: `track(event: string, payload: any)` puts the two loosest types in
TypeScript at the point where the business measures itself — an event map
turns the data team's spreadsheet into a contract the compiler enforces.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

Four contract violations, all compiling, none noticed at runtime.
`track('purchase', { sku })` ships the revenue event with **no amount**, so
the quarter reads $0 for every purchase through that call site.
`track('purcahse', ...)` is a perfectly well-formed message that lands in a
bucket nothing queries — invisible except as a dashboard that's
mysteriously low. `track('signup', { plan: 'enterprise' })` invents a plan
the product doesn't sell. And the middleware pipeline, typed
`(event: string, payload: any) => any`, lets one middleware read a `price`
field that was renamed a year ago (`Math.round(undefined)` → `NaN`) and
another forget its `return` entirely, mapping every payload to `undefined`.

The contract is real — it lives in a spreadsheet the data team maintains.
It just isn't anywhere the compiler can see it.

## What changed in the refactor

- **`EventMap` is the contract**: event name → exact payload shape,
  including literal unions for `currency` and `plan` (ts#06) and a genuinely
  optional `referredBy` (ts#04).
- **`track<K extends keyof EventMap>(name: K, payload: EventMap[K])`** — the
  name is inferred from the literal, and the payload type is looked up from
  it, so name and payload can never disagree (ts#18, ts#20).
- **`AnalyticsEvent` is a derived discriminated union**: mapping over the
  keys and indexing back out — `{ [K in EventName]: { name: K; payload:
  EventMap[K] } }[EventName]` — produces one union member per event. This is
  ts#32's action-type trick, and it's what lets a middleware *narrow*:
  `if (event.name === 'purchase')` makes `event.payload.amountCents` visible
  and the stale `price` field unspellable.
- **`Middleware = (event: AnalyticsEvent) => AnalyticsEvent`** preserves
  payload types through the whole pipeline, and makes the missing `return` a
  compile error rather than a silently emptied event.
- **One contained cast**, in `track`, where the name/payload correlation is
  real but unverifiable through a generic key — sealed inside a function
  whose every public signature is checked (ts#20 makes the same trade).
- Nine `@ts-expect-error` tests replay all four original bugs plus the two
  broken middlewares.

## Key takeaway

Analytics, feature flags, webhooks, message queues — anywhere a *name*
selects a *shape*, the pairing belongs in a map type, not in a wiki. Take
the key as a generic parameter so the payload type follows from it, and
derive a discriminated union from the same map when the pairs need to travel
as values. Then the spreadsheet stops being a thing people remember to check
and becomes a thing the build checks for them.
