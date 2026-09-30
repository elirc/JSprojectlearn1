/**
 * Reference solutions. Do not open before your prediction checkpoint.
 * To verify these against the tests, temporarily change the import in
 * exercises.test.ts from "./exercises.js" to "./solutions.js".
 */
import { Effect } from "effect";

export const safeMinutes = (raw: string): Effect.Effect<number, Error> =>
  Effect.try({
    try: () => {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error(`not a number: "${raw}"`);
      if (n <= 0) throw new Error(`minutes must be positive: "${raw}"`);
      return n;
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
  });

export const sessionSummary = (
  topic: Effect.Effect<string, Error>,
  raw: string
): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    const name = yield* topic;
    const minutes = yield* safeMinutes(raw);
    return `${name} — ${minutes} min`;
  });

export const totalMinutes = (raws: ReadonlyArray<string>): Effect.Effect<number, Error> =>
  Effect.gen(function* () {
    let total = 0;
    for (const raw of raws) {
      total += yield* safeMinutes(raw);
    }
    return total;
  });
