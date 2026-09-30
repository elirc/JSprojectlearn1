/**
 * Reference solutions. Do not open before your prediction checkpoint.
 * To verify against the tests, temporarily point the test import at
 * "./solutions.js".
 */
import { Either, ParseResult, Schema } from "effect";

export const SessionId = Schema.NonEmptyString.pipe(Schema.brand("SessionId"));
export type SessionId = typeof SessionId.Type;

export const SessionInput = Schema.Struct({
  topic: Schema.NonEmptyTrimmedString,
  minutes: Schema.Number.pipe(Schema.int(), Schema.positive()),
  note: Schema.optional(Schema.String),
});
export type SessionInput = typeof SessionInput.Type;

export const StoredSession = Schema.Struct({
  ...SessionInput.fields,
  id: SessionId,
  loggedAt: Schema.Date,
});
export type StoredSession = typeof StoredSession.Type;

export const decodeSessionInput = (
  input: unknown
): Either.Either<SessionInput, string> =>
  Either.mapLeft(
    Schema.decodeUnknownEither(SessionInput)(input),
    (error) => ParseResult.TreeFormatter.formatErrorSync(error)
  );
