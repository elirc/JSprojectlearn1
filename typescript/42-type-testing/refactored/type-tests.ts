// The capstone: TESTS FOR TYPES. Two tiny utilities make type-level
// assertions that FAIL THE BUILD when a type regresses — js#45 built
// a test framework for values; this is the one for types.

// Equal<A, B>: true only if A and B are EXACTLY the same type.
// (The conditional-in-generic-position trick compares assignability
// in both directions at once — the standard idiom, worth memorizing
// as a unit even before dissecting it.)
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: only accepts `true`. An Equal that comes out false
// won't fit — and the error points at the exact failing assertion.
export type Expect<T extends true> = T;

// ==== the type under test: DeepPartial, FIXED =====================
// (arrays pass through whole — the original's bug)
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

interface Config {
  server: { port: number; host: string };
  tags: string[];
  debug: boolean;
}

// ==== the type tests — this is the payoff =========================
type _DeepPartialCases = [
  // nested objects become partial, recursively:
  Expect<Equal<DeepPartial<Config>['server'], { port?: number; host?: string } | undefined>>,
  // primitives survive (optionally):
  Expect<Equal<DeepPartial<Config>['debug'], boolean | undefined>>,
  // THE REGRESSION TEST for the original's bug: arrays stay arrays —
  Expect<Equal<DeepPartial<Config>['tags'], string[] | undefined>>,
];

// ==== second type under test: IdsOf ================================
export type IdsOf<T> = {
  [K in keyof T]: T[K] extends { id: infer Id } ? Id : never;
}[keyof T];

interface Entities {
  user: { id: number; name: string };
  session: { id: string; token: string };
  health: { status: string };
}

type _IdsOfCases = [
  // the intended union, asserted EXACTLY (no hover, no squint):
  Expect<Equal<IdsOf<Entities>, number | string>>,
  // id-less entries contribute nothing:
  Expect<Equal<IdsOf<{ a: { status: string } }>, never>>,
  // and Equal is strict enough to catch near-misses:
  Expect<Equal<Equal<string | number, string>, false>>,
];

// ==== and @ts-expect-error remains the negative-space tool ========
declare const partial: DeepPartial<Config>;
// @ts-expect-error — tags, when present, is a REAL string[]: the
// original's sparse-array-with-holes bug no longer fits
export const noHoles: DeepPartial<Config> = { tags: ['a', undefined, 'c'] };

export const stillWorks: DeepPartial<Config> = { server: { port: 8080 } };
void partial;
void ((): _DeepPartialCases | _IdsOfCases | null => null);
