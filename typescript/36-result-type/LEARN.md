# 📘 Learning Guide: The Result Type

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A function that loads a config file can fail three different ways: the file is missing, the file isn't valid JSON, or the JSON has the wrong shape. The original code hides all three — one convention returns `null` (meaning... something?), one throws (with no warning in its signature), and one `catch` maps *every* failure to silent defaults. Net result: ops sets port 8080, the file is broken, the app quietly runs on port 3000, and nobody knows why.

The refactor introduces a `Result<T, E>` type: instead of throwing or returning `null`, the function **returns failure as a value** — either `{ ok: true, value }` or `{ ok: false, error }`. Because the failure is in the return *type*, the compiler forces every caller to face it. And because the error is a *union of named causes*, each failure keeps its "why."

## 2. Concepts you need first

### The three classic failure conventions (and their holes)
1. **Return `null`** — says *that* it failed, never *why*. And callers can forget the check.
2. **Throw** — TypeScript signatures have no `throws` clause. `function parse(s: string): AppConfig` looks identical whether it's safe or a grenade. Callers can't see the danger.
3. **Catch-and-default** — `try { ... } catch { return DEFAULTS; }` converts every failure, including genuine bugs, into a silent wrong answer.

### Discriminated unions (the machinery under Result)
A **discriminated union** is a union of object shapes that share one literal-typed field (the **discriminant**) telling them apart. Checking that field narrows to one shape:

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };

function area(s: Shape) {
  if (s.kind === 'circle') return 3.14 * s.radius ** 2; // ✅ radius exists here
  return s.side ** 2;                                    // ✅ square here
}
```

(Exercise 10's folder is the deep dive; this is all you need for now.)

### `Result<T, E>` itself
Just a two-variant discriminated union, discriminated on the boolean `ok`:

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

declare const r: Result<number, string>;
r.value;               // ❌ Error: 'value' doesn't exist on the error arm
if (r.ok) r.value;     // ✅ OK — narrowed to the success arm
```

