// js#31's validator with its types connected: schemas are typed BY
// THE SHAPE THEY VALIDATE, so schema/type drift is a compile error,
// and each rule receives its field's actual type.

// A rule for a value of type T (js#31's value -> message | null):
export type Rule<T> = (value: T) => string | null;

// A schema for shape T: for each key of T, rules typed for THAT
// key's value type (ts#18's mapped correlation, in one line):
export type Schema<T> = {
  [K in keyof T]?: Rule<T[K]>[];
};

// Errors mirror the shape too — only real fields can carry errors:
export type Errors<T> = {
  [K in keyof T]?: string[];
};

// ---- rule factories (bodies from js#31, types added) -------------
export const required = (): Rule<string> => (value) =>
  value === '' ? 'is required' : null;

export const minLength = (n: number): Rule<string> => (value) =>
  value.length < n ? `must be at least ${n} characters` : null;

export const matches = (pattern: RegExp, description: string): Rule<string> => (value) =>
  pattern.test(value) ? null : `must ${description}`;

export const min = (limit: number): Rule<number> => (value) =>
  value < limit ? `must be at least ${limit}` : null;

// ---- the engine, generic over the shape --------------------------
export function validate<T extends object>(data: T, schema: Schema<T>): Errors<T> {
  const errors: Errors<T> = {};
  for (const key of Object.keys(schema) as (keyof T)[]) {
    const rules = schema[key];
    if (!rules) continue;
    const fieldErrors = rules
      .map((rule) => rule(data[key]))
      .filter((message): message is string => message !== null);
    if (fieldErrors.length > 0) errors[key] = fieldErrors;
  }
  return errors;
}

// ---- usage --------------------------------------------------------
interface Signup {
  username: string;
  email: string;
  password: string;
  age: number;
}

export const signupSchema: Schema<Signup> = {
  username: [required(), minLength(3)],
  email: [required(), matches(/^\S+@\S+\.\S+$/, 'be a valid email')],
  password: [required(), minLength(8)],
  age: [min(13)], // a Rule<number> — on a number field. correlated.
};

const form: Signup = { username: 'ada', email: 'not-an-email', password: 'pw', age: 30 };
export const errors = validate(form, signupSchema);
export const emailErrors = errors.email; // string[] | undefined — real field, typed

// ==== type tests: the original's drift, now impossible ============
// @ts-expect-error — 'emial' is not a key of Signup (the typo'd schema entry)
export const typoSchema: Schema<Signup> = { emial: [required()] };

// @ts-expect-error — schemas can't validate fields the shape doesn't have
export const ghostSchema: Schema<Signup> = { favoriteColor: [required()] };

// @ts-expect-error — a string rule can't guard a number field (correlation)
export const wrongRule: Schema<Signup> = { age: [minLength(3)] };

// @ts-expect-error — error reads are checked too: 'usrename' isn't a field
export const typoRead = errors.usrename;
