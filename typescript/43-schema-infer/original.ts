// A tiny runtime validator (js#31 / ts#23 style): describe the shape
// once as DATA, check incoming JSON against it. The runtime half is
// solid. The TYPE half hands you back a lie.

export type FieldType = 'string' | 'number' | 'boolean';
export type Schema = Record<string, FieldType>;

export const userSchema: Schema = {
  name: 'string',
  age: 'number',
  active: 'boolean',
};

// It genuinely validates. And then returns `any`.
export function validate(schema: Schema, value: unknown): any {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('expected an object');
  }
  const record = value as Record<string, unknown>;
  for (const [field, kind] of Object.entries(schema)) {
    if (typeof record[field] !== kind) {
      throw new TypeError(`${field}: expected ${kind}, got ${typeof record[field]}`);
    }
  }
  return record; // ← ts#01's villain, walking in through the front door
}

const payload: unknown = JSON.parse('{"name":"Ada","age":36,"active":true}');
export const user = validate(userSchema, payload);

// `user` is VALIDATED data the compiler knows nothing about, so the
// checking stops exactly where it should have started:
export const shout = user.nmae.toUpperCase();
// TypeError: Cannot read properties of undefined. The typo the
// validator can't see (it checks the fields it knows, not the ones
// you type) and the compiler won't look for (it's `any`).

export const city = user.address.city; // compiles. `undefined.city`. crashes.

// The team's "fix" for the `any`: hand-write the type as well, and
// assert onto it. Now there are TWO descriptions of one shape.
export interface User {
  name: string;
  age: number;
  active: boolean;
  email: string; // added here last sprint...
}

export const typedUser = validate(userSchema, payload) as User;
export const domain = typedUser.email.split('@')[1];
// ...and never added to `userSchema`. So validate() never checks
// `email`, `as User` swears on its life that it's there, and this
// line throws on a payload that PASSED VALIDATION. The drift runs
// both ways: add a field to the schema instead and the interface
// silently under-describes data you already trust.

// The maddening part: `userSchema` already knows the answer. The
// word `'string'` is sitting right there in the object. But it's
// runtime data, the `: Schema` annotation grinds it down to
// `FieldType` (ts#31), and nothing anywhere maps the WORD 'string'
// to the TYPE string. One shape, described twice, checked once.
