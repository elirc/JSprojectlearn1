// Generics: the function takes a TYPE PARAMETER the same way it
// takes value parameters. One implementation, checked for every
// caller — js#04's "promote the difference to a parameter", where
// the difference was a type.

/**
 * <T> declares the parameter; items: readonly T[] uses it; T | null
 * returns it. Callers never write <T> — it's INFERRED from the
 * argument, like js#26's keyOf functions inferred their shapes.
 */
export function first<T>(items: readonly T[]): T | null {
  return items.length > 0 ? items[0]! : null;
}

export function pair<T>(a: T, b: T): [T, T] {
  return [a, b];
}

/** T flows THROUGH functions too — map's output type comes from fn: */
export function firstMapped<T, R>(items: readonly T[], fn: (item: T) => R): R | null {
  return items.length > 0 ? fn(items[0]!) : null;
}

interface User { name: string }

const names = ['ada', 'grace'];
const scores = [97, 94];
const users: User[] = [{ name: 'ada' }];

// hover these: T was inferred as string / number / User —
// and the RESULTS are typed accordingly:
export const firstName = first(names);   // string | null
export const topScore = first(scores);   // number | null
export const firstUser = first(users);   // User | null

// The null-check is still demanded (ts#05) — generics preserved the
// honesty, not just the convenience:
export const upper = firstName === null ? '' : firstName.toUpperCase();

export const both = pair('a', 'b');           // [string, string]
export const nameLength = firstMapped(names, (n) => n.length); // number | null

// ==== type tests ==================================================
// @ts-expect-error — the original's crash: number's first is NOT a string
export const crash: string = first(scores);

// @ts-expect-error — pair demands BOTH args share one T
pair('a', 1);

// @ts-expect-error — null must be handled before string methods (unlike firstAny)
export const careless = first(names).toUpperCase();
