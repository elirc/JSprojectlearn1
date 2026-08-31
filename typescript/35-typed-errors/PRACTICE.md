# 🏋️ Practice: Typed Errors

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file (e.g. `practice.ts` in this folder, ending with `export {}`) or in a COPY of `refactored/errors.ts`, and run `npm run typecheck` from the `typescript/` folder after each step. The exercises assume `ValidationError` and `parseAge` from the refactored file are in scope.

## Exercises

### ⭐ 1. `errorName` — a sibling for `errorMessage` (warm-up)

Logging often wants the error's *name*, not its message. Write `errorName(err: unknown): string` that returns `err.name` for real `Error`s, the string `'(thrown string)'` when a bare string was thrown, and `'(unknown thrown value)'` for anything else.
Practices: the narrowing ladder over `unknown` — the shape of every safe error helper.
Hint: same ladder as `errorMessage`: `instanceof Error` first, then `typeof err === 'string'`, then the catch-all.
Check: `errorName(new ValidationError('x', 'age'))` and `errorName(42)` must both compile and be typed `string`; writing `err.name` before any narrowing must error with roughly "'err' is of type 'unknown'".

### ⭐⭐ 2. A file-system error taxonomy (core)

Create two new error classes: `NotFoundError` carrying a `public readonly path: string`, and `PermissionError` carrying a `public readonly user: string` (both `extends Error`, both setting `this.name`). Then write `describeFailure(err: unknown): string` that returns a friendly message for each of the two (using their payloads) and *rethrows* anything else.
Practices: constructor property shorthand and the handle-yours/rethrow-the-rest discipline.
Hint: two `instanceof` branches, then `throw err;` — no `default` return.
Check: this must compile; then add a type test: inside a narrowed `instanceof NotFoundError` block, `err.path` compiles but `err.user` must error with roughly "'user' does not exist" — pin that with `@ts-expect-error`.

### ⭐⭐ 3. `tryOr` — one wrapper instead of a hundred try/catches (core)

Write `tryOr<T>(fn: () => T, fallback: (err: unknown) => T): T` that runs `fn` and, if it throws, returns `fallback(err)` instead. The catch variable must be `unknown` and flow into the fallback so the fallback can do its own narrowing.
Practices: generic functions that centralize try/catch; typing a callback's error parameter honestly.
Hint: to make wrong fallbacks fail at the right place, type the fallback's return as `NoInfer<T>` — otherwise TypeScript may infer `T` as a union of both returns.
Check: `tryOr(() => parseAge('nine'), () => -1)` must compile as `number`; `tryOr(() => parseAge('nine'), () => 'n/a')` must error at the fallback argument (add a `@ts-expect-error` test).

### ⭐⭐ 4. A guard that survives `.filter` (core)

You collected an array of thrown things: `const failures: unknown[]`. Write a standalone guard `isValidationError(err: unknown): err is ValidationError` and use it with `failures.filter(...)` so the result is typed `ValidationError[]`, then map it to the offending `field` names.
Practices: type-guard functions as first-class values; `filter`'s guard overload.
Hint: the body is one line — `err instanceof ValidationError` — the signature is the exercise.
Check: `failures.filter(isValidationError).map((e) => e.field)` must compile as `string[]` with no casts; with an inline `(e) => e instanceof ValidationError` arrow instead of the named guard, the `.field` access keeps erroring — see why in the solution.

### ⭐⭐⭐ 5. Exhaustive handling of a known-error union (challenge)

Define `type AppError = ValidationError | NotFoundError | PermissionError` and write `handleKnown(err: AppError): string` that answers each class with a message built from its payload, ending with `return assertNever(err)` (write the `(value: never) => never` helper too). This is exercise 12's exhaustiveness applied to *classes* instead of `kind` strings.
Practices: `instanceof` subtracting members from a union; compiler-maintained to-do lists.
Hint: each `if (err instanceof X) return ...;` removes `X` from `err`'s type; after all three, `err` is `never`.
Check: must compile as written; then add a fourth class to the union and confirm the `assertNever(err)` line errors with roughly "not assignable to parameter of type 'never'" until you handle it.

### ⭐⭐⭐ 6. Cause chains — wrap without losing the original (challenge)

High-level code wants to throw `Error('loading config failed')` while keeping the low-level error as evidence. Write `wrapError(context: string, err: unknown): Error` using the ES2022 `cause` option, and `rootCause(err: unknown): unknown` that walks `.cause` links to the deepest original.
Practices: `new Error(msg, { cause })`, and looping with narrowing over `unknown`.
Hint: in `rootCause`, loop `while (current instanceof Error && current.cause !== undefined)` — the `instanceof` is what lets you read `.cause` at all.
Check: both functions must compile with the catch-side value typed `unknown` and zero casts; `rootCause(wrapError('ctx', new ValidationError('x', 'age')))` must compile (typed `unknown`).

