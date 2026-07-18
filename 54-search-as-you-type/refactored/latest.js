/**
 * makeLatestOnly(fn) — wrap an async function so that only the most
 * recent call's result is ever delivered. Older calls resolve to a
 * sentinel (STALE) instead of their (now irrelevant) data.
 *
 * THE race fix for search-as-you-type: debounce (project 28) reduces
 * how often you call; this guarantees that whatever DOES come back
 * out of order can't paint the screen. You want both — they solve
 * different halves of the problem.
 *
 * How: a closure counter stamps each call with a ticket number
 * (project 27's closure-as-private-state move). When the underlying
 * promise settles, the result is delivered only if the ticket is
 * still the newest one issued.
 */
export const STALE = Symbol('stale');

export function makeLatestOnly(fn) {
  let newestTicket = 0;
  return async (...args) => {
    const ticket = ++newestTicket;
    try {
      const result = await fn(...args);
      return ticket === newestTicket ? result : STALE;
    } catch (err) {
      if (ticket === newestTicket) throw err;
      return STALE; // even an ERROR from an abandoned query is noise
    }
  };
}
