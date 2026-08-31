// The data team's spreadsheet, moved into the type system. One
// interface names every event and the exact payload it carries; every
// call site and every middleware is checked against it.

export interface EventMap {
  page_view: { path: string; referrer: string | null };
  purchase: { sku: string; amountCents: number; currency: 'USD' | 'EUR' };
  signup: { plan: 'free' | 'pro'; referredBy?: string };
}

export type EventName = keyof EventMap;

// The pipeline needs to pass events around as VALUES, so the name and
// its payload must travel together — correlated, not merely adjacent.
// Mapping over the keys and indexing back out produces a discriminated
// union (ts#10, ts#32): one member per event, each pairing a literal
// name with exactly its payload.
export type AnalyticsEvent = {
  [K in EventName]: { readonly name: K; readonly payload: EventMap[K] };
}[EventName];

// Because AnalyticsEvent is a discriminated union, `event.name` NARROWS
// `event.payload` inside a middleware — the thing `(string, any)` could
// never do.
export type Middleware = (event: AnalyticsEvent) => AnalyticsEvent;

const middlewares: Middleware[] = [];
const sent: AnalyticsEvent[] = [];

export function use(middleware: Middleware): void {
  middlewares.push(middleware);
}

export function track<K extends EventName>(name: K, payload: EventMap[K]): void {
  // The one honest cast: `name` and `payload` really are correlated —
  // that is what `K` means — but TypeScript can't verify a construction
  // through a generic key. Sealed inside this function; every PUBLIC
  // signature above and below is fully checked (ts#20's same trade).
  let event: AnalyticsEvent = { name, payload } as AnalyticsEvent;
  for (const middleware of middlewares) {
    event = middleware(event); // payload types preserved end to end
  }
  sent.push(event);
}

// ---- the middleware pipeline, typed -------------------------------
export const logPageViews: Middleware = (event) => {
  if (event.name === 'page_view') {
    console.log('[analytics]', event.payload.path); // .path exists HERE only
  }
  return event; // returning is mandatory: the type says so
};

export const normalizeCurrency: Middleware = (event) => {
  if (event.name === 'purchase') {
    // Narrowed to the purchase member: `amountCents` and `currency`
    // are the only fields in scope, so the stale `price` field the
    // original reached for isn't even spellable.
    return { name: 'purchase', payload: { ...event.payload, currency: 'USD' } };
  }
  return event;
};

use(logPageViews);
use(normalizeCurrency);

// ---- call sites ---------------------------------------------------
track('page_view', { path: '/pricing', referrer: null });
track('purchase', { sku: 'ts-101', amountCents: 4900, currency: 'EUR' });
track('signup', { plan: 'pro' });

export const events = sent;

// ==== type tests: all four original violations, now impossible =====
// @ts-expect-error — the revenue event without its amount (the $0 quarter)
track('purchase', { sku: 'ts-101', currency: 'USD' });

// @ts-expect-error — 'purcahse' is not an event (the well-formed message
// that landed in a bucket nothing queries)
track('purcahse', { sku: 'ts-101', amountCents: 4900, currency: 'USD' });

// @ts-expect-error — 'enterprise' is not a plan the product sells
track('signup', { plan: 'enterprise' });

// @ts-expect-error — 'GBP' is not a supported currency
track('purchase', { sku: 'ts-101', amountCents: 4900, currency: 'GBP' });

// @ts-expect-error — every event carries a payload; none may be omitted
track('page_view');

// @ts-expect-error — referredBy is optional, not untyped
track('signup', { plan: 'free', referredBy: 42 });

// @ts-expect-error — a payload from the wrong event is still the wrong shape
track('signup', { path: '/x', referrer: null });

// @ts-expect-error — a middleware that returns nothing (the silent dropper)
export const dropper: Middleware = (event) => {
  void event;
};

// @ts-expect-error — nor may a middleware pair a name with someone else's payload
export const swapper: Middleware = () => ({
  name: 'signup',
  payload: { path: '/x', referrer: null },
});
