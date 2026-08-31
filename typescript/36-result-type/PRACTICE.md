# 🏋️ Practice: The Result Type

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file (e.g. `practice.ts` in this folder, ending with `export {}`) or in a COPY of `refactored/result.ts`, and run `npm run typecheck` from the `typescript/` folder after each step. The exercises assume `Result<T, E>`, `ok`, and `err` from the refactored file are in scope.

## Exercises

### ⭐ 1. `unwrapOr` (warm-up)

Sometimes a caller genuinely has a sensible default. Write `unwrapOr<T, E>(result: Result<T, E>, fallback: T): T` — the value on success, the fallback on failure, never a crash.
Practices: narrowing a `Result` inside a generic function.
Hint: one ternary on `result.ok`.
Check: `unwrapOr(someResult, 0)` on a `Result<number, string>` must compile as `number`; passing a `string` fallback for a number Result must error with roughly "'string' is not assignable to 'number'".

### ⭐⭐ 2. `map` — transform success, pass failure through (core)

Write `map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>` that applies `fn` only on the success arm and returns the failure arm untouched. This lets pipelines transform values without unwrapping and rewrapping at every step.
Practices: three type parameters and returning a discriminated union from both branches.
Hint: on the failure branch, return `result` itself — after the `ok` check it is already `{ ok: false; error: E }`, which is a valid `Result<U, E>` for ANY `U`.
Check: mapping a `Result<number, string>` with `(v) => `#${v}`` must be assignable to `Result<string, string>`; add a `@ts-expect-error` test that the mapped result still refuses `.value` without an `.ok` check.

### ⭐⭐ 3. `parsePort` — a new domain, its own error vocabulary (core)

Write `parsePort(input: string): Result<number, PortError>` where `PortError` is a two-variant union you design: `{ kind: 'not-a-number'; raw: string }` and `{ kind: 'out-of-range'; value: number }` (valid ports are integers 1-65535). Then write `describePortError(e: PortError): string` with an exhaustive `switch` and no `default`.
Practices: designing an error union with per-cause evidence; exhaustive switches.
Hint: `Number(input)`, then `Number.isNaN` for the first failure, then the range check for the second.
Check: `describePortError` must compile with only the two cases (every path returns); using `e.raw` inside the `'out-of-range'` case must error with roughly "'raw' does not exist".

### ⭐⭐ 4. `andThen` — chaining steps that can each fail (core)

Write `andThen<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F>` — if step one failed, keep its error; otherwise run step two, which may fail with a *different* error type. Note the return's error side: the union of both vocabularies.
Practices: error-type accumulation across a pipeline — the typed version of "anything along the way can fail."
Hint: structurally identical to `map`, but `fn` already returns a `Result`, so don't wrap it in `ok(...)`.
Check: given `readSetting(name): Result<string, SettingError>`, the chain `andThen(readSetting('port'), parsePort)` must be assignable to `Result<number, SettingError | PortError>`.

### ⭐⭐⭐ 5. `all` — collect many Results into one (challenge)

Write `all<T, E>(results: Result<T, E>[]): Result<T[], E>` — success with every value (in order) if all succeeded, otherwise the FIRST failure. This is the Result cousin of `Promise.all`.
Practices: accumulating `T[]` while early-returning the failure arm.
Hint: loop; `if (!r.ok) return r;` — the failure arm is already a valid `Result<T[], E>`.
Check: `all([parsePort('80'), parsePort('8080')])` must be assignable to `Result<number[], PortError>`; add a `@ts-expect-error` test that `.value` without a check still refuses to compile.

### ⭐⭐⭐ 6. `fromThrowing` — the bridge from throw-world (challenge)

Old code throws; new code wants Results. Write `fromThrowing<T>(fn: () => T): Result<T, Error>` that runs `fn`, catches anything (typed `unknown`, exercise 35!), normalizes non-`Error` thrown values with `new Error(String(thrown))`, and returns a Result.
Practices: combining `catch (e: unknown)` narrowing with Result construction — two error disciplines shaking hands.
Hint: `thrown instanceof Error ? thrown : new Error(String(thrown))`.
Check: wrapping a `() => number` that may throw must compile as `Result<number, Error>`; inside the catch, using `thrown.message` without narrowing must error with roughly "'thrown' is of type 'unknown'".

