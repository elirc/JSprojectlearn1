# 01 — Effect basics: programs as values

Effect is a TypeScript library for writing programs that can fail, need
dependencies, or run async work — with all three tracked in the type system.
This mission builds the mental model everything else in Effect Forge rests on:
an Effect is a description of a program, not the running program itself.

## What an Effect actually is

A normal function *does* the work when you call it:

```ts
const n = divide(10, 2); // work happens now; may throw
```

An `Effect` only *describes* the work. Nothing runs until you hand it to a
runtime at the edge of your program:

```ts
import { Effect } from "effect";

const program = Effect.sync(() => console.log("hi")); // nothing printed yet
Effect.runSync(program);                              // NOW it prints
```

This is the same shift you made from values to Promises, taken further: a
Promise starts running the moment it is created, while an Effect is inert — you
can pass it around, retry it, time it out, or combine it with others *before*
anything executes. That inertness is what makes composition safe.

## Success, failure, and the three type parameters

Every Effect has the shape `Effect<Success, Error, Requirements>`:

- **Success** — what you get if it works.
- **Error** — the *expected* ways it can fail. Not `any`, not a comment: a type.
- **Requirements** — services it needs (databases, clocks…). Stays `never`
  until mission 04, so ignore it for now.

```ts
const ok  = Effect.succeed(42);        // Effect<number, never, never>
const bad = Effect.fail("boom" as const); // Effect<never, "boom", never>
```

Read `Effect<number, "boom", never>` aloud: "a program that, when run, yields a
number or fails with 'boom', and needs nothing." The compiler will not let you
run a program at the edge while pretending its failures don't exist. That is
the core promise of Effect for CRUD apps: every route handler's failure modes
are visible in its signature.

## Building programs with Effect.gen

`Effect.gen` is Effect's `async/await`. You write a generator, and `yield*`
unwraps an Effect the way `await` unwraps a Promise:

```ts
const program = Effect.gen(function* () {
  const a = yield* Effect.succeed(10);
  const b = yield* Effect.succeed(32);
  return a + b;
}); // Effect<number, never, never>
```

If any yielded Effect fails, the generator stops there and the whole program
carries that failure — exactly like `throw` inside `async/await`, except the
failure type is tracked. You will write 90% of your Effect code in this style.

## pipe and small combinators

For small transformations, a pipeline reads better than a generator:

```ts
import { pipe } from "effect";

const doubledOrZero = pipe(
  parseNumber("21"),              // Effect<number, ParseError>
  Effect.map((n) => n * 2),       // transform the success channel
  Effect.orElseSucceed(() => 0)   // handle the failure channel
);
```

`Effect.map` touches only success; `Effect.mapError` only failure;
`Effect.flatMap` chains another Effect. The rule of thumb: `gen` for
sequences with intermediate names, `pipe` for a chain of tweaks to one value.

## Turning throwing code into Effects

Real code throws. `Effect.try` wraps a throwing function and moves the
exception into the typed failure channel:

```ts
const parseJson = (text: string) =>
  Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: (cause) => new Error(`invalid JSON: ${String(cause)}`),
  }); // Effect<unknown, Error, never>
```

`Effect.tryPromise` does the same for rejecting Promises (fetch, fs). This is
the bridge you will use constantly at the boundary between Effect and the rest
of the JavaScript world.

## Running an Effect at the edge

You run an Effect exactly once, at the outermost edge of the program:

- `Effect.runSync(program)` — for purely synchronous programs; throws if the
  program fails or contains async work.
- `Effect.runPromise(program)` — returns a Promise; use it in `main`, tests,
  or route adapters.

Everything inside stays as descriptions. If you find yourself calling
`runSync` in the middle of business logic, you have left the model — compose
instead.

## The exercises

Open `src/exercises.ts`. Three tiny Forgelog utilities are stubbed out, and
`src/exercises.test.ts` describes the target behavior:

1. **`safeMinutes`** — parse a session-minutes string; fail with a message for
   non-numbers, zero, or negatives. (`Effect.try` or explicit
   `succeed`/`fail`.)
2. **`sessionSummary`** — combine two Effects (topic lookup + minutes parse)
   into a `"topic — 25 min"` string using `Effect.gen`.
3. **`totalMinutes`** — sum an array of minute strings, failing on the first
   invalid one. (`Effect.forEach` or a loop inside `gen`.)

Run them with:

```bash
npm install
npm test
```

All tests fail before you start and must pass without editing the test file.
A worked example lives in `src/01-first-effect.ts` (`npm run example`), and
`src/solutions.ts` is the reference — gated until your prediction checkpoint.

## Common mistakes

- **Running too early.** If a helper returns `number` instead of
  `Effect<number, E>`, you executed inside the model. Return the description.
- **Losing the error type.** `catch: () => "oops"` erases information; prefer
  `catch` functions that build a descriptive `Error` (typed errors arrive
  properly in mission 02).
- **`yield` instead of `yield*`.** Only `yield*` unwraps the Effect; plain
  `yield` hands the raw Effect object back and TypeScript will complain.
- **Mixing Promise habits in.** `await` inside `Effect.gen` is a type error;
  wrap the Promise with `Effect.tryPromise` and `yield*` it instead.
