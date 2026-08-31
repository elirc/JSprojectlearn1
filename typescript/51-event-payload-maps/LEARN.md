# 📘 Learning Guide: Event Payload Maps

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Every product measures itself. Someone writes `track('purchase', { sku, amountCents, currency })`, a pipeline decorates the event, and a warehouse stores it. The shapes of those payloads are a *contract* — the data team's queries depend on them — but the contract usually lives in a spreadsheet, while the code says `track(event: string, payload: any)`.

`string` and `any` are the two loosest types TypeScript has, and here they sit at the exact place where the business finds out how it's doing. So `track('purchase', { sku })` — no amount — compiles, sends, and stores. Q3 revenue reads $0 for every purchase made through that call site, and nothing anywhere raises a hand.

The fix is an **event map**: an interface where each key is an event name and each value is that event's exact payload type. One generic function reads it, so passing the wrong payload for a name becomes a compile error. And because the pipeline needs to pass events around as *values*, this exercise also derives a **discriminated union** from the same map — the shape that lets a middleware narrow `event.payload` by checking `event.name`.

## 2. Concepts you need first

### 2.1 A map type: name → shape

```ts
export interface EventMap {
  page_view: { path: string; referrer: string | null };
  purchase: { sku: string; amountCents: number; currency: 'USD' | 'EUR' };
  signup: { plan: 'free' | 'pro'; referredBy?: string };
}
export type EventName = keyof EventMap; // 'page_view' | 'purchase' | 'signup'
```

