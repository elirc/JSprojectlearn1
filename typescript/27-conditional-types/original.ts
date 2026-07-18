// A caching layer that wraps API calls. Some endpoints are async,
// some sync — and the types can't express "unwrap Promise if there
// is one", so the author wrote parallel EVERYTHING.

export function getCachedSync<T>(key: string, compute: () => T): T {
  void key;
  return compute();
}

export function getCachedAsync<T>(key: string, compute: () => Promise<T>): Promise<T> {
  void key;
  return compute();
}
// Two functions (js#04 twins). Every call site must know which one
// to use, and picking wrong compiles in one nasty direction:

export const config = getCachedSync('config', () => ({ theme: 'dark' }));

export const user = getCachedSync('user', async () => ({ name: 'Ada' }));
// ^ an ASYNC compute passed to the SYNC getter: T infers as
// Promise<{name}>, so `user` is a Promise... typed as the "cached
// value". user.name is undefined (it's .then and friends in there).
// Compiles perfectly. The types happily cached a promise.

// Same story in their response helper — a hand-maintained TABLE of
// "what does each endpoint resolve to":
interface Endpoints {
  '/config': { theme: string };
  '/user': Promise<{ name: string }>;   // some entries are promises,
  '/stats': { visits: number };          // some aren't — the table mixes
}                                        // wrapped and unwrapped by hand

export function describeEndpoint<K extends keyof Endpoints>(key: K): string {
  return `endpoint ${key}`;
}
// What the team WANTS to write: "the resolved type of endpoint K" —
// unwrap the Promise when there is one, pass through when not.
// Without conditional types, that sentence has no spelling.
