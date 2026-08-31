# 🏋️ Practice: Custom Errors

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. What does `Number()` really accept? (warm-up)

`parseAge` leans on `Number(input)`. Pin down three behaviors the tests never mention: `parseAge(41)` (a real number, not a string) returns `41`; `parseAge('41.5')` throws the "whole number" error; and `parseAge(' 41 ')` (padded with spaces) returns `41`, because `Number()` trims whitespace. Write one test asserting all three.

**Practices:** knowing exactly what your parsing function tolerates before you trust it.

**Hint:** `assert.throws(() => parseAge('41.5'), /whole number/)` — match the message, not just "it threw".

### ⭐⭐ 2. Find and fix the empty-age bug (core)

Try `parseAge('')`. It throws — but with the message "You must be at least 13", because `Number('')` is `0`! An empty form field gets scolded about age 13. First write a test documenting the wrong behavior, then fix `parseAge` to throw `'Age is required'` (field `'age'`) for `''`, whitespace-only strings, `null`, and `undefined` — and update your test. Expected: `/required/` for those four, everything else unchanged.

**Practices:** the project's own rule — distinct problems deserve distinct messages.

**Hint:** a guard clause at the top: `if (input == null || String(input).trim() === '')`. (`== null` catches both `null` and `undefined` — one of the two good uses of `==`.)

### ⭐⭐ 3. `ConflictError` — a hierarchy of failures (core)

"Username taken" isn't really the user typing something wrong — it's a clash with existing data. Create `ConflictError extends ValidationError` (name `'ConflictError'`), throw it from `register`'s duplicate check, and test the chain: the thrown error is `instanceof ConflictError`, *and* `instanceof ValidationError`, *and* `instanceof Error`. Confirm `cli.js` still prints its friendly message with zero changes.

**Practices:** error subclassing — new precision for new callers, old code keeps working.

**Hint:** the subclass constructor is three lines: `super(message, details)` then set `this.name`.

### ⭐⭐ 4. `validateAll` — report every problem at once (core)

A signup form shouldn't reveal errors one at a time. Write `validateAll(input)` that runs `parseUsername` and `parseAge` each in its own try/catch, collects `{field, message}` for every `ValidationError`, and returns the array (empty when all is well). Crucially: a caught error that is NOT a ValidationError must be rethrown. Expected: `validateAll({username:'x', age:'8'})` returns two entries with fields `['username', 'age']`.

**Practices:** the one legitimate mid-layer catch — aggregation — done without swallowing bugs.

**Hint:** put the two calls in an array of thunks (`[() => parseUsername(...), () => parseAge(...)]`) and loop.

### ⭐⭐⭐ 5. `registerMany` — a batch boundary (challenge)

Write `registerMany(inputs, database)`: try to register each input; collect successes into `registered` and ValidationError failures into `failures` (`{username, message}`); any *other* error must abort the whole batch by propagating. Expected with database `[ada]` and inputs `grace/41`, `x/8`, `ada/30`: one registered, two failures (`/at least 3/`, `/taken/`), database length 2. And `registerMany([...], null)` must throw a `TypeError` — a broken database is our bug, never a "failure" row.

**Practices:** building a second boundary that makes the expected/unexpected split programmatically, not just at the CLI.

**Hint:** it's the `cli.js` catch block, inside a loop: `if (!(err instanceof ValidationError)) throw err;`.

## Solutions

### 1. `Number()` behaviors

```js
test('parseAge and the quirks of Number()', () => {
  assert.equal(parseAge(41), 41);
  assert.throws(() => parseAge('41.5'), /whole number/);
  assert.equal(parseAge(' 41 '), 41); // Number() trims whitespace
});
```

**Why:** the validator's power comes from `Number()` + `Number.isInteger`, so its exact tolerance *is* the contract. Now it's written down: numbers pass through, decimals are rejected with the right message, padding is forgiven.

### 2. Empty-age fix

```js
export function parseAge(input) {
  if (input == null || String(input).trim() === '') {
    throw new ValidationError('Age is required', { field: 'age', value: input });
  }
  const age = Number(input);
  // ... rest unchanged
}
```

Test: `assert.throws(() => parseAge(''), /required/);` plus `'   '` and `undefined`.

**Why:** `Number('')` and `Number(null)` are both `0` — a silent coercion that routed "you typed nothing" into the "under 13" branch. This is the original's sin in miniature: two distinct problems sharing one message. A guard clause restores the one-problem-one-message rule. Verified with node: before the fix `parseAge('')` really does say "at least 13".

### 3. `ConflictError`

```js
export class ConflictError extends ValidationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'ConflictError';
  }
}
// in register():
throw new ConflictError('That username is taken', { field: 'username', value: username });
```

**Why:** `instanceof` walks the whole prototype chain, so a ConflictError still *is* a ValidationError — `cli.js`'s `instanceof ValidationError` branch catches it untouched. Subclassing adds precision for callers who want it (a web server could answer 409 instead of 400) without breaking callers who don't. Verified: all three `instanceof` checks pass.

### 4. `validateAll`

```js
export function validateAll(input) {
  const problems = [];
  const checks = [() => parseUsername(input.username), () => parseAge(input.age)];
  for (const check of checks) {
    try {
      check();
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err; // bugs still crash
      problems.push({ field: err.field, message: err.message });
    }
  }
  return problems;
}
```

**Why:** this catch is legitimate because the function can genuinely *act* on a ValidationError — its whole job is collecting them. The rethrow line is the non-negotiable part: without it, a typo inside a parser would quietly become a "validation problem" (LEARN experiment 4's nightmare, automated).

### 5. `registerMany`

```js
export function registerMany(inputs, database) {
  const registered = [];
  const failures = [];
  for (const input of inputs) {
    try {
      registered.push(register(input, database));
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err; // our bug: abort loudly
      failures.push({ username: input.username, message: err.message });
    }
  }
  return { registered, failures };
}
```

**Why:** a batch importer is a real boundary — it's the one place that can act on "this row failed" (skip it, report it, keep going). The `instanceof` split scales straight from the CLI to here: user-data problems become report rows, while `registerMany([...], null)` throws `TypeError` out of the batch because a broken database is a bug no report row should disguise. Verified with node: 1 registered, 2 failures with the right messages, and the TypeError propagates.
