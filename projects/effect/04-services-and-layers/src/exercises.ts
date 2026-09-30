/**
 * Mission exercises. Make src/exercises.test.ts pass without editing it.
 * Reference: src/solutions.ts — gated until your prediction checkpoint.
 */
import { Context, Effect, Layer } from "effect";

export interface SessionInput {
  readonly topic: string;
  readonly minutes: number;
}

export interface StoredSession extends SessionInput {
  readonly id: string;
}

/**
 * Exercise 1 — the SessionRepo service.
 * add stores a session and returns it with its assigned id; list yields all
 * stored sessions in insertion order; totalMinutes sums stored minutes.
 */
export class SessionRepo extends Context.Tag("SessionRepo")<
  SessionRepo,
  {
    readonly add: (input: SessionInput) => Effect.Effect<StoredSession>;
    readonly list: Effect.Effect<ReadonlyArray<StoredSession>>;
    readonly totalMinutes: Effect.Effect<number>;
  }
>() {}

/**
 * Exercise 2 — SessionRepoMemory.
 * A Layer.effect implementation over a Ref. Ids are "s_1", "s_2", … in
 * insertion order. Each built layer starts empty.
 */
export const SessionRepoMemory: Layer.Layer<SessionRepo> = Layer.effect(
  SessionRepo,
  Effect.die("TODO: implement SessionRepoMemory")
);

/**
 * Exercise 3 — logSession.
 * Add the session, then report "<topic> logged (<total> min total)" where
 * total comes from totalMinutes AFTER the add. Only the service may be used —
 * this function must not know which implementation is provided.
 */
export const logSession = (
  input: SessionInput
): Effect.Effect<string, never, SessionRepo> =>
  Effect.gen(function* () {
    return yield* Effect.die("TODO: implement logSession");
  });
