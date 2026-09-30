/**
 * Reference solutions. Do not open before your prediction checkpoint.
 * To verify against the tests, temporarily point the test import at
 * "./solutions.js".
 */
import { Context, Effect, Layer, Ref } from "effect";

export interface SessionInput {
  readonly topic: string;
  readonly minutes: number;
}

export interface StoredSession extends SessionInput {
  readonly id: string;
}

export class SessionRepo extends Context.Tag("SessionRepo")<
  SessionRepo,
  {
    readonly add: (input: SessionInput) => Effect.Effect<StoredSession>;
    readonly list: Effect.Effect<ReadonlyArray<StoredSession>>;
    readonly totalMinutes: Effect.Effect<number>;
  }
>() {}

export const SessionRepoMemory: Layer.Layer<SessionRepo> = Layer.effect(
  SessionRepo,
  Effect.gen(function* () {
    const store = yield* Ref.make<ReadonlyArray<StoredSession>>([]);
    const counter = yield* Ref.make(0);
    return {
      add: (input) =>
        Effect.gen(function* () {
          const n = yield* Ref.updateAndGet(counter, (c) => c + 1);
          const stored: StoredSession = { ...input, id: `s_${n}` };
          yield* Ref.update(store, (all) => [...all, stored]);
          return stored;
        }),
      list: Ref.get(store),
      totalMinutes: Effect.map(Ref.get(store), (all) =>
        all.reduce((sum, s) => sum + s.minutes, 0)
      ),
    };
  })
);

export const logSession = (
  input: SessionInput
): Effect.Effect<string, never, SessionRepo> =>
  Effect.gen(function* () {
    const repo = yield* SessionRepo;
    const stored = yield* repo.add(input);
    const total = yield* repo.totalMinutes;
    return `${stored.topic} logged (${total} min total)`;
  });
