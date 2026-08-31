// The fix is one idea: STOP AT THE LEAVES. `extends object` asks the
// wrong question, so ask better ones, in order — is this atomic? is
// this array-shaped? otherwise, recurse.

// ==== the leaf list ===============================================
export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

// "any function", written without the `Function` type: `never[]`
// parameters accept any parameter list (contravariance), and
// `unknown` accepts any return.
export type AnyFunction = (...args: never[]) => unknown;

// Everything that must be copied WHOLE rather than recursed into.
// Extend it with the built-ins your codebase actually uses
// (Map, Set, Promise, URL, ...) — that's a one-line change here
// instead of a bug per type.
export type Atomic = Primitive | AnyFunction | Date | RegExp | Error;

// ==== DeepPartial, correctly ======================================
export type DeepPartial<T> = T extends Atomic
  ? T // leaves survive intact: no optional methods, no fake Dates
  : T extends readonly unknown[]
    ? { [K in keyof T]: DeepPartial<T[K]> } // arrays/tuples: map WITHOUT `?`
    : { [K in keyof T]?: DeepPartial<T[K]> }; // plain objects: the real job

// Why the array branch works. A mapped type over an array or tuple
// is HOMOMORPHIC: TypeScript preserves the container, mapping only
// the element type — `string[]` stays an array, `[number, number]`
// stays a 2-tuple. Leaving `?` off is what keeps elements required,
// so the holes are gone; recursing on `T[K]` is what still makes
// `users: User[]` into `{ id?: number }[]`.

// ==== DeepReadonly, same recipe ===================================
// Objects, arrays and tuples all want the same `readonly` modifier,
// and homomorphic mapping turns `string[]` into `readonly string[]`
// and `[number, number]` into `readonly [number, number]` for free —
// so one branch covers both.
export type DeepReadonly<T> = T extends Atomic
  ? T
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };

export interface Config {
  server: { port: number; host: string };
  tags: string[];
  users: { id: number; name: string }[];
  point: [number, number];
  onSave: (event: string) => void;
  createdAt: Date;
  debug: boolean;
}

export function applyPatch(base: Config, patch: DeepPartial<Config>): Config {
  return { ...base, ...(patch as Partial<Config>) };
}

export const patch: DeepPartial<Config> = {
  server: { port: 8080 }, // still the case it was written for
  users: [{ id: 1 }], // and elements are deep-partial too
};

export const frozen: DeepReadonly<Config> = {
  server: { port: 8080, host: 'localhost' },
  tags: ['a'],
  users: [{ id: 1, name: 'Ada' }],
  point: [0, 0],
  onSave: () => {},
  createdAt: new Date(0),
  debug: false,
};

export const stamp = frozen.createdAt.getTime(); // a Date is still a Date

// ==== type tests: one per flaw, plus the cases that must not regress
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type _DeepPartialCases = [
  // the job it was written for still works:
  Expect<Equal<DeepPartial<Config>['server'], { port?: number; host?: string } | undefined>>,
  Expect<Equal<DeepPartial<Config>['debug'], boolean | undefined>>,
  // flaw 1 — arrays stay arrays of REQUIRED elements:
  Expect<Equal<DeepPartial<Config>['tags'], string[] | undefined>>,
  // ...while their elements still recurse:
  Expect<Equal<DeepPartial<Config>['users'], { id?: number; name?: string }[] | undefined>>,
  // flaw 2 — tuples keep their length and their required slots:
  Expect<Equal<DeepPartial<Config>['point'], [number, number] | undefined>>,
  // flaw 3 — functions survive whole, call signature and all:
  Expect<Equal<DeepPartial<Config>['onSave'], ((event: string) => void) | undefined>>,
  // flaw 4 — a Date is a Date, not a bag of optional methods:
  Expect<Equal<DeepPartial<Config>['createdAt'], Date | undefined>>,
];

type _DeepReadonlyCases = [
  Expect<Equal<DeepReadonly<Config>['server'], { readonly port: number; readonly host: string }>>,
  Expect<Equal<DeepReadonly<Config>['tags'], readonly string[]>>,
  Expect<Equal<DeepReadonly<Config>['users'], readonly { readonly id: number; readonly name: string }[]>>,
  Expect<Equal<DeepReadonly<Config>['point'], readonly [number, number]>>,
  Expect<Equal<DeepReadonly<Config>['onSave'], (event: string) => void>>,
  Expect<Equal<DeepReadonly<Config>['createdAt'], Date>>,
];

// @ts-expect-error — flaw 1: no holes in arrays any more
export const sparse: DeepPartial<Config> = { tags: ['a', undefined, 'c'] };

// @ts-expect-error — flaw 2: a pair is still a pair of numbers
export const brokenPoint: DeepPartial<Config> = { point: [1, undefined] };

// @ts-expect-error — flaw 3: 42 is not a callback
export const notAFunction: DeepPartial<Config> = { onSave: 42 };

// @ts-expect-error — flaw 4: {} is not a Date
export const notADate: DeepPartial<Config> = { createdAt: {} };

// @ts-expect-error — DeepReadonly reaches all the way down
frozen.server.port = 9090;

// @ts-expect-error — and readonly arrays have no mutators
frozen.tags.push('b');

void ((): _DeepPartialCases | _DeepReadonlyCases | null => null);
