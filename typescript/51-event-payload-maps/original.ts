// The analytics facade: one function, every event in the product.
// `track(event: string, payload: any)` — the two loosest types in
// TypeScript, at the point where the business measures itself.

type Middleware = (event: string, payload: any) => any;

const middlewares: Middleware[] = [];
const sent: { event: string; payload: any }[] = [];

export function use(middleware: Middleware): void {
  middlewares.push(middleware);
}

export function track(event: string, payload: any): void {
  let current: any = payload;
  for (const middleware of middlewares) {
    current = middleware(event, current);
  }
  sent.push({ event, payload: current });
}

// ---- the middleware pipeline --------------------------------------
use((_event, payload) => ({ ...payload, at: '2026-02-01T09:00:00Z' }));

use((event, payload) => {
  if (event === 'purchase') {
    // "round the amount" — written when purchase payloads carried a
    // `price` field. They carry `amountCents` now. `payload.price` is
    // `undefined`, `Math.round(undefined)` is `NaN`, and the event
    // ships with `price: NaN` alongside an untouched `amountCents`.
    return { ...payload, price: Math.round(payload.price) };
  }
  return payload;
});

use((event, payload) => {
  if (event === 'page_view') console.log('[analytics]', event, payload.path);
  // No `return`. This middleware maps EVERY payload to `undefined` —
  // the pipeline keeps going, the event still "sends", and it carries
  // nothing at all. A middleware type of `=> any` had no opinion.
});

// ---- call sites ---------------------------------------------------
track('page_view', { path: '/pricing', referrer: null });

track('purchase', { sku: 'ts-101' });
// The revenue event, with no amount. `any` accepted it, the pipeline
// forwarded it, the warehouse stored it. Q3 revenue reads $0 for
// every purchase made through this call site — no error, no alert,
// just a number the finance team will eventually ask about.

track('purcahse', { sku: 'ts-101', amountCents: 4900, currency: 'USD' });
// A typo'd event name. This one is PERFECTLY formed and lands in a
// bucket nothing queries. It will never be noticed by anything except
// a dashboard that's mysteriously low.

track('signup', { plan: 'enterprise' });
// 'enterprise' isn't a plan the product sells — 'free' and 'pro' are.
// `any` has no opinion about string values either.

export const events = sent;

// Every one of these is a CONTRACT violation, and the contract is
// real: it lives in a spreadsheet the data team maintains. Move it
// into the type system and all four become compile errors.
