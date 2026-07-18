// js#40's machine with the types doing real work: states and events
// are unions DERIVED from the table (as const, ts#31), and
// transition() only accepts events the CURRENT state allows —
// per state, at compile time (ts#18's correlation, peak form).

export const TRANSITIONS = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  paid: { ship: 'shipped', cancel: 'cancelled' },
  shipped: { deliver: 'delivered' },
  delivered: {},
  cancelled: {},
} as const;

export type OrderState = keyof typeof TRANSITIONS;
// 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' — derived

// ---- COMPILE-TIME AUDIT of the table itself ----------------------
// (You'd reach for `satisfies Record<string, Record<string, OrderState>>`
// on the table — but OrderState derives FROM the table, so that's a
// circular reference and won't compile. The audit below runs after
// both exist: collect every transition target, assert they're states.)
type TransitionTargets = {
  [S in OrderState]: (typeof TRANSITIONS)[S][keyof (typeof TRANSITIONS)[S]];
}[OrderState];

const tableIsSound: TransitionTargets extends OrderState ? true : false = true;
void tableIsSound; // if any target were a typo, this line wouldn't compile

// "the events state S allows" — a lookup on the table's own type:
export type EventFor<S extends OrderState> = keyof (typeof TRANSITIONS)[S];
// EventFor<'pending'> = 'pay' | 'cancel'; EventFor<'delivered'> = never

// "the state you land in" — indexed twice:
export type NextState<S extends OrderState, E extends EventFor<S>> =
  (typeof TRANSITIONS)[S][E];

export function transition<S extends OrderState, E extends EventFor<S>>(
  state: S,
  event: E,
): NextState<S, E> {
  return TRANSITIONS[state][event];
}

// legal moves flow, with EXACT result types (hover them):
export const a = transition('pending', 'pay');     // 'paid', literally
export const b = transition('paid', 'ship');       // 'shipped'
export const chained = transition(transition('pending', 'pay'), 'cancel');
// chaining works because the RESULT type feeds the next call's S

// ==== type tests: every original silent no-op, now a squiggle =====
// @ts-expect-error — can't ship an unpaid order (js#40's rule, at compile time)
transition('pending', 'ship');

// @ts-expect-error — typo'd states don't exist
transition('pendign', 'pay');

// @ts-expect-error — 'refund' is an event of no state
transition('paid', 'refund');

// @ts-expect-error — THE js#40 bug: cancelling after shipping, uncompilable
transition('shipped', 'cancel');

// @ts-expect-error — terminal states allow nothing (EventFor = never)
transition('delivered', 'deliver');

// and the audit catches corrupt tables:
const BROKEN_TABLE = { pending: { pay: 'payed' } } as const;
type BrokenTargets = (typeof BROKEN_TABLE)['pending']['pay'];
// @ts-expect-error — 'payed' is not a state: a corrupt table fails its audit
const brokenIsSound: BrokenTargets extends OrderState ? true : false = true;
void brokenIsSound;
