/**
 * Mission exercises. Make src/exercises.test.ts pass without editing it.
 * Reference: src/solutions.ts — gated until your prediction checkpoint.
 */
import { Data, Effect } from "effect";

export interface Session {
  readonly topic: string;
  readonly minutes: number;
}

/**
 * Exercise 1 — error classes.
 * EmptyTopic carries no payload. InvalidMinutes carries the raw input and a
 * human-readable reason.
 */
export class EmptyTopic extends Data.TaggedError("EmptyTopic")<{}> {}

export class InvalidMinutes extends Data.TaggedError("InvalidMinutes")<{
  readonly raw: string;
  readonly reason: string;
}> {}

/**
 * Exercise 2 — parseSession.
 * Trim the topic; fail with EmptyTopic when blank. Parse minutes; fail with
 * InvalidMinutes when not a finite number ("not a number") or not positive
 * ("must be positive"). Succeed with { topic, minutes } otherwise.
 */
export const parseSession = (
  topic: string,
  rawMinutes: string
): Effect.Effect<Session, EmptyTopic | InvalidMinutes> =>
  Effect.fail(new EmptyTopic({})); // TODO: implement

/**
 * Exercise 3 — sessionMessage.
 * "logged <topic> for <minutes> min" on success; via catchTags,
 * "a topic is required" for EmptyTopic and `bad minutes "<raw>": <reason>`
 * for InvalidMinutes. The result's error type must be never.
 */
export const sessionMessage = (
  topic: string,
  rawMinutes: string
): Effect.Effect<string, never> =>
  Effect.succeed("TODO: implement sessionMessage");

/**
 * Exercise 4 — withFallbackTopic.
 * Recover ONLY from EmptyTopic by re-parsing with the fallback topic.
 * InvalidMinutes must remain in the error type (and still fail at runtime).
 */
export const withFallbackTopic = (
  topic: string,
  rawMinutes: string,
  fallback: string
): Effect.Effect<Session, InvalidMinutes> =>
  Effect.fail(new InvalidMinutes({ raw: rawMinutes, reason: "TODO: implement" }));
