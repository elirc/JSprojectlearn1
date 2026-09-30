# 02 — Tagged errors: failures you can match on

Mission 01 used plain `Error` for every failure, which means every handler gets
one undifferentiated bucket. Real CRUD code fails in *kinds* — not found,
invalid input, conflict — and each kind deserves a different response. This
mission replaces `Error` with tagged error classes so the failure channel
becomes a union you can match on, exhaustively, with compiler help.

## Why plain Error stops scaling

With `Effect<Session, Error>` the type tells you *that* it can fail, not
*how*. To react differently to "minutes was negative" versus "topic was
empty" you end up sniffing message strings:

```ts
if (error.message.includes("minutes")) ...   // fragile, invisible to types
```

Rename a message and a handler silently dies. The failure channel can do
better because it is just a type parameter — it can hold a union.

## Data.TaggedError in one look

```ts
import { Data } from "effect";

export class InvalidMinutes extends Data.TaggedError("InvalidMinutes")<{
  readonly raw: string;
  readonly reason: string;
}> {}

export class EmptyTopic extends Data.TaggedError("EmptyTopic")<{}> {}
```

Each class gets a literal `_tag` field ("InvalidMinutes"), a constructor that
takes the payload (`new InvalidMinutes({ raw, reason })`), structural
equality, and it still `extends Error` so stack traces work. The `_tag` is
what makes matching possible: TypeScript can discriminate the union on it.

## The failure channel as a union

Fail with different classes and the channel accumulates a union
automatically:

```ts
const parseSession = (
  topic: string,
  rawMinutes: string
): Effect.Effect<Session, EmptyTopic | InvalidMinutes> => ...
```

Read that signature like documentation that cannot rot: this program either
yields a Session or fails in exactly one of two known ways. When a caller
handles one of them, Effect *subtracts* it from the union — handle both and
the error type becomes `never`, which is the compiler certifying "this cannot
fail any more."

## Handling one case with catchTag

`Effect.catchTag` targets a single member of the union by its tag:

```ts
const withDefaultTopic = pipe(
  parseSession(input.topic, input.minutes),
  Effect.catchTag("EmptyTopic", () =>
    parseSession("untitled", input.minutes)
  )
); // Effect<Session, InvalidMinutes> — EmptyTopic is gone from the type
```

The recovery function receives the fully-typed error instance, so
`error.raw` and `error.reason` are right there — no casting, no message
parsing.

## Handling every case with catchTags

`Effect.catchTags` takes an object with one handler per tag. Handle all of
them and failure disappears from the type entirely:

```ts
const message = pipe(
  parseSession(topic, raw),
  Effect.map((s) => `logged ${s.topic}`),
  Effect.catchTags({
    EmptyTopic: () => Effect.succeed("a topic is required"),
    InvalidMinutes: (e) => Effect.succeed(`bad minutes "${e.raw}": ${e.reason}`),
  })
); // Effect<string, never>
```

This is the shape of every HTTP handler you will write in mission 05: domain
logic fails in typed ways, and one `catchTags` at the boundary maps each
failure to a status code. Add a third error class to `parseSession` later and
this code stops compiling until you decide what to do with it — that is the
whole point.

## The exercises

Open `src/exercises.ts`. You will build the typed failure vocabulary for
Forgelog sessions:

1. **Error classes** — `EmptyTopic` (no payload) and `InvalidMinutes`
   (payload: `raw`, `reason`). The tests check `_tag` values and payloads.
2. **`parseSession`** — validate a topic (non-blank after trimming) and
   minutes (finite, positive number) into a `Session`; fail with the matching
   class. Error type must be the union, not `Error`.
3. **`sessionMessage`** — turn `parseSession`'s outcome into a user-facing
   string with `catchTags`, so the returned Effect's error type is `never`.
4. **`withRetryTopic`** — recover *only* from `EmptyTopic` by retrying with a
   fallback topic, leaving `InvalidMinutes` untouched in the type.

```bash
npm install
npm test
```

The worked example is `src/01-tagged-example.ts` (`npm run example`);
`src/solutions.ts` stays closed until your prediction checkpoint.

## Common mistakes

- **Throwing tagged errors.** `throw new EmptyTopic({})` puts it in the
  *defect* channel, invisible to `catchTag`. Fail with
  `Effect.fail(new EmptyTopic({}))` (or `yield* new EmptyTopic({})` — tagged
  errors are yieldable).
- **Widening back to Error.** Annotating a return type as
  `Effect<Session, Error>` erases the union you just built; let inference
  keep it, or write the union explicitly.
- **Handling with catchAll.** `Effect.catchAll` swallows the entire union at
  once. Reach for `catchTag`/`catchTags` so unhandled kinds stay visible.
- **Recovery that can itself fail.** A `catchTag` handler's own error type is
  added back to the union. If the fallback "cannot" fail, say so honestly:
  escalate the impossible case with `Effect.die` instead of letting a
  phantom error kind haunt the signature.
- **Payload-free everything.** An error class with no payload is fine for
  `EmptyTopic`, but if a handler will need context (which input? why?), put
  it in the payload now — the constructor is the only place that knows.