Nothing exotic — an interface used as a lookup table. `EventMap['purchase']` is the purchase payload type. Note the literal unions (`'USD' | 'EUR'`, `'free' | 'pro'`, ts#06): they're what turns "'enterprise' isn't a plan" from a data-quality meeting into a squiggle.

### 2.2 Generic key parameters (ts#18, ts#20 refresher)

```ts
// ❌ the two loosest types, at the worst possible place
declare function track(event: string, payload: any): void;

// ✅ the key is inferred from the literal; the payload follows from the key
declare function track<K extends EventName>(name: K, payload: EventMap[K]): void;
```

Pass `'purchase'` and `K` becomes the literal type `'purchase'`, so `payload` must be `EventMap['purchase']`. Pass `'purcahse'` and there's no such key — `K` can't be inferred, and the call fails. One signature, a different payload requirement at every call site.

### 2.3 Optional properties are not "anything" (ts#04 refresher)

```ts
signup: { plan: 'free' | 'pro'; referredBy?: string };

track('signup', { plan: 'pro' });                  // ✅ referredBy may be absent
track('signup', { plan: 'pro', referredBy: 42 });  // ❌ absent ≠ untyped
```

`?` means "this key may be missing"; it does not relax the type when the key *is* there.

### 2.4 Deriving a discriminated union from a map

Here's the move that makes the middleware pipeline work. A middleware receives one event as a *value*, so the name and payload must travel together, correlated:

```ts
type AnalyticsEvent = {
  [K in EventName]: { readonly name: K; readonly payload: EventMap[K] };
}[EventName];
```

Read it in two steps. The mapped type builds an object with one entry per event name, each entry being `{ name: 'purchase'; payload: PurchasePayload }` and so on. Then `[EventName]` indexes that object by the *union* of its keys — and indexing by a union gives you the union of the values. The result:

```ts
| { readonly name: 'page_view'; readonly payload: { path: string; referrer: string | null } }
| { readonly name: 'purchase';  readonly payload: { sku: string; amountCents: number; currency: 'USD' | 'EUR' } }
| { readonly name: 'signup';    readonly payload: { plan: 'free' | 'pro'; referredBy?: string } }
```

A discriminated union (ts#10), generated from the map rather than hand-written next to it — so it can never drift. This is exactly the trick ts#32 uses to build reducer action types.

### 2.5 Why the union is what enables narrowing

```ts
const mw: Middleware = (event) => {
  if (event.name === 'purchase') {
    event.payload.amountCents; // ✅ narrowed to the purchase member
    event.payload.path;        // ❌ that field belongs to page_view
  }
  return event;
};
```

Checking the discriminant narrows the *whole* union member, payload included. This is the capability the original's `(event: string, payload: any)` could never have: two independent parameters carry no relationship, so knowing the name tells the compiler nothing about the payload.

### 2.6 Correlated generics: the one place TypeScript can't check

Inside `track`, you have `name: K` and `payload: EventMap[K]` and you want to build an `AnalyticsEvent`:

```ts
let event: AnalyticsEvent = { name, payload }; // ❌ error
```

The correlation is real — that's what `K` *means* — but TypeScript checks the object against each union member independently, and `K` (which could be any of the three names) isn't assignable to the literal `'signup'`. So this is a genuine limitation, and the honest response is one cast, in one place, with a comment:

```ts
let event: AnalyticsEvent = { name, payload } as AnalyticsEvent;
```

ts#20's typed emitter makes the same trade for the same reason. The rule to take away: when unsafety is unavoidable, make it *small*, *named*, and *surrounded by checked signatures* — not spread across every call site as `any`.

## 3. Walking through the original code

The facade:

```ts
type Middleware = (event: string, payload: any) => any;
export function track(event: string, payload: any): void { ... }
```

`event: string` accepts every string, including typos. `payload: any` accepts every value, including the empty object. `=> any` lets a middleware return anything, including nothing.

The pipeline demonstrates all three:

```ts
use((event, payload) => {
  if (event === 'purchase') {
    return { ...payload, price: Math.round(payload.price) };
  }
  return payload;
});
```

`price` was renamed to `amountCents` a year ago. `payload.price` is `undefined`, `Math.round(undefined)` is `NaN`, and the event ships with `price: NaN`. `any` had no opinion.

```ts
use((event, payload) => {
  if (event === 'page_view') console.log('[analytics]', event, payload.path);
});
```

No `return`. Every payload becomes `undefined`; every downstream event carries nothing. `=> any` accepted that too.

Then the call sites:

```ts
track('purchase', { sku: 'ts-101' });   // no amount   -> $0 revenue
track('purcahse', { ...valid... });     // typo        -> a bucket nobody queries
track('signup', { plan: 'enterprise' });// invented plan
```

Every one is a contract violation, and every one compiles.

## 4. What's wrong with it (in beginner terms)

**Bug story — the quarter that read $0.** Checkout was rewritten and the new code called `track('purchase', { sku })`, because the developer copied a snippet from an older event. Tests passed (the analytics client is mocked). The staging dashboard looked fine (nobody buys in staging). Six weeks later, finance asks why the self-serve channel shows no revenue. The answer is a missing property in an object literal, in a function whose second parameter was typed `any`.

**Why this class of bug survives so long.** Analytics has no consumer that fails loudly. A wrong API response crashes a page; a wrong event just… gets stored. The gap between the mistake and the discovery is measured in weeks, and by then the data is unrecoverable — you can't backfill a value that was never sent.

**Why the typo is the worst one.** `track('purcahse', ...)` sends a *perfectly formed* message. There is no corrupt record to find, no error to search for. The only symptom is a number that's lower than it should be, which is indistinguishable from the business being worse than it should be.

**The pattern to notice:** whenever a *name* selects a *shape*, the two loose parameters are hiding a map. `emit(event, payload)`, `dispatch(type, payload)`, `send(queue, message)`, `flag(key, defaultValue)` — same shape, same fix.

## 5. Try it yourself first!

1. **Vague hint:** the payload's required type depends on the event name. That means the name can't be `string` — it has to be one of a fixed set. What structure holds "these names, and for each one, this shape"?
2. **Warmer:** write `interface EventMap` with the three events and their exact payloads. Use literal unions for `currency` and `plan` rather than `string`.
3. **Warmer still:** give `track` a type parameter `K extends keyof EventMap`, take `name: K`, and type the payload `EventMap[K]`. Check that the four original call sites now fail — and read each error, they're unusually clear.
4. **The pipeline:** a middleware receives one event as a value, so you need a type pairing a name with *its* payload. Build it by mapping over the keys and indexing back out with `[EventName]`, then type `Middleware` as `(event: AnalyticsEvent) => AnalyticsEvent`.
5. **Narrowing:** rewrite the two middlewares using `if (event.name === 'purchase')`. Notice what `event.payload` offers inside the branch — and that the missing `return` is now an error.
6. **The awkward bit:** `{ name, payload }` inside `track` won't compile even though it's correct. Understand *why* (section 2.6), then write the one cast and a comment explaining it. Resist the urge to make `track` non-generic to avoid it.

## 6. Understanding the refactored solution

The contract:

```ts
export interface EventMap {
  page_view: { path: string; referrer: string | null };
  purchase: { sku: string; amountCents: number; currency: 'USD' | 'EUR' };
  signup: { plan: 'free' | 'pro'; referredBy?: string };
}
```

This is the spreadsheet, in a file the compiler reads. Adding an event is a two-line change; changing a payload immediately lists every call site that must change with it.

The entry point:

```ts
export function track<K extends EventName>(name: K, payload: EventMap[K]): void {
  let event: AnalyticsEvent = { name, payload } as AnalyticsEvent;
  for (const middleware of middlewares) event = middleware(event);
  sent.push(event);
}
```

Two parameters that used to be independent are now locked together by `K`. The single cast is the file's only unsafety, and it's justified in a comment right above it.

The pipeline:

```ts
export const normalizeCurrency: Middleware = (event) => {
  if (event.name === 'purchase') {
    return { name: 'purchase', payload: { ...event.payload, currency: 'USD' } };
  }
  return event;
};
```

Compare with the original's version of this middleware. Inside the narrowed branch, `event.payload` is *only* the purchase shape — so `price` isn't merely wrong, it isn't spellable. The stale-field bug can't be written. And `return event` on the last line isn't politeness; omitting it is a type error, which is exactly what the original's silent dropper needed.

The type tests are the regression suite for the data team's contract: the missing amount, the typo'd name, the invented plan, the unsupported currency, a missing payload, a mistyped optional, a payload borrowed from another event, a middleware that returns nothing, and a middleware that pairs a name with the wrong payload. Nine lines that fail the build the day someone drifts.

## 7. Words you learned (glossary)

- **Event map** — an interface pairing each event name with its exact payload type.
- **Generic key parameter (`K extends keyof T`)** — inferred from the literal argument, letting a later parameter's type depend on it.
- **Indexed access type (`EventMap[K]`)** — the payload type looked up by key.
- **Mapped type** — `{ [K in Union]: ... }`, an object type built by walking a union (ts#25).
- **Deriving a union by indexing** — `{ ... }[Union]` turns a mapped object type back into a union of its values.
- **Discriminated union** — a union whose members share a literal-typed field that identifies them (ts#10).
- **Discriminant / tag** — that field; here, `name`.
- **Narrowing by discriminant** — checking the tag narrows the whole member, payload included (ts#09).
- **Correlated generics** — two values whose types depend on the same parameter; TypeScript can check them at call sites but not always when *constructing* values.
- **Contained cast** — one `as`, inside one function, with checked signatures around it.
- **Middleware pipeline** — a chain of functions each transforming the value and passing it on.
- **Literal union type** — `'USD' | 'EUR'`; the fix for "any string will do" (ts#06).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. Add `refund: { orderId: string; amountCents: number };` to `EventMap`. **Expected:** ✅ compiles immediately — `track('refund', { orderId: 'a', amountCents: 100 })` works, and `AnalyticsEvent` grew a member on its own. New events cost one line, and the middlewares don't need touching because they narrow on the names they care about.
2. Rename `amountCents` to `amountMinor` in the map. **Expected:** ❌ an error at the real `track('purchase', ...)` call site, naming the property that no longer exists. One edit to the contract, an immediate list of everything that must move with it — and note that `normalizeCurrency` needs no change, because it spreads the payload instead of naming its fields.
3. Delete the `as AnalyticsEvent` cast in `track`. **Expected:** ❌ "Type 'K' is not assignable to type '\"signup\"'". This is section 2.6's limitation, live. Read the error carefully — it's a very common one to hit when writing map-driven APIs.
4. Change `Middleware` to `(event: AnalyticsEvent) => void`. **Expected:** the `dropper` type test reports "Unused '@ts-expect-error'", and `event = middleware(event)` in `track` errors. Returning the event is what makes the pipeline a *transformation*.
5. In `logPageViews`, move `console.log(event.payload.path)` outside the `if`. **Expected:** ❌ "Property 'path' does not exist on type ..." — outside the narrowing, the payload is the union of all three, and only fields common to all of them are readable.
6. Replace `currency: 'USD' | 'EUR'` with `currency: string`. **Expected:** the `'GBP'` type test reports "Unused '@ts-expect-error'". Literal unions are doing real work here, not decoration — and note how *cheap* that work was.
