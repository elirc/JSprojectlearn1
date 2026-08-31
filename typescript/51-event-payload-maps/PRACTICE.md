# 🏋️ Practice: Event Payload Maps

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/analytics.ts` (it already has `EventMap`, `EventName`, `AnalyticsEvent`, `Middleware` and `track`), or in a scratch `.ts` file inside the `typescript/` folder ending with `export {}`. Run `npm run typecheck` after each step.

## Exercises

### ⭐ 1. Add an event (warm-up)

Add `refund: { orderId: string; amountCents: number; reason: 'duplicate' | 'faulty' }` to `EventMap`. Then track one, and write two type tests: a bad `reason` and a missing `orderId`.

**Practices:** feeling how cheap a new event is once the map exists — and how much checking arrives for free.
**Hint:** you should not have to touch `track`, `Middleware`, `AnalyticsEvent`, or either existing middleware. If you find yourself editing them, the map isn't carrying the contract yet.
**Check:** `track('refund', { orderId: 'o-1', amountCents: 4900, reason: 'faulty' })` compiles; `reason: 'lost'` errors with roughly "'lost' is not assignable to type 'duplicate' | 'faulty'"; omitting `orderId` errors naming the missing property.

### ⭐⭐ 2. A typed subscriber (core)

Analytics is half of a pub/sub pair. Write `on<K extends EventName>(name: K, handler: (payload: EventMap[K]) => void): () => void` that registers a handler and returns an unsubscribe function.

**Practices:** the same map serving a second API — and the handler's parameter being *inferred*, not annotated.
**Hint:** store handlers in a `Map<EventName, Set<(payload: never) => void>>`. The two `as (payload: never) => void` casts inside are ts#20's exact trade: a store that holds handlers for *different* events can't be tracked by the compiler, so contain the unsafety and check the public signature.
**Check:** `on('purchase', (payload) => console.log(payload.amountCents))` must compile with `payload` inferred; `on('page_view', (payload) => payload.amountCents)` must error; `on('purcahse', () => {})` must error on the name.

### ⭐⭐ 3. A per-event validator table (core)

Before sending, each event should be sanity-checked. Write `type Validators = { [K in EventName]: (payload: EventMap[K]) => boolean }` and fill it in — each validator receives *its own* payload type, with no narrowing needed.

**Practices:** a mapped type as an exhaustive lookup table (ts#12's `Record` idiom, with per-key value types).
**Hint:** the value type depends on the key, which is why this is a mapped type rather than `Record<EventName, (p: unknown) => boolean>`. Inside `purchase: (payload) => ...`, `payload.amountCents` is available immediately.
**Check:** every validator's parameter must be correctly typed without annotations; a table missing one event must error with roughly "Property 'refund' is missing". That error is the point — add an event and the compiler walks you to every table that must grow.

### ⭐⭐ 4. `PayloadOf` and grouping (core)

Write `type PayloadOf<K extends EventName> = Extract<AnalyticsEvent, { name: K }>['payload']`, then `groupByName(events: readonly AnalyticsEvent[])` returning `{ [K in EventName]: Extract<AnalyticsEvent, { name: K }>[] }`.

**Practices:** `Extract` as the tool for pulling one member out of a discriminated union, and mapped types that *preserve* the correlation in the result.
**Hint:** the loop body `groups[event.name].push(event)` won't compile — `groups[event.name]` is a union of array types, and TypeScript won't push into a union. One contained cast (`as AnalyticsEvent[]`) with a comment, exactly like `track`'s.
**Check:** `PayloadOf<'purchase'>` must accept a purchase payload and reject a page_view one; `grouped.purchase[0]?.payload.amountCents` must compile and `grouped.purchase[0]?.payload.path` must error — proof that the grouping kept each bucket's payload type.

### ⭐⭐⭐ 5. A per-event middleware factory (challenge)

Writing `if (event.name === 'purchase')` in every middleware gets old. Write `forEvent<K extends EventName>(name: K, transform: (payload: EventMap[K]) => EventMap[K]): Middleware` — a factory producing a middleware that transforms one event kind and passes everything else through.

**Practices:** the limits of narrowing, and where casts legitimately go.
**Hint:** `if (event.name !== name) return event;` is a real runtime check, but it does **not** narrow `event.payload` — the compiler can't relate a generic `K` to a discriminant. Two contained casts (`event.payload as EventMap[K]` and `{ name, payload } as AnalyticsEvent`), both justified by the line above them.
**Check:** `forEvent('purchase', (p) => ({ ...p, amountCents: Math.ceil(p.amountCents / 100) * 100 }))` must compile with `p` inferred; `forEvent('purchase', (p) => ({ sku: p.sku }))` must error (an incomplete payload); `forEvent('signup', (p) => ({ ...p, plan: p.path }))` must error, since a signup payload has no `path`.

### ⭐⭐⭐ 6. A prefixed server-side map (challenge)

The backend emits the same events under `server:`-prefixed names. Derive the second map instead of writing it: ``type ServerEventMap = { [K in EventName as `server:${K}`]: EventMap[K] }``, then a `relay` function over its keys.

**Practices:** key remapping in mapped types (`as` clauses) plus template-literal types (ts#26) — deriving a whole API surface from one declaration.
**Hint:** the `as` inside a mapped type is *key remapping*, not a type assertion — a completely different `as` from ts#14's. It renames each key while the value type comes along unchanged.
**Check:** `relay('server:purchase', { sku, amountCents, currency })` must compile; `relay('purchase', ...)` must error (the prefix is part of the name); `relay('server:signup', { path, referrer })` must error on the payload. Add an event to `EventMap` and confirm the server map grows on its own — that's the payoff for deriving rather than duplicating.

## Solutions

### 1. Add an event

```ts
interface EventMap {
  // ...existing events...
  refund: { orderId: string; amountCents: number; reason: 'duplicate' | 'faulty' };
}
track('refund', { orderId: 'o-1', amountCents: 4900, reason: 'faulty' });
// @ts-expect-error — 'lost' is not a refund reason
track('refund', { orderId: 'o-1', amountCents: 4900, reason: 'lost' });
// @ts-expect-error — refunds need an orderId
track('refund', { amountCents: 4900, reason: 'faulty' });
```

**WHY:** nothing else changed. `EventName` gained a member, `AnalyticsEvent` gained a union arm, `track` accepted a new key, and both middlewares kept working because they narrow on the names they care about and pass everything else through. That's the test of whether a contract really lives in one place: adding to it should be a one-line edit, and every guarantee should arrive automatically.

### 2. A typed subscriber

```ts
type Handler<K extends EventName> = (payload: EventMap[K]) => void;
const handlers = new Map<EventName, Set<(payload: never) => void>>();

