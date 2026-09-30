/**
 * Mission exercises. Make src/exercises.test.ts pass without editing it.
 * Reference: src/solutions.ts — gated until your prediction checkpoint.
 */
import { Effect } from "effect";

/**
 * Exercise 1 — safeMinutes
 * Parse a session-minutes string. Fail with an Error whose message contains
 * the offending input when the string is not a finite number, or when the
 * value is zero or negative. Succeed with the number otherwise.
 */
export const safeMinutes = (raw: string): Effect.Effect<number, Error> =>
  Effect.fail(new Error("TODO: implement safeMinutes"));

/**
 * Exercise 2 — sessionSummary
 * Using Effect.gen, combine the topic effect and a safeMinutes parse of raw
 * into the string "<topic> — <minutes> min".
 */
export const sessionSummary = (
  topic: Effect.Effect<string, Error>,
  raw: string
): Effect.Effect<string, Error> =>
  Effect.fail(new Error("TODO: implement sessionSummary"));

/**
 * Exercise 3 — totalMinutes
 * Sum an array of minute strings, failing with the FIRST invalid entry's
 * error. An empty array totals 0.
 */
export const totalMinutes = (raws: ReadonlyArray<string>): Effect.Effect<number, Error> =>
  Effect.fail(new Error("TODO: implement totalMinutes"));
