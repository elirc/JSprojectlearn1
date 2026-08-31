/**
 * EVENT SOURCING: the account is not a balance. The account is the
 * list of things that happened to it, and the balance is something we
 * COMPUTE from that list, on demand.
 *
 *   events (facts, append-only)  ->  replay()  ->  state (derived)
 *
 * An event is plain, past-tense, immutable data:
 *
 *   { type: 'deposited', amountCents: 50000, at: '2024-03-01T09:00:00Z' }
 *
 * Nothing here ever overwrites anything, so no evidence is ever
 * destroyed: "what was the balance last Tuesday?" is replaying a
 * prefix of the list. This is project 39's undo idea taken to its
 * conclusion, and project 59's "every change is an action you can log"
 * with the log promoted to the source of truth.
 *
 * COMMANDS ("please deposit £5") are requests and can be rejected.
 * EVENTS ("deposited") are facts and can never be rejected, because
 * they already happened. Validation lives on the border between them.
 */

/** A state is a fold of the event list; here is its starting value. */
export function emptyState() {
  return {
    open: false,
    owner: null,
    balanceCents: 0,
    eventCount: 0,
    openedAt: null,
    lastEventAt: null,
  };
}

/**
 * ONE place where an event changes state — used by replay AND by every
 * projection, so no two readers of the log can ever disagree about
 * what an event means. Returns a NEW state; never mutates.
 */
export function applyEvent(state, event) {
  const base = { ...state, eventCount: state.eventCount + 1, lastEventAt: event.at };
  switch (event.type) {
    case 'opened':
      return { ...base, open: true, owner: event.owner, openedAt: event.at };
    case 'deposited':
      return { ...base, balanceCents: state.balanceCents + event.amountCents };
    case 'withdrew':
    case 'fee-charged':
      return { ...base, balanceCents: state.balanceCents - event.amountCents };
    default:
      // The log is the truth, so junk in the log is a crash, not a shrug.
      throw new TypeError(`Unknown event type: ${JSON.stringify(event.type)}`);
  }
}

/** The whole read model in one line: fold the facts into a state. */
export function replay(events) {
  return events.reduce(applyEvent, emptyState());
}

/** How much this event moved the balance (+ in, - out, 0 for opened). */
export function deltaOf(event) {
  if (event.type === 'deposited') return event.amountCents;
  if (event.type === 'withdrew' || event.type === 'fee-charged') return -event.amountCents;
  return 0;
}

const COMMAND_TO_EVENT = {
  open: 'opened',
  deposit: 'deposited',
  withdraw: 'withdrew',
  'charge-fee': 'fee-charged',
};

const MONEY_OUT = new Set(['withdraw', 'charge-fee']);

const ok = () => ({ ok: true });
const fail = (code, message) => ({ ok: false, error: { code, message } });

/**
 * The rulebook — Result-style (project 30): a rejection is a returned
 * value, not a thrown exception, because "you can't afford that" is an
 * expected outcome, not a programming mistake.
 *
 * Note that the overdraft rule is written ONCE and therefore applies to
 * fees as well as withdrawals. In the original, `chargeFee` and
 * `payBill` each forgot to copy it.
 */
export function validate(state, command) {
  if (!COMMAND_TO_EVENT[command?.type]) {
    return fail('UNKNOWN_COMMAND', `No such command: ${JSON.stringify(command?.type)}`);
  }
  if (typeof command.at !== 'string' || Number.isNaN(Date.parse(command.at))) {
    return fail('INVALID_TIMESTAMP', `at must be an ISO date string, got ${command.at}`);
  }
  if (state.lastEventAt !== null && Date.parse(command.at) < Date.parse(state.lastEventAt)) {
    return fail(
      'OUT_OF_ORDER',
      `${command.at} is before the last event at ${state.lastEventAt}`,
    );
  }

  if (command.type === 'open') {
    if (state.open) return fail('ALREADY_OPEN', `Account is already open for ${state.owner}`);
    if (typeof command.owner !== 'string' || command.owner.trim() === '') {
      return fail('INVALID_OWNER', 'owner must be a non-empty string');
    }
    return ok();
  }

  if (!state.open) return fail('NOT_OPEN', 'The account has not been opened yet');
  if (!Number.isInteger(command.amountCents) || command.amountCents <= 0) {
    return fail(
      'INVALID_AMOUNT',
      `amountCents must be a positive whole number of cents, got ${command.amountCents}`,
    );
  }
  if (MONEY_OUT.has(command.type) && command.amountCents > state.balanceCents) {
    return fail(
      'INSUFFICIENT_FUNDS',
      `Cannot take ${command.amountCents} from a balance of ${state.balanceCents}`,
    );
  }
  return ok();
}

/**
 * The only way to grow the log. Returns either a NEW array with one
 * more event, or an error — and on rejection the log is untouched,
 * which is why "how did we get into this state?" always has an answer.
 */
export function append(events, command) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');

  const check = validate(replay(events), command);
  if (!check.ok) return check;

  const event = { type: COMMAND_TO_EVENT[command.type], at: command.at };
  if (command.type === 'open') event.owner = command.owner;
  else event.amountCents = command.amountCents;
  if (command.note !== undefined) event.note = command.note;

  return { ok: true, events: [...events, event] }; // append-only, never in place
}

/** Run a batch, keeping both the surviving log and what got refused. */
export function appendAll(events, commands) {
  let current = events;
  const rejected = [];
  for (const command of commands) {
    const result = append(current, command);
    if (result.ok) current = result.events;
    else rejected.push({ command, error: result.error });
  }
  return { events: current, rejected };
}
