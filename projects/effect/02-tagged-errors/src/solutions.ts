/**
 * Reference solutions. Do not open before your prediction checkpoint.
 * To verify against the tests, temporarily point the test import at
 * "./solutions.js".
 */
import { Data, Effect, pipe } from "effect";

export interface Session {
  readonly topic: string;
  readonly minutes: number;
}

export class EmptyTopic extends Data.TaggedError("EmptyTopic")<{}> {}

export class InvalidMinutes extends Data.TaggedError("InvalidMinutes")<{
  readonly raw: string;
  readonly reason: string;
}> {}

export const parseSession = (
  topic: string,
  rawMinutes: string
): Effect.Effect<Session, EmptyTopic | InvalidMinutes> =>
  Effect.gen(function* () {
    const trimmed = topic.trim();
    if (trimmed === "") return yield* new EmptyTopic({});
    const minutes = Number(rawMinutes);
    if (!Number.isFinite(minutes))
      return yield* new InvalidMinutes({ raw: rawMinutes, reason: "not a number" });
    if (minutes <= 0)
      return yield* new InvalidMinutes({ raw: rawMinutes, reason: "must be positive" });
    return { topic: trimmed, minutes };
  });

export const sessionMessage = (
  topic: string,
  rawMinutes: string
): Effect.Effect<string, never> =>
  pipe(
    parseSession(topic, rawMinutes),
    Effect.map((s) => `logged ${s.topic} for ${s.minutes} min`),
    Effect.catchTags({
      EmptyTopic: () => Effect.succeed("a topic is required"),
      InvalidMinutes: (e) => Effect.succeed(`bad minutes "${e.raw}": ${e.reason}`),
    })
  );

export const withFallbackTopic = (
  topic: string,
  rawMinutes: string,
  fallback: string
): Effect.Effect<Session, InvalidMinutes> =>
  pipe(
    parseSession(topic, rawMinutes),
    Effect.catchTag("EmptyTopic", () =>
      pipe(
        parseSession(fallback, rawMinutes),
        // A blank *fallback* is a programmer error, not a user error: if it
        // ever happens, escalate to a defect so InvalidMinutes stays the only
        // typed failure.
        Effect.catchTag("EmptyTopic", (e) => Effect.die(e))
      )
    )
  );
