# 🏋️ Practice: Typed Validator

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file (e.g. `typescript/23-typed-validator/practice.ts`, ending with `export {}`) that copies over `Rule`, `Schema`, `Errors`, the rule factories, and `validate` from `refactored/validator.ts` — or work directly in a COPY of that file. Check with `npm run typecheck` from the `typescript/` folder.

## Exercises

### ⭐ 1. Two mirror-image rules: `maxLength` and `max` (warm-up)

The refactor ships `minLength` (strings) and `min` (numbers). Write their mirrors: `maxLength(n): Rule<string>` and `max(limit): Rule<number>`, then use both in a `Schema<Signup>` (cap `username` at 20 characters, `age` at 120).

Practices: writing rule factories with honest `Rule<T>` types.

Hint: copy `minLength`'s shape and flip the comparison; no `typeof` probing needed — the type system delivers the right value type.

Check: your schema must compile; add a `@ts-expect-error` type test showing `{ username: [max(10)] }` fails with roughly "Rule\<number\> is not assignable" — the correlation catching a number rule on a string field.

### ⭐⭐ 2. A schema for a brand-new shape (core)

Define `interface Product { sku: string; price: number; stock: number }` and write `productSchema: Schema<Product>`: sku must be `required()` and `matches(/^[A-Z]{3}-\d{4}$/, 'look like ABC-1234')`, price and stock must each be `min(0)`. Then call `validate` on a sample product and read one field's errors.

Practices: reusing the generic machinery on a second domain — the whole point of `Schema<T>` being generic.

Hint: `validate(candidate, productSchema)` returns `Errors<Product>`; reading `.price` off it gives `string[] | undefined`.

Check: this must all compile, and `errors.price` must type as `string[] | undefined`. Add a `@ts-expect-error` test that `{ price: [minLength(3)] }` is rejected (string rule, number field).

### ⭐⭐ 3. A generic rule factory: `oneOf` (core)

All shipped factories produce `Rule<string>` or `Rule<number>`. Write one that adapts: `oneOf(...allowed)` returns a `Rule<T>` accepting only listed values (message: `` `must be one of: ${allowed.join(', ')}` ``). Use it on `interface Order { size: 'S' | 'M' | 'L'; qty: number }` as `size: [oneOf('S', 'M', 'L')]`.

Practices: a generic factory whose `T` is inferred from the schema field it sits in (contextual typing).

Hint: `const oneOf = <T>(...allowed: T[]): Rule<T> => (value) => allowed.includes(value) ? null : ...`.

Check: `orderSchema` must compile — TypeScript infers `T` as `'S' | 'M' | 'L'` from the field. Add a `@ts-expect-error` test showing `size: [oneOf('S', 'XXL')]` fails: `'XXL'` isn't a valid size.

### ⭐⭐ 4. `orEmpty` — rules for optional fields (core)

Give a shape an optional field: `interface Profile { username: string; bio?: string }`. Now `Schema<Profile>` wants `Rule<string | undefined>[]` for `bio`, so plain `minLength(10)` won't fit. Write the combinator `orEmpty(rule: Rule<string>): Rule<string | undefined>` that passes when the value is `undefined` and otherwise delegates.

Practices: function-type assignability (parameter contravariance) and adapting rules with a combinator instead of weakening types.

Hint: `(value) => value === undefined ? null : rule(value)`.

Check: `bio: [orEmpty(minLength(10))]` must compile. Add a `@ts-expect-error` test that bare `bio: [minLength(10)]` fails with roughly "undefined is not assignable to string" — the compiler protecting the rule from a value it can't handle.

### ⭐⭐⭐ 5. `firstError` — consume the error bag generically (challenge)

Write `firstError<T extends object>(errors: Errors<T>): string | null` returning the first message found (or `null`). It must work for `Errors<Signup>`, `Errors<Product>`, anything. You'll meet the same `Object.keys` friction the engine met — solve it the same contained way.

Practices: iterating a mapped type generically; the contained `as (keyof T)[]` cast.

Hint: `errors[key]` types as `string[] | undefined`, so guard with `if (messages && messages.length > 0)`.

Check: must compile; `firstError(validate(candidate, productSchema))` must type as `string | null` with no casts at the call site.

### ⭐⭐⭐ 6. `check` — a discriminated verdict (challenge)

`validate` returns an error bag even on success. Write `check<T extends object>(data: T, schema: Schema<T>)` returning `{ valid: true; data: T } | { valid: false; errors: Errors<T> }` (branch on `Object.keys(...).length`). Callers must narrow on `.valid` before touching either payload — exercise 10's discriminated unions guarding this exercise's output.

Practices: wrapping a loose API in a discriminated union so misuse won't compile.

Hint: return `{ valid: true, data }` or `{ valid: false, errors }` — the literal `true`/`false` is the discriminant.

Check: add a `@ts-expect-error` test that `result.errors` fails before narrowing; `result.valid ? result.data.sku : firstError(result.errors)` must compile.

## Solutions

### 1. `maxLength` and `max`

