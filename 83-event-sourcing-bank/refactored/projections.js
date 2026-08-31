/**
 * PROJECTIONS: different questions, all answered from the same log.
 *
 * A projection is a pure function `events -> an answer`. Because the
 * events are the truth and projections are derived, adding a new
 * report never touches the write side, and no report can drift out of
 * sync with another — they all read the same facts through the same
 * `applyEvent` (project 36's "parse once, then ask many questions",
 * with the log playing the part of the parsed data).
 */
import { applyEvent, deltaOf, emptyState, replay } from './ledger.js';

export function balanceCents(events) {
  return replay(events).balanceCents;
}

/** The day an event belongs to: '2024-03-04T18:00:00Z' -> '2024-03-04'. */
export function dayOf(event) {
  return event.at.slice(0, 10);
}

/**
 * A bank statement: every event with the running balance AFTER it.
 * Reuses applyEvent, so a statement row can never disagree with the
 * balance shown elsewhere.
 */
export function statement(events) {
  let state = emptyState();
  return events.map((event, index) => {
    state = applyEvent(state, event);
    return {
      index,
      at: event.at,
      type: event.type,
      deltaCents: deltaOf(event),
      balanceCents: state.balanceCents,
      note: event.note ?? null,
    };
  });
}

/**
 * TIME TRAVEL. "What was the balance last Tuesday?" is replaying the
 * prefix of the log that existed then — the question the original
 * could not answer at any price.
 */
export function balanceAt(events, isoTime) {
  const cutoff = Date.parse(isoTime);
  if (Number.isNaN(cutoff)) throw new TypeError(`Not a date: ${isoTime}`);
  return balanceCents(events.filter((event) => Date.parse(event.at) <= cutoff));
}

/** Net movement per calendar day, in log order. */
export function dailyNet(events) {
  const byDay = new Map();
  for (const event of events) {
    const day = dayOf(event);
    const entry = byDay.get(day) ?? { day, netCents: 0, eventCount: 0 };
    entry.netCents += deltaOf(event);
    entry.eventCount += 1;
    byDay.set(day, entry);
  }
  return [...byDay.values()];
}

/**
 * The busiest day: the one whose NET movement was largest in either
 * direction. Ties go to the earliest day, so the answer is stable.
 */
export function largestDay(events) {
  let best = null;
  for (const day of dailyNet(events)) {
    if (best === null || Math.abs(day.netCents) > Math.abs(best.netCents)) best = day;
  }
  return best;
}

/**
 * THE BUG HUNT: the first moment the balance fell below a threshold,
 * and the event that did it. One pass over the log, and the support
 * ticket answers itself.
 */
export function firstBalanceBelow(events, thresholdCents) {
  return statement(events).find((row) => row.balanceCents < thresholdCents) ?? null;
}

/**
 * Same type, same amount, same day, more than once — the signature of
 * a retried request that ran twice. Suspicion, not proof: two identical
 * coffees in one day are legal, which is exactly why a human reads this.
 */
export function duplicateSuspects(events) {
  const seen = new Map();
  const suspects = [];
  events.forEach((event, index) => {
    if (deltaOf(event) === 0) return;
    const key = `${dayOf(event)}|${event.type}|${event.amountCents}`;
    const first = seen.get(key);
    if (first === undefined) seen.set(key, index);
    else suspects.push({ key, firstIndex: first, repeatIndex: index, event });
  });
  return suspects;
}
