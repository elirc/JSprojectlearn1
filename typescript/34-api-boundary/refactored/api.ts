// A tiny schema layer: each schema VALIDATES at runtime and CARRIES
// its type, so the interface and the check can't drift — one
// definition produces both. (This is the architecture of zod/valibot,
// small enough to own; ts#13's boundary, industrialized a step.)

// A schema is a guard (ts#11) bundled with a name for errors:
export interface Schema<T> {
  name: string;
  check: (value: unknown) => value is T;
}

// combinators build big schemas from small ones (js#31's shape):
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number';

export function objectSchema<T>(
  name: string,
  fields: { [K in keyof T]: (value: unknown) => value is T[K] },
): Schema<T> {
  return {
    name,
    check: (value): value is T => {
      if (typeof value !== 'object' || value === null) return false;
      const record = value as Record<string, unknown>;
      return (Object.keys(fields) as (keyof T)[]).every((key) =>
        fields[key](record[key as string]),
      );
    },
  };
}

export function arraySchema<T>(item: Schema<T>): Schema<T[]> {
  return {
    name: `${item.name}[]`,
    check: (value): value is T[] =>
      Array.isArray(value) && value.every((element) => item.check(element)),
  };
}

// ==== the schemas — interface AND validator, one definition ========
export interface User {
  id: number;
  name: string;
  email: string;
}

export const UserSchema = objectSchema<User>('User', {
  id: isNumber,
  name: isString,
  email: isString,
});

// ==== the boundary =================================================
function fakeNetwork(path: string): unknown {
  if (path === '/user/7') {
    return { id: 7, name: 'Ada', mail: 'ada@engine.dev' }; // v2 drift, same as original
  }
  return null;
}

export class ApiDriftError extends Error {
  constructor(schemaName: string, public readonly received: unknown) {
    super(`API response is not a valid ${schemaName} — the API and the client have drifted`);
    this.name = 'ApiDriftError';
  }
}

export function fetchChecked<T>(path: string, schema: Schema<T>): T {
  const data = fakeNetwork(path);
  if (!schema.check(data)) {
    throw new ApiDriftError(schema.name, data); // loud, AT the boundary,
  }                                             // naming the real culprit
  return data; // narrowed by the guard — no cast anywhere
}

// Downstream code is unchanged from the original — but now the v2
// drift surfaces as ApiDriftError AT FETCH TIME, not as
// ".toLowerCase of undefined" four layers later:
export function userSummary(): string {
  const user = fetchChecked('/user/7', UserSchema);
  return `${user.name} <${user.email.toLowerCase()}>`;
}

// ==== type tests ==================================================
// @ts-expect-error — the schema's field-checkers must match the interface
export const drifted = objectSchema<User>('User', { id: isNumber, name: isString, email: isNumber });

// @ts-expect-error — fetchChecked returns T, not any: typos downstream are caught
export const typo = fetchChecked('/user/7', UserSchema).emial;
