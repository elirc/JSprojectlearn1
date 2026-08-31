// One definition, both worlds: a schema value that VALIDATES at
// runtime and DESCRIBES at compile time. The trick is a type
// parameter that rides along on the schema object — `Validator<T>`
// remembers what it produces — plus `Infer<>` to read it back out.

// ==== the core: a validator remembers its output type =============
export interface Validator<T> {
  readonly kind: string;
  // parse() is the runtime half; the T in the return type is the
  // compile-time half. Same object, two jobs.
  readonly parse: (value: unknown, path: string) => T;
}

// Read the T back off any Validator (ts#27's conditional + infer):
export type Infer<S> = S extends Validator<infer T> ? T : never;

// ==== the builders ================================================
export const s = {
  string(): Validator<string> {
    return {
      kind: 'string',
      parse: (value, path) => {
        if (typeof value !== 'string') throw new TypeError(`${path}: expected string`);
        return value;
      },
    };
  },

  number(): Validator<number> {
    return {
      kind: 'number',
      parse: (value, path) => {
        if (typeof value !== 'number') throw new TypeError(`${path}: expected number`);
        return value;
      },
    };
  },

  boolean(): Validator<boolean> {
    return {
      kind: 'boolean',
      parse: (value, path) => {
        if (typeof value !== 'boolean') throw new TypeError(`${path}: expected boolean`);
        return value;
      },
    };
  },

  // array(): the element validator's T becomes T[] — the type
  // travels with the value, one level up.
  array<T>(item: Validator<T>): Validator<T[]> {
    return {
      kind: 'array',
      parse: (value, path) => {
        if (!Array.isArray(value)) throw new TypeError(`${path}: expected array`);
        return value.map((element, i) => item.parse(element, `${path}[${i}]`));
      },
    };
  },

  // object(): the payoff. Capture the shape EXACTLY with a generic
  // (no `Record<string, Validator<unknown>>` annotation on the
  // argument — that would widen it, ts#31's lesson), then map each
  // field's validator to its inferred type.
  object<S extends Record<string, Validator<unknown>>>(
    shape: S,
  ): Validator<{ [K in keyof S]: Infer<S[K]> }> {
    return {
      kind: 'object',
      parse: (value, path) => {
        if (typeof value !== 'object' || value === null) {
          throw new TypeError(`${path}: expected object`);
        }
        const record = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(shape)) {
          out[key] = shape[key]!.parse(record[key], `${path}.${key}`);
        }
        return out as { [K in keyof S]: Infer<S[K]> };
        // (ts#20's contained unsafety: one cast, inside the library,
        // justified by the loop directly above it. The public
        // signature is exact.)
      },
    };
  },
};

// ==== ONE definition, used twice ==================================
export const userSchema = s.object({
  name: s.string(),
  age: s.number(),
  active: s.boolean(),
  tags: s.array(s.string()),
  profile: s.object({ city: s.string() }),
});

export type User = Infer<typeof userSchema>;
// { name: string; age: number; active: boolean;
//   tags: string[]; profile: { city: string } }   ← derived, not typed

const payload: unknown = JSON.parse(
  '{"name":"Ada","age":36,"active":true,"tags":["math"],"profile":{"city":"London"}}',
);

export const user = userSchema.parse(payload, '$'); // : User — no cast
export const shout = user.name.toUpperCase();
export const first = user.tags[0];
export const city = user.profile.city;

// ==== type tests ==================================================
// (ts#42's two utilities, copied in — each project stands alone.)
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type _InferCases = [
  // the inferred shape, asserted exactly — no hovering:
  Expect<
    Equal<
      User,
      {
        name: string;
        age: number;
        active: boolean;
        tags: string[];
        profile: { city: string };
      }
    >
  >,
  // nested schemas infer nested types:
  Expect<Equal<Infer<typeof userSchema>['profile'], { city: string }>>,
  // array() lifts T to T[], not to (T | undefined)[]:
  Expect<Equal<Infer<Validator<string>[][number]>, string>>,
  // a non-validator has nothing to infer:
  Expect<Equal<Infer<'nope'>, never>>,
];

// @ts-expect-error — the typo, now a squiggle instead of a TypeError
user.nmae;

// @ts-expect-error — `email` was never in the schema, so it isn't in the type
user.email;

// @ts-expect-error — age is a number; the schema said so and the type agrees
user.age.toUpperCase();

// @ts-expect-error — `address` was never validated, so it doesn't exist
user.address.city;

// @ts-expect-error — the schema is the type: you can't add fields by asserting shape
export const wrong: User = { name: 'Ada', age: 36, active: true, tags: [], profile: { city: 'x' }, email: 'a@b.c' };

void ((): _InferCases | null => null);
