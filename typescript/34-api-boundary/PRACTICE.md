# 🏋️ Practice: The API Boundary

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file (e.g. `practice.ts` in this folder, ending with `export {}`) or in a COPY of `refactored/api.ts`, and run `npm run typecheck` from the `typescript/` folder after each step. The exercises below assume the refactored file's `Schema<T>`, `isString`, `isNumber`, `objectSchema`, `arraySchema`, and `fetchChecked` are in scope (copy them into your scratch file, or work in the copy).

## Exercises

### ⭐ 1. Promote the bare guards to full schemas (warm-up)

`isString` and `isNumber` are guards, not schemas — you can't hand them to `arraySchema` or `fetchChecked` directly. Wrap them into two constants, `StringSchema: Schema<string>` and `NumberSchema: Schema<number>`, then compose `MatrixSchema` for a `number[][]` (an array of arrays of numbers) using only `arraySchema`.
Practices: reading the `Schema<T>` interface and composing combinators.
Hint: a schema is just an object literal with a `name` and a `check` — the guard you already have IS the check.
Check: `fetchChecked('/matrix', MatrixSchema)` must have type `number[][]` (assigning it to a `number[][]`-typed const compiles); add a `@ts-expect-error` type test showing it is NOT assignable to `string[][]`.

### ⭐⭐ 2. A `nullableSchema` combinator (core)

Real APIs return `null` for "no such thing." Write `nullableSchema<T>(inner: Schema<T>): Schema<T | null>` that accepts either `null` or whatever the inner schema accepts, and names itself something like `"User|null"`.
Practices: writing a generic combinator whose guard narrows to a union.
Hint: the check is one line: `value === null || inner.check(value)` — but the predicate must say `value is T | null`.
Check: `fetchChecked('/user/7', nullableSchema(UserSchema))` types as `User | null`, so `.name` straight off the result must error with roughly "possibly 'null'" — keep that line under a `@ts-expect-error`, then show the narrowed version compiles.

### ⭐⭐ 3. A `literalSchema` for exact values (core)

Some endpoints return a fixed sentinel, like the string `'active'` from a health check. Write `literalSchema<L extends string | number>(value: L): Schema<L>` whose check accepts only that exact value.
Practices: generics that capture literal types (the same trick as `makeElement` in exercise 22).
Hint: constrain `L` to `string | number` and compare with `===`; the returned schema's type parameter is `L` itself, not `string`.
Check: `const s = fetchChecked('/health', literalSchema('active'))` must be assignable to a `const x: 'active'`, and a `@ts-expect-error` test must catch assigning it to `'inactive'`.

### ⭐⭐ 4. A `unionSchema` combinator (core)

Write `unionSchema<A, B>(a: Schema<A>, b: Schema<B>): Schema<A | B>` — the data is valid if either side accepts it. Use it to build a schema for an ID that may be a `string` or a `number`.
Practices: two type parameters, guards combined with `||`, honest union results.
Hint: `a.check(value) || b.check(value)`, with the predicate `value is A | B`.
Check: the fetched value must be `string | number`: calling `.toFixed(2)` on it without narrowing must error (put it under `@ts-expect-error`), while `typeof id === 'number' ? id.toFixed(2) : id` compiles.

### ⭐⭐⭐ 5. `Infer<S>` — the type FROM the schema (challenge)

Real libraries flip the dependency: you write only the schema, and the interface is *derived*. Write `type Infer<S> = ...` that extracts `T` from any `Schema<T>`. Then build `ApiErrorSchema = objectSchema('ApiError', { code: isNumber, message: isString })` — with NO explicit type argument and no `interface ApiError` — and recover the type via `type ApiError = Infer<typeof ApiErrorSchema>`.
Practices: conditional types with `infer`, plus reverse inference through a mapped type.
Hint: `S extends Schema<infer T> ? T : never`. For the schema itself, let TypeScript infer `T` backwards from the field checkers you pass.
Check: `const e: ApiError = { code: 404, message: 'not found' }` must compile, and a `@ts-expect-error` test must catch `{ code: '404', message: 'x' }` (code must be a number).

### ⭐⭐⭐ 6. An `enumSchema` with rest parameters (challenge)

Write `enumSchema<T extends readonly string[]>(name: string, ...values: T): Schema<T[number]>` so `enumSchema('Role', 'admin', 'editor', 'viewer')` produces a `Schema<'admin' | 'editor' | 'viewer'>` — the literal union computed from the arguments.
Practices: variadic generics, tuple inference, and indexed access (`T[number]`).
Hint: constraining `T` to `readonly string[]` makes TypeScript keep the arguments as a tuple of literals; at runtime, `values.includes(...)` after a `typeof value === 'string'` check is enough.
Check: the fetched role must be assignable to `'admin' | 'editor' | 'viewer'`; add a `@ts-expect-error` test that catches assigning it to `'owner'`.

## Solutions

### 1. Full schemas from bare guards

