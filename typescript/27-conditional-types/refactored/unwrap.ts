// Conditional types: `T extends U ? X : Y` — an if/else that runs on
// types. With `infer` (introduced here, starred in project 28) they
// can take types APART.

// The sentence that had no spelling, spelled:
//   "if T is a Promise of something, that something; else T itself"
export type Unwrap<T> = T extends Promise<infer Inner> ? Inner : T;

export type A = Unwrap<Promise<string>>; // string
export type B = Unwrap<number>;          // number (passed through)
export type C = Unwrap<Promise<Promise<boolean>>>; // Promise<boolean> (one layer)

// Recursive version — keep unwrapping while it's a promise (this is
// how the stdlib's Awaited<T> works in spirit):
export type DeepUnwrap<T> = T extends Promise<infer Inner> ? DeepUnwrap<Inner> : T;
export type D = DeepUnwrap<Promise<Promise<boolean>>>; // boolean

// ==== ONE cache function, sync or async ==========================
export function getCached<T>(key: string, compute: () => T): T {
  void key;
  return compute();
}
// One function replaces the sync/async twins: T is whatever compute
// returns — a value, or a promise TYPED AS a promise. The original's
// trap ("cached" a promise typed as a value) can't be expressed.

export const config = getCached('config', () => ({ theme: 'dark' }));
// config: { theme: string }

export const userPromise = getCached('user', async () => ({ name: 'Ada' }));
// userPromise: Promise<{ name: string }> — TYPED as a promise now,
// so using it like a value is a compile error (see type tests), and
// the correct usage is obvious:
export const userLater = userPromise.then((u) => u.name);

// ==== the endpoint table, normalized by a mapped+conditional combo =
interface Endpoints {
  '/config': { theme: string };
  '/user': Promise<{ name: string }>;
  '/stats': { visits: number };
}

// "the RESOLVED type of each endpoint" — unwrap where needed:
export type Resolved = { [K in keyof Endpoints]: Unwrap<Endpoints[K]> };
// { '/config': {theme}, '/user': {name}, '/stats': {visits} } — uniform.

declare function fetchResolved<K extends keyof Endpoints>(key: K): Promise<Resolved[K]>;

export async function showUser(): Promise<string> {
  const user = await fetchResolved('/user'); // { name: string } — unwrapped
  return user.name;
}

// ==== type tests ==================================================
declare const check1: Unwrap<Promise<number>>;
// @ts-expect-error — Unwrap really unwraps: it's a number, not a promise
check1.then(() => {});

// @ts-expect-error — the original's bug, now visible: promises aren't values
export const oops: string = userPromise.name;