function on<K extends EventName>(name: K, handler: Handler<K>): () => void {
  if (!handlers.has(name)) handlers.set(name, new Set());
  const set = handlers.get(name)!;
  set.add(handler as (payload: never) => void);
  return () => set.delete(handler as (payload: never) => void);
}

on('purchase', (payload) => console.log(payload.amountCents));
on('signup', (payload) => console.log(payload.plan, payload.referredBy ?? '-'));
// @ts-expect-error — a page_view payload has no amountCents
on('page_view', (payload) => console.log(payload.amountCents));
// @ts-expect-error — unknown event
on('purcahse', () => {});
```

**WHY:** the handler's parameter type is *computed* from the name you passed, so you never annotate it and it can never drift — write `payload.` after `on('purchase', (payload) =>` and autocomplete lists exactly the purchase fields. The `never` casts are the same contained unsafety ts#20's emitter uses: one `Set` per name holds handlers of *different* types, which is a real thing the compiler cannot model, so the ignorance is sealed inside two lines rather than leaked as `any` into every subscriber.

### 3. A per-event validator table

```ts
type Validators = { [K in EventName]: (payload: EventMap[K]) => boolean };

const validators: Validators = {
  page_view: (payload) => payload.path.startsWith('/'),
  purchase: (payload) => payload.amountCents > 0 && payload.sku.length > 0,
  signup: (payload) => payload.plan === 'free' || payload.plan === 'pro',
  refund: (payload) => payload.amountCents > 0,
};
// @ts-expect-error — a validator table missing an event does not compile
const incomplete: Validators = {
  page_view: () => true, purchase: () => true, signup: () => true,
};
```

**WHY:** `Record<EventName, (p: unknown) => boolean>` would also be exhaustive, but every validator would then have to re-narrow its own payload. A *mapped* type keeps the key/value correlation, so each entry is handed its own payload type with no `if` and no cast. And the missing-key error is the ts#12 lesson in table form: the compiler can't remind you to validate a new event, but it can refuse to compile a table that doesn't.

### 4. `PayloadOf` and grouping

```ts
type PayloadOf<K extends EventName> = Extract<AnalyticsEvent, { name: K }>['payload'];
const p1: PayloadOf<'purchase'> = { sku: 'x', amountCents: 1, currency: 'USD' };
// @ts-expect-error — that's a page_view payload
const p2: PayloadOf<'purchase'> = { path: '/x', referrer: null };

type EventsByName = { [K in EventName]: Extract<AnalyticsEvent, { name: K }>[] };
function groupByName(events: readonly AnalyticsEvent[]): EventsByName {
  const groups: EventsByName = { page_view: [], purchase: [], signup: [], refund: [] };
  for (const event of events) {
    // one contained cast: the correlation is real, the write is not checkable
    (groups[event.name] as AnalyticsEvent[]).push(event);
  }
  return groups;
}
const grouped = groupByName(stream);
const cents: number | undefined = grouped.purchase[0]?.payload.amountCents;
// @ts-expect-error — the purchase group holds only purchase payloads
grouped.purchase[0]?.payload.path;
```

**WHY:** `Extract<Union, Shape>` keeps the union members assignable to `Shape` — with a discriminated union that's "give me the member with this tag", the standard way to name one arm without duplicating its definition. The return type is where the value shows up: a plain `AnalyticsEvent[][]` would have thrown the grouping information away, but `{ [K in EventName]: Extract<...>[] }` means the *type* of `grouped.purchase` already knows what's in it, so downstream code reads `payload.amountCents` with no checks at all.

### 5. A per-event middleware factory

```ts
function forEvent<K extends EventName>(
  name: K,
  transform: (payload: EventMap[K]) => EventMap[K],
): Middleware {
  return (event) => {
    if (event.name !== name) return event;
    // the two contained casts: `event.name === name` proves the
    // correlation at runtime, but not to the compiler
    const payload = transform(event.payload as EventMap[K]);
    return { name, payload } as AnalyticsEvent;
  };
}

const roundUp = forEvent('purchase', (payload) => ({
  ...payload,
  amountCents: Math.ceil(payload.amountCents / 100) * 100,
}));
// @ts-expect-error — the transform must return a COMPLETE purchase payload
forEvent('purchase', (payload) => ({ sku: payload.sku }));
// @ts-expect-error — a signup payload has no .path to read
forEvent('signup', (payload) => ({ ...payload, plan: payload.path }));
```

**WHY:** this is the honest edge of the technique. Narrowing works when the *value* is a discriminated union and you compare against a literal; it does not work when you compare against a generic `K`, because the compiler has no way to know that this particular `K` is `'purchase'`. So the runtime check is correct and the compiler can't follow it — the textbook case for a cast with a comment. Everything the *caller* sees stays fully checked: the transform's parameter and return type are both `EventMap[K]`, which is why the two failing tests fail. Note the shape of the win: one unverifiable function buys narrowing-free ergonomics at every use site.

### 6. A prefixed server-side map

```ts
type ServerEventMap = { [K in EventName as `server:${K}`]: EventMap[K] };
type ServerEventName = keyof ServerEventMap; // 'server:page_view' | 'server:purchase' | ...

declare function relay<K extends ServerEventName>(name: K, payload: ServerEventMap[K]): void;

relay('server:purchase', { sku: 'x', amountCents: 1, currency: 'EUR' });
// @ts-expect-error — the prefix is part of the name
relay('purchase', { sku: 'x', amountCents: 1, currency: 'EUR' });
// @ts-expect-error — the payload still has to match
relay('server:signup', { path: '/x', referrer: null });
```

**WHY:** the `as` clause in a mapped type renames keys as it walks them — a completely different `as` from the type assertion of ts#14, and one of the most useful features in the language. The derived map is *live*: add `refund` to `EventMap` and `'server:refund'` exists immediately, with the right payload, in every function typed over `ServerEventName`. Compare with the alternative of writing a second interface by hand, which starts identical and is wrong within two sprints. The general principle across this whole exercise: state the contract once, then derive every view of it — client map, server map, validator table, group buckets, subscriber API — from that single declaration.