```ts
const StringSchema: Schema<string> = { name: 'string', check: isString };
const NumberSchema: Schema<number> = { name: 'number', check: isNumber };
const MatrixSchema = arraySchema(arraySchema(NumberSchema));

const matrix = fetchChecked('/matrix', MatrixSchema);
const row: number[] = matrix[0];        // ✅ number[][]
// @ts-expect-error — number[][] is not string[][]
const wrong: string[][] = matrix;
```

WHY: `Schema<T>` is just data — a name plus a guard — so wrapping an existing guard costs one object literal. Once the primitive is a schema, the combinators stack: `arraySchema(arraySchema(NumberSchema))` is `Schema<number[][]>` with zero new validation code. This is the whole point of combinator design: you only ever write the primitive checks once.

### 2. `nullableSchema`

```ts
function nullableSchema<T>(inner: Schema<T>): Schema<T | null> {
  return {
    name: `${inner.name}|null`,
    check: (value): value is T | null => value === null || inner.check(value),
  };
}

const maybeUser = fetchChecked('/user/7', nullableSchema(UserSchema));
// @ts-expect-error — could be null: must narrow before .name
const careless = maybeUser.name;
const name = maybeUser === null ? '(none)' : maybeUser.name; // ✅
```

WHY: the guard's return annotation `value is T | null` is what widens the schema's carried type — the runtime check and the compile-time claim change together, in one place. Callers are then *forced* to handle the null case, which is exactly the honesty the boundary is for: the API's "sometimes null" is now in the signature instead of in a 3am crash.

### 3. `literalSchema`

```ts
function literalSchema<L extends string | number>(value: L): Schema<L> {
  return {
    name: JSON.stringify(value),
    check: (v): v is L => v === value,
  };
}

const status = fetchChecked('/health', literalSchema('active'));
const exact: 'active' = status;      // ✅
// @ts-expect-error — 'active' is not 'inactive'
const wrong: 'inactive' = status;
```

WHY: because `L` is constrained to `string | number`, passing `'active'` makes TypeScript keep the *literal* type `'active'` instead of widening to `string` — so the schema carries `Schema<'active'>`. The runtime `===` and the type-level literal describe the same single value; drift between them is impossible because both come from the one `value` parameter.

### 4. `unionSchema`

```ts
function unionSchema<A, B>(a: Schema<A>, b: Schema<B>): Schema<A | B> {
  return {
    name: `${a.name}|${b.name}`,
    check: (value): value is A | B => a.check(value) || b.check(value),
  };
}

const id = fetchChecked('/id', unionSchema(StringSchema, NumberSchema));
// @ts-expect-error — must narrow string | number before .toFixed
const bad = id.toFixed(2);
const rendered = typeof id === 'number' ? id.toFixed(2) : id; // ✅
```

WHY: two guards OR-ed together validate the union, and the predicate `value is A | B` carries it into the type system. Unlike exercise 22's union-return trap, a union is *correct* here — the API genuinely may send either shape, so every caller genuinely must narrow. The type is as wide as the truth, no wider.

### 5. `Infer<S>`

```ts
type Infer<S> = S extends Schema<infer T> ? T : never;

const ApiErrorSchema = objectSchema('ApiError', { code: isNumber, message: isString });
type ApiError = Infer<typeof ApiErrorSchema>; // { code: number; message: string }

const e: ApiError = { code: 404, message: 'not found' }; // ✅
// @ts-expect-error — code must be a number
const bad: ApiError = { code: '404', message: 'x' };
```

WHY: two inferences chain here. First, calling `objectSchema` with `{ code: isNumber, message: isString }` and no type argument makes TypeScript run the mapped type `{ [K in keyof T]: (value: unknown) => value is T[K] }` *backwards* to deduce `T = { code: number; message: string }`. Second, `Infer` uses `infer T` to read that `T` back out of the schema's type. This is exactly how zod's `z.infer` works — the schema becomes the single source of truth and the interface is derived, eliminating even the duplication the refactored file still has.

### 6. `enumSchema`

```ts
function enumSchema<T extends readonly string[]>(name: string, ...values: T): Schema<T[number]> {
  return {
    name,
    check: (value): value is T[number] =>
      typeof value === 'string' && (values as readonly string[]).includes(value),
  };
}

const RoleSchema = enumSchema('Role', 'admin', 'editor', 'viewer');
const role = fetchChecked('/role', RoleSchema);
const ok: 'admin' | 'editor' | 'viewer' = role; // ✅
// @ts-expect-error — the enum has no 'owner'
const bad: 'owner' = role;
```

WHY: with `T extends readonly string[]`, the rest arguments infer as the literal tuple `['admin', 'editor', 'viewer']`, and the indexed access `T[number]` ("the type of any element") collapses it to the union `'admin' | 'editor' | 'viewer'`. The small `as readonly string[]` cast inside is the same *internal plumbing* kind the refactored `objectSchema` uses — `includes` on a literal-tuple type won't accept an arbitrary string argument, so we loosen `values`, never the incoming data. The type-level enum and the runtime list come from the same `values`, so they cannot drift.
