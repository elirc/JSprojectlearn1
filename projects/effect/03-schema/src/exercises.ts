/**
 * Mission exercises. Make src/exercises.test.ts pass without editing it.
 * Reference: src/solutions.ts — gated until your prediction checkpoint.
 *
 * Replace each `Schema.Never as unknown as ...` placeholder with a real
 * schema. The casts exist only so the stubs compile; delete them.
 */
import { Either, Schema } from "effect";

/**
 * Exercise 1 — SessionId.
 * A branded, non-empty string. Plain strings must not be assignable.
 */
export const SessionId = Schema.Never as unknown as Schema.Schema<string, string>;
export type SessionId = typeof SessionId.Type;

/**
 * Exercise 2 — SessionInput.
 * topic: non-empty trimmed string; minutes: positive integer;
 * note: optional string.
 */
export const SessionInput = Schema.Never as unknown as Schema.Schema<
  { readonly topic: string; readonly minutes: number; readonly note?: string },
  unknown
>;
export type SessionInput = typeof SessionInput.Type;

/**
 * Exercise 3 — StoredSession.
 * All SessionInput fields plus id (SessionId) and loggedAt (Schema.Date,
 * i.e. an ISO string on the wire, a Date in the domain).
 */
export const StoredSession = Schema.Never as unknown as Schema.Schema<
  SessionInput & { readonly id: string; readonly loggedAt: Date },
  unknown
>;
export type StoredSession = typeof StoredSession.Type;

/**
 * Exercise 4 — decodeSessionInput.
 * Decode unknown input into a SessionInput, mapping any ParseError to its
 * pretty-printed text (ParseResult.TreeFormatter.formatErrorSync).
 */
export const decodeSessionInput = (
  input: unknown
): Either.Either<SessionInput, string> => Either.left("TODO: implement");
