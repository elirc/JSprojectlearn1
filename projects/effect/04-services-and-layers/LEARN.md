# 04 — Services & Layers: swappable dependencies

So far every program you wrote was self-contained. Real CRUD code depends on
things — a database, a clock, a logger — and the third type parameter you
have been ignoring, `Effect<A, E, R>`, is where those dependencies live.
This mission builds Forgelog's `SessionRepo` as a *service*: business logic
declares that it needs a repository without knowing which one, and a *Layer*
decides at the edge whether that means an in-memory map (today, and in every
test) or SQLite (mission 06, without touching the logic).

## The requirements channel

`R` lists what a program needs before it can run:

```ts
Effect.Effect<Session[], never, SessionRepo>
//                              ^ cannot run until someone provides a SessionRepo
```

Requirements accumulate automatically: compose three effects that need
`SessionRepo` and `Clock`, and the result needs both. `Effect.runSync` only
accepts programs whose `R` is `never` — the compiler physically prevents you
from running code whose dependencies are unmet. Forgetting to wire a
dependency is a type error, not a Friday-night production incident.

## Defining a service with Context.Tag

A service is an interface plus a *tag* — a unique key the runtime uses to
look the implementation up:

```ts
import { Context, Effect } from "effect";

export class SessionRepo extends Context.Tag("SessionRepo")<
  SessionRepo,
  {
    readonly add: (s: SessionInput) => Effect.Effect<StoredSession>;
    readonly list: Effect.Effect<ReadonlyArray<StoredSession>>;
  }
>() {}
```

Note what is *not* here: no implementation, no constructor, no mention of
memory or SQL. The methods return Effects, so implementations are free to be
async, fail, or need their own dependencies later without changing callers.

## Using a service

Inside `Effect.gen`, yielding the tag hands you the implementation — and
quietly adds the requirement to `R`:

```ts
const logAndCount = (input: SessionInput) =>
  Effect.gen(function* () {
    const repo = yield* SessionRepo;       // R now includes SessionRepo
    yield* repo.add(input);
    const all = yield* repo.list;
    return all.length;
  }); // Effect<number, never, SessionRepo>
```

This is dependency injection with zero framework: no decorators, no
container, no `constructor(private repo: ...)` plumbing through five
classes. Any effect, anywhere in the call graph, can ask for the service and
the requirement surfaces in the outermost type.

## Implementing with a Layer

A `Layer<S>` describes how to build service `S`, including any setup effects:

```ts
import { Layer, Ref } from "effect";

export const SessionRepoMemory = Layer.effect(
  SessionRepo,
  Effect.gen(function* () {
    const store = yield* Ref.make<ReadonlyArray<StoredSession>>([]);
    let nextId = 1;
    return {
      add: (input) =>
        Effect.gen(function* () {
          const stored = { ...input, id: `s_${nextId++}`, loggedAt: new Date() };
          yield* Ref.update(store, (all) => [...all, stored]);
          return stored;
        }),
      list: Ref.get(store),
    };
  })
);
```

`Ref` is Effect's mutable cell — the store lives inside the layer, created
once when the layer is built. Layers compose (`Layer.merge`,
`Layer.provide`) into a dependency graph; for now one layer is enough.

## Providing at the edge

`Effect.provide` satisfies requirements, deleting them from `R`:

```ts
const runnable = Effect.provide(logAndCount(input), SessionRepoMemory);
// Effect<number, never, never> — now runnable
```

The rule that makes codebases testable: **logic asks, the edge provides.**
Handlers and services never construct their dependencies; `main` (or a test)
assembles the layer stack once. A test providing a prefilled fake repo and
production providing SQLite run the same logic byte for byte.

## Why this beats passing the repo as an argument

You could thread `repo` through every function by hand. At two functions
that is fine; at a real app's depth it means every intermediate signature
mentions dependencies it only forwards. With services, only the functions
that *use* the repo mention it, and the type system still tracks the full
requirement set end to end. That, plus swap-without-rewrite, is the payoff
you will cash in twice: mission 06 (SQLite layer) and mission 09 (test
layers).

## The exercises

Open `src/exercises.ts` and wire Forgelog's first service:

1. **`SessionRepo`** — the tag, with `add`, `list`, and `totalMinutes`
   (an `Effect<number>` summing all stored minutes).
2. **`SessionRepoMemory`** — a `Layer.effect` implementation over a `Ref`,
   with ids `s_1`, `s_2`, … in insertion order.
3. **`logSession`** — business logic: add a session, then return
   `"<topic> logged (<total> min total)"` using `totalMinutes`. It must not
   mention the memory implementation.
4. Watch the tests provide the layer themselves — and one test provide a
   *different*, prefilled implementation to prove your logic never cheated.

```bash
npm install
npm test
```

Worked example: `src/01-service-example.ts` (`npm run example`). Reference:
`src/solutions.ts`, gated until your prediction checkpoint.

## Common mistakes

- **Providing deep in the logic.** If business code calls `Effect.provide`,
  the dependency is hard-wired again and tests cannot swap it. Provide only
  at the edge (main, tests).
- **A tag per implementation.** One `SessionRepo` tag serves memory, SQLite,
  and fakes alike; implementations differ only in the layer.
- **State outside the layer.** A module-level `let sessions = []` is shared
  by every test file that imports it. Keep state in a `Ref` made inside the
  layer, so each provided layer is a fresh world.
- **Sync methods on the interface.** Returning `number` instead of
  `Effect<number>` locks every future implementation into being synchronous
  and infallible. Interfaces return Effects even when today's implementation
  is trivial.
