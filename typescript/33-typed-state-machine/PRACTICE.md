# 🏋️ Practice: Typed state machine

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a fresh scratch file (e.g. `33-typed-state-machine/practice.ts`, ending with `export {}` so it's a module) or in a COPY of `refactored/machine.ts`. Scratch files can copy in the `TRANSITIONS` table and the derived types — retyping them is good practice. Check with `npm run typecheck` from the `typescript/` folder.

## Exercises

### ⭐ 1. Read the machine off the types (warm-up)

Without calling `transition` at all, pin down what the derived types say: give `EventFor<'paid'>` and `NextState<'pending', 'pay'>` names, then prove their contents with plain variable assignments.

Practices: reading `EventFor` and `NextState` as lookups into the table's type.

Hint: `const e: EventFor<'paid'> = 'ship';` compiles only if `'ship'` really is in that union.

Check: `'ship'` and `'cancel'` must be assignable to `EventFor<'paid'>`; add `@ts-expect-error` tests that catch `'deliver'` there and `'shipped'` as a `NextState<'pending', 'pay'>`.

### ⭐⭐ 2. Guard the edge, prove the interior (core)

Order states arrive from the outside world as raw `string`s (a database column, a URL param). Write the guard `isOrderState(value: string): value is OrderState`, plus a new consumer `describeState(state: OrderState): string` that returns a human label per state via an exhaustive switch (no `default`). Show a raw string being rejected, then accepted after the guard.

Practices: `in`-based type guards over a derived union + exhaustive switches on machine states.

Hint: the table itself can answer membership — `value in TRANSITIONS`.

Check: `describeState(rawString)` must error with roughly "string is not assignable to OrderState"; inside `if (isOrderState(rawString))` the same call must compile. Deleting one switch case must error.

### ⭐⭐ 3. Which states are dead ends? (core)

Derive `TerminalState` — the union of states with no outgoing events — *from the table*, so it updates itself when the machine grows. For the order machine it should be exactly `'delivered' | 'cancelled'`.

Practices: combining a mapped type, a conditional type, and `never`'s vanishing act.

Hint: a state `S` is terminal when `EventFor<S>` is `never`; map every state to either itself or `never`, then index by `[OrderState]` to union the survivors.

Check: `'delivered'` and `'cancelled'` must be assignable to `TerminalState`; add a `@ts-expect-error` test that catches `'pending'`.

### ⭐⭐ 4. A machine of your own (core)

Build a second machine for a document workflow: a `draft` can be `submit`ted into `review`; a `review` can be `approve`d into `published` or `reject`ed back to `draft`; `published` is terminal. Write the `as const` table, derive `DocState` and `DocEventFor<S>`, and write a generic `docTransition` — the full pattern, on a fresh domain.

Practices: reproducing the derive-everything-from-one-table architecture from scratch.

Hint: mirror `machine.ts` shape for shape; the return type is the double index `(typeof DOC_FLOW)[S][E]`.

Check: `docTransition('draft', 'submit')` must compile with result type `'review'`, and chaining `docTransition(docTransition('draft', 'submit'), 'approve')` must give `'published'`. Add `@ts-expect-error` tests that catch `docTransition('published', 'submit')` and `docTransition('draft', 'approve')`.

### ⭐⭐⭐ 5. Reverse lookup: who allows this event? (challenge)

Write `StatesAllowing<E>` — the union of states in which event `E` may fire. `StatesAllowing<'cancel'>` should be exactly `'pending' | 'paid'`. Bonus rigor: constrain `E` so that only events that exist *somewhere* in the machine may be asked about.

Practices: querying the table in the reverse direction with a mapped + conditional type.

Hint: first build `AnyEvent` (the union of every state's events, via a mapped type indexed by `[OrderState]`), then keep each `S` where `E extends EventFor<S>`.

Check: `'pending'` and `'paid'` must be assignable to `StatesAllowing<'cancel'>`; add `@ts-expect-error` tests that catch `'shipped'` there and `StatesAllowing<'refund'>` entirely (constraint violation).

### ⭐⭐⭐ 6. The dynamic edge (challenge)

The literal-typed `transition` can't serve a caller holding a runtime `(state, event)` pair of unknown legality — so build the boundary function: `tryTransition(state: OrderState, event: string): OrderState | null` returns the next state, or `null` for any event the current state doesn't allow. No casts on the data path, and no `@ts-expect-error` needed — the interesting part is typing the row lookup honestly.

Practices: bridging runtime data into a literal-typed core; annotating index access that can miss.

Hint: assign the row to `Record<string, OrderState>` and the lookup result to `OrderState | undefined` — the index could miss even though plain `strict` doesn't say so by itself.

Check: this must compile with no casts; `tryTransition('pending', 'refund')` must compile too (that's the point — illegality is now a runtime `null`, chosen deliberately at the edge).

## Solutions

### 1. Read the machine off the types

```ts
type PaidEvents = EventFor<'paid'>;          // 'ship' | 'cancel'
const pe1: PaidEvents = 'ship';
const pe2: PaidEvents = 'cancel';
// @ts-expect-error — 'deliver' belongs to 'shipped', not 'paid'
const pe3: PaidEvents = 'deliver';

type AfterPay = NextState<'pending', 'pay'>; // 'paid'
const ap: AfterPay = 'paid';
// @ts-expect-error — paying lands exactly on 'paid'
const ap2: AfterPay = 'shipped';
```

WHY: `EventFor<'paid'>` is just `keyof` one row of the table's type, and `NextState` is the same row indexed once more — both are reads, not declarations. The assignments are cheap type tests: a value only assigns if the union really contains it, so this file documents (and enforces) the machine's rules without running anything.

### 2. Guard the edge, prove the interior

```ts
function isOrderState(value: string): value is OrderState {
  return value in TRANSITIONS;
}

function describeState(state: OrderState): string {
  switch (state) {
    case 'pending': return 'awaiting payment';
    case 'paid': return 'awaiting shipment';
    case 'shipped': return 'on its way';
    case 'delivered': return 'delivered — all done';
    case 'cancelled': return 'cancelled';
  }
}

declare const fromDb: string;
// @ts-expect-error — raw strings are not proven states
describeState(fromDb);
if (isOrderState(fromDb)) {
  const label = describeState(fromDb); // ✅ narrowed
}
```

WHY: the table is both the type source *and* the runtime membership test, so the guard can't drift from the union — `value in TRANSITIONS` is true exactly for the five keys `OrderState` derives from. Outside the guard the compiler refuses raw strings; inside, `fromDb` IS an `OrderState`. Edges validate, interiors prove — and the no-`default` switch means a sixth state added to the table breaks `describeState` until labeled.

### 3. Which states are dead ends?

```ts
type TerminalState = {
  [S in OrderState]: EventFor<S> extends never ? S : never;
}[OrderState];
// = 'delivered' | 'cancelled'

const t1: TerminalState = 'delivered';
const t2: TerminalState = 'cancelled';
// @ts-expect-error — pending still has legal moves
const t3: TerminalState = 'pending';
```

WHY: for terminal states the row is `{}`, and `keyof {}` is `never`, so `EventFor<S> extends never` is the precise "no outgoing events" test. The mapped type sends terminal states to themselves and live states to `never`; indexing by `[OrderState]` unions the values, and `never` vanishes from unions, leaving only the dead ends. Add `refunded: {}` to the table and `TerminalState` grows by itself.

### 4. A machine of your own

```ts
const DOC_FLOW = {
  draft: { submit: 'review' },
  review: { approve: 'published', reject: 'draft' },
  published: {},
} as const;

type DocState = keyof typeof DOC_FLOW;
type DocEventFor<S extends DocState> = keyof (typeof DOC_FLOW)[S];

function docTransition<S extends DocState, E extends DocEventFor<S>>(
  state: S,
  event: E,
): (typeof DOC_FLOW)[S][E] {
  return DOC_FLOW[state][event];
}

const published: 'published' = docTransition(docTransition('draft', 'submit'), 'approve');
const backToDraft: 'draft' = docTransition('review', 'reject');
// @ts-expect-error — published is terminal: no events at all
docTransition('published', 'submit');
// @ts-expect-error — a draft can only be submitted
docTransition('draft', 'approve');
```

WHY: nothing here is order-specific — the architecture is table + `keyof` + double index, and it transplants to any domain in a dozen lines. Because return types are exact literals, chained calls walk the machine at compile time, and the reject-back-to-`draft` loop shows tables handle cycles for free. `as const` remains the keystone: remove it and every derivation collapses to `string`.

### 5. Reverse lookup: who allows this event?

```ts
type AnyEvent = { [S in OrderState]: EventFor<S> }[OrderState];
// 'pay' | 'cancel' | 'ship' | 'deliver'

type StatesAllowing<E extends AnyEvent> = {
  [S in OrderState]: E extends EventFor<S> ? S : never;
}[OrderState];

type CancellableFrom = StatesAllowing<'cancel'>; // 'pending' | 'paid'
const cf1: CancellableFrom = 'pending';
const cf2: CancellableFrom = 'paid';
// @ts-expect-error — too late to cancel once shipped
const cf3: CancellableFrom = 'shipped';
// @ts-expect-error — 'refund' is an event of no state
type Impossible = StatesAllowing<'refund'>;
```

WHY: `AnyEvent` reuses exercise 3's map-then-index trick to union every row's keys (terminal rows contribute `never`, which vanishes). `StatesAllowing` then asks, per state, "is `E` one of your events?" keeping `S` on yes and dropping it on no. The `E extends AnyEvent` constraint makes even *asking* about a nonexistent event a compile error — queries are checked against the same single source of truth.

### 6. The dynamic edge

```ts
function tryTransition(state: OrderState, event: string): OrderState | null {
  const row: Record<string, OrderState> = TRANSITIONS[state];
  const next: OrderState | undefined = row[event];
  return next ?? null;
}

const n1 = tryTransition('pending', 'pay');     // 'paid' at runtime
const n2 = tryTransition('shipped', 'refund');  // null — rejected, visibly
```

WHY: widening the row to `Record<string, OrderState>` is safe (every target in the table IS an `OrderState` — the audit proved it) and lets an arbitrary string index in. The explicit `OrderState | undefined` annotation is the honest part: without `noUncheckedIndexedAccess`, plain `strict` would silently type the lookup as `OrderState` even though a bad event misses at runtime. Returning `null` makes illegality a visible value at the boundary — while every caller that *can* use literal states keeps the fully-proven `transition`.