## Solutions

### 1. `errorName`

```ts
function errorName(err: unknown): string {
  if (err instanceof Error) return err.name;
  if (typeof err === 'string') return '(thrown string)';
  return '(unknown thrown value)';
}
```

WHY: the parameter is `unknown` because *anything* can be thrown, so the function must earn each access: `instanceof Error` unlocks `.name`, the `typeof` check handles thrown strings, and the final return handles the rest without touching them. Subclasses like `ValidationError` pass the `instanceof Error` test too, and since they set `this.name`, you get the specific name for free.

### 2. Taxonomy + `describeFailure`

```ts
class NotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`not found: ${path}`);
    this.name = 'NotFoundError';
  }
}
class PermissionError extends Error {
  constructor(public readonly user: string) {
    super(`permission denied for ${user}`);
    this.name = 'PermissionError';
  }
}
function describeFailure(err: unknown): string {
  if (err instanceof NotFoundError) return `missing file: ${err.path}`;
  if (err instanceof PermissionError) return `ask an admin to grant ${err.user} access`;
  throw err; // not ours — rethrow, never relabel
}

declare const thrown: unknown;
if (thrown instanceof NotFoundError) {
  const p: string = thrown.path; // ✅ narrowed
  // @ts-expect-error — user exists only on PermissionError
  thrown.user;
}
```

WHY: each class carries exactly its own evidence (`path` vs `user`), and `instanceof` narrowing means each branch sees only its own payload — the type test proves you can't grab `user` off a `NotFoundError`. The trailing `throw err;` is the discipline the compiler can't force but the `unknown` parameter encourages: everything you didn't explicitly claim gets passed on, still carrying its original stack trace.

### 3. `tryOr`

```ts
function tryOr<T>(fn: () => T, fallback: (err: unknown) => NoInfer<T>): T {
  try {
    return fn();
  } catch (err: unknown) {
    return fallback(err);
  }
}

const age: number = tryOr(() => parseAge('nine'), () => -1); // ✅ number
// @ts-expect-error — fallback must return what fn returns
tryOr(() => parseAge('nine'), () => 'n/a');
```

WHY: without `NoInfer`, TypeScript would collect inference candidates from *both* callbacks and quietly decide `T = number | string`, making the mismatched fallback legal. `NoInfer<T>` says "decide `T` from `fn` alone, then hold the fallback to it," which puts the error on the wrong argument instead of on some distant use. The catch variable stays `unknown` and is handed onward — this wrapper centralizes the try/catch ceremony without weakening any types.

### 4. Guard + filter

```ts
function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError;
}
declare const failures: unknown[];
const fields: string[] = failures.filter(isValidationError).map((e) => e.field); // ✅
```

WHY: `Array.prototype.filter` has a special overload — when the callback is a type guard (`value is S`), the result array is `S[]` instead of the input type. A plain boolean arrow like `(e) => e instanceof ValidationError` returns `boolean`, not a predicate, so `filter` keeps `unknown[]` and the `.field` access stays an error. Naming the guard makes the narrowing knowledge reusable *and* machine-visible.

### 5. Exhaustive `AppError` handling

```ts
type AppError = ValidationError | NotFoundError | PermissionError;

function assertNever(value: never): never {
  throw new Error(`Unhandled error: ${JSON.stringify(value)}`);
}
function handleKnown(err: AppError): string {
  if (err instanceof ValidationError) return `bad field: ${err.field}`;
  if (err instanceof NotFoundError) return `missing: ${err.path}`;
  if (err instanceof PermissionError) return `denied for: ${err.user}`;
  return assertNever(err);
}
```

WHY: `instanceof` doesn't only narrow *into* a branch — it also *subtracts* from the union after a failed check, so by the last line `err` has type `never` and satisfies `assertNever`. Add a `TimeoutError` to the union and that call stops compiling: the compiler hands you the complete list of handlers to update, exactly like a `kind`-switch in exercise 12 but for class hierarchies.

### 6. Cause chains

```ts
function wrapError(context: string, err: unknown): Error {
  return new Error(context, { cause: err });
}
function rootCause(err: unknown): unknown {
  let current: unknown = err;
  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }
  return current;
}
```

WHY: `cause` (ES2022, in this project's `lib`) is the standard way to add context while *keeping* the original error — the alternative, `throw new Error(context + ': ' + errorMessage(err))`, flattens the evidence into a string and loses the stack. `Error.cause` is itself typed `unknown` (anything can be a cause), so the walker's loop condition re-narrows on every step; the honest `unknown` return tells callers the deepest cause might be anything — a string, a number, or an `Error` they should narrow again.