```ts
const maxLength = (n: number): Rule<string> => (value) =>
  value.length > n ? `must be at most ${n} characters` : null;
const max = (limit: number): Rule<number> => (value) =>
  value > limit ? `must be at most ${limit}` : null;

const boundedSchema: Schema<Signup> = {
  username: [maxLength(20)],
  age: [max(120)],
};
// @ts-expect-error — max() builds a Rule<number>: it can't guard username
const misplaced: Schema<Signup> = { username: [max(10)] };
```

WHY: because `Rule<T>` carries the value type, the factory bodies need zero runtime type-sniffing — `value.length` just works in `maxLength` because `value` is provably a string. And the moment a `Rule<number>` lands on the string field `username`, the mapped type `Schema<Signup>` rejects it: the key↔rule↔value correlation is doing the auditing, not code review.

### 2. `productSchema`

```ts
interface Product { sku: string; price: number; stock: number }
const productSchema: Schema<Product> = {
  sku: [required(), matches(/^[A-Z]{3}-\d{4}$/, 'look like ABC-1234')],
  price: [min(0)],
  stock: [min(0)],
};
const candidate: Product = { sku: 'abc', price: -1, stock: 0 };
const productErrors = validate(candidate, productSchema);
const priceErrors: string[] | undefined = productErrors.price;
// @ts-expect-error — minLength guards strings; price is a number
const drifted: Schema<Product> = { price: [minLength(3)] };
```

WHY: nothing in the validator mentions `Signup` — `Schema<T>` and `validate<T>` are generic, so a second domain costs only its interface and its rules. All three of the original's drift bugs are still impossible here: typo'd keys, ghost fields, and mismatched rules all fail against `Schema<Product>` exactly as they did against `Schema<Signup>`.

### 3. `oneOf`

```ts
const oneOf = <T>(...allowed: T[]): Rule<T> => (value) =>
  allowed.includes(value) ? null : `must be one of: ${allowed.join(', ')}`;

interface Order { size: 'S' | 'M' | 'L'; qty: number }
const orderSchema: Schema<Order> = {
  size: [oneOf('S', 'M', 'L')],
  qty: [min(1)],
};
// @ts-expect-error — 'XXL' is not a valid size for this field
const badSizes: Schema<Order> = { size: [oneOf('S', 'XXL')] };
```

WHY: the schema field demands `Rule<'S' | 'M' | 'L'>[]`, and that expectation flows *backwards* into the call — contextual typing fixes `T` to the union, so each argument is checked against it and `'XXL'` fails right where it's written. One generic factory serves every literal-union field in the codebase, staying exactly as strict as each field it guards.

### 4. `orEmpty`

```ts
interface Profile { username: string; bio?: string }
const orEmpty = (rule: Rule<string>): Rule<string | undefined> => (value) =>
  value === undefined ? null : rule(value);

const profileSchema: Schema<Profile> = {
  username: [required()],
  bio: [orEmpty(minLength(10))],
};
// @ts-expect-error — a Rule<string> would receive undefined on an optional field
const unsafe: Schema<Profile> = { bio: [minLength(10)] };
```

WHY: `Profile['bio']` is `string | undefined`, so the schema wants rules that *accept* `undefined` — and a `Rule<string>` doesn't, which is precisely why the bare `minLength(10)` is rejected (a function taking `string` can't stand in where one taking `string | undefined` is required: parameter contravariance). The combinator adapts the rule by handling the `undefined` case itself, then delegating with `value` already narrowed to `string`.

### 5. `firstError`

```ts
function firstError<T extends object>(errors: Errors<T>): string | null {
  for (const key of Object.keys(errors) as (keyof T)[]) {
    const messages = errors[key];
    if (messages && messages.length > 0) return messages[0];
  }
  return null;
}
const worst: string | null = firstError(productErrors);
```

WHY: `errors[key]` with `key: keyof T` types as `string[] | undefined`, so the guard is compiler-mandated, not defensive superstition. The `as (keyof T)[]` cast is the same contained compromise the engine makes — `Object.keys` returns `string[]` by design, the loop is sealed, and the public signature stays fully checked for every caller.

### 6. `check`

```ts
type Checked<T> = { valid: true; data: T } | { valid: false; errors: Errors<T> };
function check<T extends object>(data: T, schema: Schema<T>): Checked<T> {
  const errs = validate(data, schema);
  return Object.keys(errs).length === 0
    ? { valid: true, data }
    : { valid: false, errors: errs };
}
const outcome = check(candidate, productSchema);
// @ts-expect-error — must narrow on .valid before touching .errors
outcome.errors;
const summary = outcome.valid ? outcome.data.sku : firstError(outcome.errors);
```

WHY: the literal-typed `valid` field is a discriminant, so the compiler only grants access to `data` after seeing `valid` is `true` — and only to `errors` on the other arm. This turns "did you remember to check?" from a code-review question into a compile error, and it composes with exercise 5: the failure arm hands its `Errors<T>` straight to `firstError`.
