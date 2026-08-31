// ts#42 caught one bug in this type. Here is the rest of the family.
// A hand-written DeepPartial, used everywhere for config patches:

export type DeepPartialBad<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartialBad<T[K]> : T[K];
};

export interface Config {
  server: { port: number; host: string };
  tags: string[];
  point: [number, number];
  onSave: (event: string) => void;
  createdAt: Date;
  debug: boolean;
}

export function applyPatch(base: Config, patch: DeepPartialBad<Config>): Config {
  return { ...base, ...(patch as Partial<Config>) };
}

// The case it was written for, and the only one anybody tested:
export const looksRight: DeepPartialBad<Config> = { server: { port: 8080 } };

// ---- flaw 1: arrays ----------------------------------------------
// `T[K] extends object` is TRUE for arrays, so `tags` is mapped too —
// and mapping `?` over an array makes its ELEMENTS optional:
//   DeepPartialBad<string[]>  =  (string | undefined)[]
export const sparse: DeepPartialBad<Config> = { tags: ['a', undefined, 'c'] };
// An array with a hole in it, accepted by a type whose whole promise
// is "fields may be missing". A consumer doing
// tags.map((t) => t.toUpperCase()) crashes on element 1.

// ---- flaw 2: tuples ----------------------------------------------
// Same mechanism, worse result: a fixed-length pair becomes a pair of
// maybes, so the coordinate that must exist... doesn't have to.
export const brokenPoint: DeepPartialBad<Config> = { point: [1, undefined] };
// point[1].toFixed(2) — TypeError, from a "valid" patch.

// ---- flaw 3: functions -------------------------------------------
// Functions are objects too. `keyof ((event: string) => void)` is
// `never`, so mapping over it produces `{}` — the CALL SIGNATURE is
// thrown away. And `{}` accepts anything non-nullish:
export const notAFunction: DeepPartialBad<Config> = { onSave: 42 };
// A number, in a callback slot, with the compiler's blessing.
// applyPatch() then hands the app a config whose onSave() is 42, and
// the crash lands in whatever code calls it.

// ---- flaw 4: Date (and Map, Set, RegExp, Error, ...) --------------
// Mapping over Date visits its METHODS and makes every one optional:
//   DeepPartialBad<Date> = { getTime?: () => number; toISOString?: ... }
// Every property optional means the empty object satisfies it:
export const notADate: DeepPartialBad<Config> = { createdAt: {} };
// `{}` is now a valid Date. createdAt.getTime() throws:
// createdAt.getTime is not a function.

// The pattern behind all four: `extends object` is the wrong
// question. It's true for arrays, tuples, functions, class
// instances, Maps, Sets, RegExps, Errors — everything that isn't a
// primitive. Only ONE of those categories, the plain data object, is
// the one this type meant to recurse into. And the same trap is
// waiting in the DeepReadonly the team is about to write next.
