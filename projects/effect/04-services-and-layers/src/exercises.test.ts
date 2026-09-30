import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import {
  logSession,
  SessionRepo,
  SessionRepoMemory,
  type StoredSession,
} from "./exercises.js";

const run = <A>(effect: Effect.Effect<A, never, SessionRepo>): A =>
  Effect.runSync(Effect.provide(effect, SessionRepoMemory));

describe("SessionRepoMemory", () => {
  it("starts empty and assigns sequential ids", () => {
    const result = run(
      Effect.gen(function* () {
        const repo = yield* SessionRepo;
        const first = yield* repo.add({ topic: "Effect", minutes: 25 });
        const second = yield* repo.add({ topic: "Agents", minutes: 10 });
        return { first, second, all: yield* repo.list };
      })
    );
    expect(result.first).toEqual({ id: "s_1", topic: "Effect", minutes: 25 });
    expect(result.second.id).toBe("s_2");
    expect(result.all.map((s) => s.id)).toEqual(["s_1", "s_2"]);
  });

  it("each provided layer is a fresh world", () => {
    const count = Effect.gen(function* () {
      const repo = yield* SessionRepo;
      yield* repo.add({ topic: "Effect", minutes: 25 });
      return (yield* repo.list).length;
    });
    expect(run(count)).toBe(1);
    expect(run(count)).toBe(1); // a second provide must NOT see the first's data
  });

  it("totalMinutes sums stored sessions", () => {
    const total = run(
      Effect.gen(function* () {
        const repo = yield* SessionRepo;
        yield* repo.add({ topic: "a", minutes: 25 });
        yield* repo.add({ topic: "b", minutes: 5 });
        return yield* repo.totalMinutes;
      })
    );
    expect(total).toBe(30);
  });
});

describe("logSession", () => {
  it("adds and reports the running total", () => {
    const message = run(
      Effect.gen(function* () {
        yield* logSession({ topic: "Effect", minutes: 25 });
        return yield* logSession({ topic: "Agents", minutes: 10 });
      })
    );
    expect(message).toBe("Agents logged (35 min total)");
  });

  it("uses only the service — a swapped implementation changes the result", () => {
    const sessions: StoredSession[] = [
      { id: "seed_1", topic: "prior", minutes: 100 },
    ];
    const Prefilled = Layer.succeed(SessionRepo, {
      add: (input) =>
        Effect.sync(() => {
          const stored = { ...input, id: `seed_${sessions.length + 1}` };
          sessions.push(stored);
          return stored;
        }),
      list: Effect.sync(() => [...sessions]),
      totalMinutes: Effect.sync(() =>
        sessions.reduce((sum, s) => sum + s.minutes, 0)
      ),
    });
    const message = Effect.runSync(
      Effect.provide(logSession({ topic: "Effect", minutes: 25 }), Prefilled)
    );
    expect(message).toBe("Effect logged (125 min total)");
  });
});
