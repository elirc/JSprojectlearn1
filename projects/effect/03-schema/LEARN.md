# 03 — Schema: parse, don't validate

Every CRUD request body arrives as `unknown` — JSON from the network that
could be anything. `effect/Schema` turns "check it and hope" into "decode it
into a type, or get a typed error explaining exactly what was wrong." One
schema definition gives you the TypeScript type, the runtime decoder, the
encoder back to JSON, and human-readable error messages. This mission builds
the Forgelog `Session` schema you will put behind every API endpoint from
mission 05 onward.

## Validation versus parsing

A validator answers yes/no and leaves you holding the same untyped value:

```ts
if (isValid(body)) {
  // body is STILL unknown to the compiler; you cast and pray
}
```

A parser *transforms* the untrusted value into a typed one, so downstream
code never sees the raw input at all. That is Schema's model: `decode` maps
`unknown` → `Session` (or fails), `encode` maps `Session` → plain JSON. Once
decoded, invalid states are unrepresentable — a `Session` in your hands is
proof it was checked.

## Declaring a struct schema

```ts
import { Schema } from "effect";

const Session = Schema.Struct({
  topic: Schema.NonEmptyTrimmedString,
  minutes: Schema.Number.pipe(Schema.int(), Schema.positive()),
  note: Schema.optional(Schema.String),
});

// The TypeScript type is derived, never written twice:
type Session = typeof Session.Type; // { topic: string; minutes: number; note?: string }
```

Filters like `Schema.int()` and `Schema.positive()` refine a base schema, and
each contributes its own message when decoding fails. The type and the
runtime check cannot drift apart because they are the same declaration.

## Decoding unknown input

`Schema.decodeUnknownEither(Session)` gives you a plain function from
`unknown` to `Either<Session, ParseError>`:

```ts
import { Either } from "effect";

const decode = Schema.decodeUnknownEither(Session);

const good = decode({ topic: "Effect", minutes: 25 }); // Right<Session>
const bad = decode({ topic: "", minutes: 2.5 });        // Left<ParseError>
```

An `Either` is just a value — `Either.isRight`/`Either.isLeft` to branch,
no exceptions in sight. In Effect pipelines you will use
`Schema.decodeUnknown` (which returns an Effect) instead; the Either form is
handy in tests and at simple boundaries. `TreeFormatter` (or
`ParseResult.TreeFormatter`) pretty-prints a `ParseError` into the indented
report you will eventually return as a 400 body.

## Transformations: JSON shapes to domain shapes

Wire formats and domain types disagree — dates are the classic case. JSON
carries `"2026-09-29"`; your domain wants a `Date`. A transforming schema
holds both sides:

```ts
const Logged = Schema.Struct({
  topic: Schema.NonEmptyTrimmedString,
  loggedAt: Schema.Date, // decodes an ISO string into a Date, encodes back
});
```

`decode` walks input → domain; `encode` walks domain → input. Round-tripping
through decode then encode gets you back the wire shape — the tests make you
prove that. This is why Schema beats hand-rolled checks in CRUD apps: the
same declaration serializes your responses.

## Branded types: IDs that cannot be confused

`string` is a terrible type for an ID — every string is assignable to it.
A brand makes a nominal type out of a structural one:

```ts
const SessionId = Schema.String.pipe(Schema.brand("SessionId"));
type SessionId = typeof SessionId.Type; // string & Brand<"SessionId">
```

A plain `string` no longer typechecks where a `SessionId` is required; you
must go through the schema (`Schema.decodeSync(SessionId)("s_1")`) to mint
one. In a CRUD app with userIds, sessionIds, and topicIds flying around,
brands turn "passed the wrong ID" from a production bug into a compile error.

## The exercises

Open `src/exercises.ts` and build the Forgelog wire schema:

1. **`SessionId`** — a branded, non-empty string.
2. **`SessionInput`** — struct: trimmed non-empty `topic`, positive integer
   `minutes`, optional `note`.
3. **`StoredSession`** — `SessionInput` fields plus `id: SessionId` and
   `loggedAt: Schema.Date`; prove decode/encode round-trips.
4. **`decodeSessionInput`** — wrap `decodeUnknownEither` so callers get
   `Either<SessionInput, string>` with the pretty-printed error text.

```bash
npm install
npm test
```

Worked example: `src/01-schema-example.ts` (`npm run example`). Reference:
`src/solutions.ts`, gated until your prediction checkpoint.

## Common mistakes

- **Writing the type by hand next to the schema.** The pair will drift. Derive
  it: `type T = typeof T.Type`.
- **Decoding with `decodeSync` at the boundary.** Sync decode throws on bad
  input — fine in tests and for constants, wrong for request bodies. Use the
  Either or Effect forms where failure is expected.
- **Checking then casting.** If you find `as Session` after an `if`, you are
  validating, not parsing — let the decoder produce the typed value.
- **One giant schema.** Compose small ones (`SessionInput` reused inside
  `StoredSession`); each screen or endpoint decodes only what it needs.
