/**
 * The order lifecycle as an EXPLICIT state machine.
 *
 * One field ("state") instead of four booleans: the order is always
 * in exactly ONE of five real states — the 11 impossible flag combos
 * simply have no representation.
 *
 * The transition TABLE is the entire business rulebook, readable by
 * a product manager: from each state, which events are allowed and
 * where they lead. Changing the rules = editing this table.
 */
export const TRANSITIONS = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  paid: { ship: 'shipped', cancel: 'cancelled' },
  shipped: { deliver: 'delivered' },
  delivered: {}, // terminal
  cancelled: {}, // terminal
};

export const INITIAL_STATE = 'pending';

/**
 * The whole engine. Illegal moves THROW — "ship a cancelled order"
 * is a bug in the caller, and bugs should be loud (project 30).
 */
export function transition(state, event) {
  const next = TRANSITIONS[state]?.[event];
  if (next === undefined) {
    const allowed = Object.keys(TRANSITIONS[state] ?? {});
    throw new Error(
      `Cannot "${event}" an order that is ${state}` +
      (allowed.length ? ` (allowed: ${allowed.join(', ')})` : ' (terminal state)'),
    );
  }
  return next;
}

/** For UIs: which buttons should be enabled right now? */
export function allowedEvents(state) {
  return Object.keys(TRANSITIONS[state] ?? {});
}