`T` is the success payload's type, `E` the failure's. Both are **generics** — placeholders filled in per use (introduced in exercise 16's folder).

### `never` in the constructors
The helpers are typed like this:

```ts
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

`never` is the type with *no possible values*. `Result<T, never>` reads as "success with T, and the error arm can never occur." Because `never` fits into any type, an `ok(...)` slots cleanly into any `Result<T, WhateverError>` a function promises. It's a small trick that makes the helpers universally usable.

### Error unions: naming each failure
Instead of `string`, the error type is a discriminated union of causes, each carrying evidence:

```ts
type ConfigError =
  | { kind: 'file-missing'; path: string }
  | { kind: 'malformed-json'; path: string; detail: string }
  | { kind: 'invalid-shape'; path: string };
```

Now "why did it fail?" is a typed question with typed answers.

### Exhaustive switch
A `switch` over a discriminant where every case returns. If the union later gains a member, the switch stops covering all paths and the compiler complains — a free to-do list. (Exercise 12's folder covers the `never`-based enforcement trick.)

### Type guards, briefly
`function isAppConfig(value: unknown): value is AppConfig` — a function whose true-return teaches the compiler the value's type. Used here to validate the parsed JSON's shape. (Exercise 11's folder covers guards; 34's LEARN.md shows them scaled into schemas.)

### Guard clauses / early return
A pipeline where each step checks one thing and returns early on failure, so the happy path reads straight down. `getConfig` is shaped exactly like this.

### The `!` non-null assertion (the original's lie)
`raw!` means "trust me, raw is not null" — no runtime check, just silencing the compiler. If you're wrong, the crash comes later, somewhere else.

## 3. Walking through the original code

Convention 1 — mystery null:

```ts
export function loadConfigFile(path: string): string | null {
  if (path === '/etc/app.json') return '{"port": 8080, "host": "0.0.0.0"}';
  if (path === '/etc/broken.json') return '{"port": }';
  return null;
}
```

`null` here means "no file" — but nothing says so. (Note the second path returns *malformed* JSON — a time bomb for later.)

Convention 2 — the invisible grenade:

```ts
export function parseConfig(json: string): AppConfig {
  return JSON.parse(json) as AppConfig;
}
```

Two sins in one line. `JSON.parse` **throws** on malformed input, and the signature can't warn anyone (TypeScript has no `throws` clause). And `as AppConfig` launders whatever shape came back into a confident type without checking (the cast problem from exercise 34).

Convention 3 — the eater of whys:

```ts
export function getConfig(path: string): AppConfig {
  try {
    const raw = loadConfigFile(path);
    return parseConfig(raw!); // ! on a null
  } catch {
    return { port: 3000, host: 'localhost' }; // any failure -> defaults
  }
}
```

`raw!` silences the "could be null" warning. The `catch` has no parameter at all — it doesn't even look at what went wrong. Missing file, broken JSON, wrong shape: all become default settings, silently.

The punchline: `getConfig('/etc/broken.json')` compiles, runs, and returns `{ port: 3000, host: 'localhost' }`. Nothing anywhere warned that failure was possible.

## 4. What's wrong with it (in beginner terms)

**The runtime story the compiler failed to catch:** The ops team writes a config with port 8080. Someone fat-fingers a comma and the JSON becomes invalid. The app boots... on port 3000, localhost. The load balancer can't reach it. On-call spends an hour discovering the app is *healthy, just on the wrong port* — then another hour discovering *why*: a catch block, three functions deep, that turned "your config file is broken at character 9" into "let's use defaults." The information existed at the failure point and was thrown away.

**Why each convention contributed:**
- `string | null` forced the caller to guess what null means — so the caller used `!` to stop guessing, which converted a knowable failure into a potential crash.
- The throwing parser looked exactly as safe as any other function. Callers can't handle dangers they can't see.
- The catch-all made failure *impossible to observe*. A wrong answer that looks like a right answer is the most expensive kind of bug.

**The deeper point:** failure was never part of any function's *contract*. TypeScript can only enforce what's in the types — and the types all said "this always works."

## 5. Try it yourself first!

1. **Vague hint:** what if a function could return *either* a success or a failure, as ordinary values, and the caller had to check which one it got?
2. **Warmer:** define a union of two object shapes sharing a boolean `ok` field — one carrying `value: T`, one carrying `error: E`. That's the whole `Result` type. Write `ok()` and `err()` helper functions.
3. **Warmer still:** list the three distinct ways `getConfig` can fail. Give each a name and the evidence it should carry (the path? the parse error text?). Make a union of those three object shapes, discriminated by `kind`.
4. **Specific:** rewrite `getConfig` to return `Result<AppConfig, ConfigError>`: check for null → `err({ kind: 'file-missing', path })`; wrap only `JSON.parse` in try/catch → `err({ kind: 'malformed-json', ... })`; validate the shape with a guard → `err({ kind: 'invalid-shape', ... })`; finally `ok(data)`.
5. **Caller side:** write a function that switches on `result.error.kind` and produces a different message per cause. Notice the compiler won't let you touch `.value` before checking `.ok`.

## 6. Understanding the refactored solution

The core type and helpers (six lines total) are exactly section 2's `Result`. Then the domain vocabulary:

```ts
export type ConfigError =
  | { kind: 'file-missing'; path: string }
  | { kind: 'malformed-json'; path: string; detail: string }
  | { kind: 'invalid-shape'; path: string };
```

Three causes, each with evidence. A string could never be switched on safely; this union can.

The pipeline:

```ts
export function getConfig(path: string): Result<AppConfig, ConfigError> {
  const raw = loadConfigFile(path);
  if (raw === null) return err({ kind: 'file-missing', path });

  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch (cause) {
    return err({ kind: 'malformed-json', path, detail: String(cause) });
  }

  if (!isAppConfig(data)) return err({ kind: 'invalid-shape', path });
  return ok(data);
}
```

Read the signature first — it tells the whole story: *you get a config or one of three named failures.* Each step either continues or returns early with its specific error. The `try` wraps *only* `JSON.parse` (the one thing that throws), and note `as unknown` — casting *down* to honesty, the opposite of the original's `as AppConfig`. The guard `isAppConfig` earns the final `ok(data)` without any cast.

The caller:

```ts
if (!result.ok) {
  switch (result.error.kind) {
    case 'file-missing':   return `no config at ${result.error.path} — refusing to guess`;
    case 'malformed-json': return `config at ${result.error.path} is broken: ${result.error.detail}`;
    case 'invalid-shape':  return `config at ${result.error.path} is missing required fields`;
  }
}
return `starting on ${result.value.host}:${result.value.port}`;
```

Two narrowings stacked: `!result.ok` narrows to the error arm, then `switch` on `kind` narrows to one cause — inside each case, that cause's evidence (like `detail`) is available and typed. Only after the `if` does `.value` exist. The type tests pin this: `result.value` without checking `.ok` is a compile error, and so is reading `.error` on the success arm.

The closing comment matters: **Results don't replace throwing everywhere.** Bugs and unrecoverable states still throw. Expected, caller-actionable failures — not-found, parse errors, validation — become Results. Two tools, two jobs.

## 7. Words you learned (glossary)

- **Result type** — `Result<T, E>`: a return value that is either success-with-T or failure-with-E.
- **Errors as values** — returning failures through the type system instead of throwing them past it.
- **Discriminated union** — a union of shapes sharing a literal field that identifies each.
- **Discriminant** — that shared field (`ok` for Result, `kind` for ConfigError).
- **Narrowing** — the compiler shrinking a union to one arm after a check.
- **Generic** — a type placeholder (`T`, `E`) filled in per use.
- **`never`** — the type with no values; "this arm cannot occur" in `Result<T, never>`.
- **Error union** — a union of named failure causes, each carrying evidence.
- **Exhaustive switch** — a switch covering every union member, so additions become compile errors.
- **Type guard** — a `value is T` function that validates and narrows.
- **Guard clause** — an early return that handles one failure and exits.
- **`throws` clause** — a signature warning some languages have; TypeScript does not, which is why throwing is invisible here.
- **Non-null assertion (`!`)** — "trust me, it's not null"; a check-free promise.
- **Contract** — everything a function's signature promises; Results put failure into it.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Forget the check.** In `refactored/result.ts`, add `const p = getConfig('/etc/app.json').value;`. Expected: ❌ `Property 'value' does not exist on type 'Result<...>'` — the compiler demands the `.ok` check first.
2. **Add a fourth failure.** Add `| { kind: 'permission-denied'; path: string }` to `ConfigError`. Expected: ❌ the `switch` in `startupReport` stops compiling (a code path no longer returns) — the compiler hands you a to-do list of every caller to update. Add a case; it's green again.
3. **Grab evidence from the wrong cause.** Inside `case 'file-missing':`, try using `result.error.detail`. Expected: ❌ `detail` only exists on the `malformed-json` arm — narrowing is per-cause.
4. **Use the helpers elsewhere.** Write `function safeDivide(a: number, b: number): Result<number, { kind: 'div-by-zero' }> { return b === 0 ? err({ kind: 'div-by-zero' }) : ok(a / b); }`. Expected: ✅ compiles — `Result` is domain-agnostic; only the error vocabulary changes.
5. **Break a type test.** Remove the `// @ts-expect-error` above `export const grab = result.value;`. Expected: ❌ the line itself now errors — proof these tests execute inside every typecheck.
