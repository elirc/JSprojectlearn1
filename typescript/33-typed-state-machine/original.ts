// js#40's transition table, ported with stringly types. The table is
// data (good!); the types around it know nothing (bad), so illegal
// transitions are runtime discoveries — js#40 threw at runtime, and
// this port didn't even keep the throw.

export const TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  paid: { ship: 'shipped', cancel: 'cancelled' },
  shipped: { deliver: 'delivered' },
  delivered: {},
  cancelled: {},
};

export function transition(state: string, event: string): string {
  const next = TRANSITIONS[state]?.[event];
  return next ?? state; // unknown anything -> silently stay put
}

// All strings, so ALL of this compiles:
export const a = transition('pending', 'pay');      // 'paid' — correct
export const b = transition('pending', 'ship');     // no-op: can't ship
                                                     // unpaid (correct-ish,
                                                     // but silent)
export const c = transition('pendign', 'pay');      // TYPO'd state:
                                                     // silent no-op forever
export const d = transition('paid', 'refund');      // event that exists
                                                     // NOWHERE: no-op
export const e = transition('shipped', 'cancel');   // js#40's forbidden
                                                     // move: no-op — at
                                                     // least it doesn't
                                                     // transition, but the
                                                     // CALLER can't tell a
                                                     // rejection from a typo

// And the table itself is unchecked: add a transition pointing at a
// state that doesn't exist —
export const BROKEN: Record<string, Record<string, string>> = {
  pending: { pay: 'payed' }, // 'payed' is not a state. Compiles.
};
