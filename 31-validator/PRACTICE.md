# 🏋️ Practice: Input Validator

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The `oneOf` factory (warm-up)

Write a rule factory `oneOf(...allowed)`: the value must be one of the listed options (missing values are someone else's job — let `required()` handle those). Expected: with `{ role: [required(), oneOf('admin', 'editor', 'viewer')] }`, the value `'editor'` validates to `{}` and `'boss'` yields `['must be one of: admin, editor, viewer']`.

**Practices:** rule factories — a closure carrying its configuration (here, a whole list).

**Hint:** rest parameters collect the options: `(...allowed) => (value) => ...`; `allowed.includes(value)` does the check and `allowed.join(', ')` writes the message.

### ⭐⭐ 2. Cross-field rules: `sameAs('password')` (core)

"Confirm password" can't be validated from one value alone. Upgrade the engine one line — call each rule as `rule(data[field], data)` — then write the factory `sameAs(otherField)` using that second argument. Expected: `confirm: 'different'` against `password: 'longenough'` yields `['must match password']`; matching values validate clean. Crucially, verify every OLD test still passes: existing rules simply ignore the extra argument.

**Practices:** evolving a tiny library's interface without breaking its users.

**Hint:** `const sameAs = (other) => (value, data) => value !== data[other] ? \`must match ${other}\` : null;`

### ⭐⭐ 3. Document a hole, then close it: `notBlank()` (core)

First write a test proving the hole: `{ username: '   ' }` (three spaces) passes `required()` — the schema calls it a valid username! Then write `notBlank()`: it rejects strings that are non-empty but whitespace-only, with the message `'cannot be blank'`, while leaving `''` for `required()` to report (no duplicate messages). Expected: `'   '` yields exactly `['cannot be blank']` under `[required(), notBlank(), minLength(3)]`.

**Practices:** writing rules that cooperate — each rule owns one problem.

**Hint:** the condition is `value.trim() === '' && value !== ''`.

### ⭐⭐ 4. `validateOrThrow` — bridge to project 30 (core)

`validate` returns errors; project 30 taught throwing. Connect them: write `SchemaError extends Error` carrying the whole `errors` object, and `validateOrThrow(data, schema)` that returns `data` when valid and throws a `SchemaError` otherwise, with a message naming the failing fields. Expected: valid data comes straight back; invalid data throws an error where `err.errors.username` is `['must be at least 3 characters']`.

**Practices:** converting between the two failure conventions at the right layer.

**Hint:** `Object.keys(errors).length > 0` is the "is it invalid?" check the engine's doc comment promised.

### ⭐⭐⭐ 5. Nested schemas (challenge)

Forms have sections: `{ address: { city: ..., zip: ... } }`. Write `validateNested(data, schema)` where each schema value is either an *array of rules* (validate as before) or a *nested schema object* (recurse into `data[field]`, treating a missing section as `{}` so its required fields all report). Expected: `{ username: 'grace', address: { zip: 'abc' } }` against `{ username: [required()], address: { city: [required()], zip: [required(), matches(/^\d{5}$/, 'be 5 digits')] } }` returns exactly `{ address: { city: ['is required'], zip: ['must be 5 digits'] } }` — and fully valid data returns `{}`.

**Practices:** recursion over data-shaped-like-the-problem — the schema's nesting *is* the call tree.

**Hint:** `Array.isArray(rulesOrSchema)` picks the branch; only attach a nested errors object if it has keys.

## Solutions

### 1. `oneOf`

```js
export const oneOf = (...allowed) => (value) =>
  value !== undefined && value !== null && !allowed.includes(value)
    ? `must be one of: ${allowed.join(', ')}`
    : null;
```

**Why:** the factory closes over `allowed` exactly like `minLength` closes over `n` — configuration lives in the closure, the returned function keeps the universal `value → message | null` shape, so it drops into any schema unregistered.

### 2. `sameAs` + the one-line engine change

```js
// in validate():   rules.map((rule) => rule(data[field], data))
export const sameAs = (otherField) => (value, data) =>
  value !== data[otherField] ? `must match ${otherField}` : null;
```

**Why:** JavaScript functions ignore extra arguments, so widening the rule interface from `(value)` to `(value, data)` is backwards-compatible — every existing rule and test keeps working, verified by running the full suite. That's the calm way to grow a library: add capability at the interface, never edit the existing vocabulary.

### 3. `notBlank`

```js
test('required() lets whitespace through', () => {
  assert.deepEqual(validate({ username: '   ' }, { username: [required()] }), {});
});

export const notBlank = () => (value) =>
  typeof value === 'string' && value.trim() === '' && value !== ''
    ? 'cannot be blank'
    : null;
```

**Why:** documenting the hole first proves you understood the current behavior — `'   ' !== ''`, so `required()` is satisfied. The `value !== ''` clause is rule cooperation: empty string is `required()`'s problem, and without that clause the user would see two messages for one mistake. Verified: `'   '` yields exactly `['cannot be blank']` (note `minLength(3)` also passes it — three spaces are three characters).

### 4. `validateOrThrow`

```js
export class SchemaError extends Error {
  constructor(errors) {
    super(`Validation failed for: ${Object.keys(errors).join(', ')}`);
    this.name = 'SchemaError';
    this.errors = errors;
  }
}

export function validateOrThrow(data, schema) {
  const errors = validate(data, schema);
  if (Object.keys(errors).length > 0) throw new SchemaError(errors);
  return data;
}
```

**Why:** project 30's lesson (throws can't be mistaken for data) meets this project's lesson (collect everything): the throw carries the *complete* errors map as a payload, so a boundary can still highlight every field. Returning `data` on success lets callers write `const clean = validateOrThrow(input, schema);` — the happy path reads like there's no such thing as failure.

### 5. `validateNested`

```js
export function validateNested(data, schema) {
  const errors = {};
  for (const [field, rulesOrSchema] of Object.entries(schema)) {
    if (Array.isArray(rulesOrSchema)) {
      const fieldErrors = rulesOrSchema.map((rule) => rule(data?.[field])).filter(Boolean);
      if (fieldErrors.length > 0) errors[field] = fieldErrors;
    } else {
      const nested = validateNested(data?.[field] ?? {}, rulesOrSchema);
      if (Object.keys(nested).length > 0) errors[field] = nested;
    }
  }
  return errors;
}
```

**Why:** schemas are data, and data can nest — so the engine recurses wherever the schema does, and the errors object mirrors the same shape (a UI can walk it section by section). Treating a missing section as `{}` makes `address.city → ['is required']` fall out for free instead of crashing. Verified with node: mixed valid/invalid nesting, fully valid data, and a wholly missing section all return exactly the expected shapes.