## Solutions

### 1. `unwrapOr`

```ts
function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
```

WHY: the discriminant check `result.ok` narrows each ternary arm — `.value` exists only after the check, so this helper is safe by construction. Both the value and the fallback are the same `T`, which is what makes the wrong-typed fallback fail at the call site: the compiler unifies them and reports the mismatch exactly where the bad default was written.

### 2. `map`

```ts
function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

declare const someResult: Result<number, string>;
const asText: Result<string, string> = map(someResult, (v) => `#${v}`); // ✅
// @ts-expect-error — still a Result: no .value without checking .ok
const grabbed = asText.value;
```

WHY: the interesting move is the else branch: after `result.ok` is false, `result` is `{ ok: false; error: E }` — a type that mentions no `T` at all, so it is assignable to `Result<U, E>` for *any* `U`. That's why failure passes through untouched while success is transformed. `map` never unwraps: the result stays a Result, so the "face both arms" guarantee survives the pipeline.

### 3. `parsePort` and its vocabulary

```ts
type PortError =
  | { kind: 'not-a-number'; raw: string }
  | { kind: 'out-of-range'; value: number };

function parsePort(input: string): Result<number, PortError> {
  const n = Number(input);
  if (Number.isNaN(n)) return err({ kind: 'not-a-number', raw: input });
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    return err({ kind: 'out-of-range', value: n });
  }
  return ok(n);
}

function describePortError(e: PortError): string {
  switch (e.kind) {
    case 'not-a-number': return `"${e.raw}" is not a number`;
    case 'out-of-range': return `${e.value} is outside 1-65535`;
  }
}
```

WHY: each failure carries the evidence relevant to *its* cause — the raw string for the unparseable case, the offending number for the range case — so narrowing by `kind` gives handlers exactly the right payload and nothing else. With both cases covered, every path through the switch returns, so no `default` is needed; add a third variant later and the function stops compiling, handing you the update list.

### 4. `andThen`

```ts
function andThen<T, U, E, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

type SettingError = { kind: 'missing-setting'; name: string };
declare function readSetting(name: string): Result<string, SettingError>;
const port: Result<number, SettingError | PortError> =
  andThen(readSetting('port'), parsePort); // ✅
```

WHY: four type parameters let the two steps keep *separate* error vocabularies, and the return type unions them: the chain's signature literally lists everything that can go wrong across both steps. Compare with exceptions, where nothing in any signature warned you — here `E | F` is the machine-checked changelog of failure modes, and it grows automatically as you chain more `andThen` calls.

### 5. `all`

```ts
function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const r of results) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return ok(values);
}

const combined: Result<number[], PortError> =
  all([parsePort('80'), parsePort('8080')]); // ✅
// @ts-expect-error — check .ok before .value
const vals = combined.value;
```

WHY: the early `return r` works for the same reason as `map`'s pass-through — a failure arm mentions only `E`, so it satisfies `Result<T[], E>` even though we never built an array. After the `!r.ok` guard, `r.value` is safe inside the loop. The aggregate is itself a Result, so a batch of validations collapses to one honest value that callers must still check exactly once.

### 6. `fromThrowing`

```ts
function fromThrowing<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (thrown: unknown) {
    return err(thrown instanceof Error ? thrown : new Error(String(thrown)));
  }
}

const safeAge: Result<number, Error> = fromThrowing(() => parseAge('nine')); // ✅
```

WHY: this is the adapter between the two error worlds: inside, exercise 35's discipline (catch as `unknown`, narrow with `instanceof`); outside, this exercise's discipline (failure as a value in the signature). Normalizing odd thrown things (strings, numbers) into a real `Error` means the error side is a single honest type instead of `unknown`. Wrap any legacy throwing API once, and every caller downstream gets the can't-forget-the-failure guarantee for free.
