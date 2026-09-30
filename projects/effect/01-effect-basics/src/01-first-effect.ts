/**
 * Worked example: the full basic vocabulary in one small program.
 * Run with: npm run example
 */
import { Effect, pipe } from "effect";

// A description of a computation that can fail. Nothing runs yet.
const parseMinutes = (raw: string): Effect.Effect<number, Error> =>
  Effect.try({
    try: () => {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error(`not a number: "${raw}"`);
      return n;
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
  });

// Compose descriptions with a pipeline: map touches success, orElse handles failure.
const minutesOrZero = (raw: string) =>
  pipe(
    parseMinutes(raw),
    Effect.map((n) => Math.max(0, Math.round(n))),
    Effect.orElseSucceed(() => 0)
  );

// Compose sequences with Effect.gen: yield* unwraps like await.
const program = Effect.gen(function* () {
  const focused = yield* parseMinutes("25");
  const sloppy = yield* minutesOrZero("not-a-number");
  return `focused: ${focused} min, sloppy fallback: ${sloppy} min`;
});

// Run exactly once, at the edge.
console.log(Effect.runSync(program));

// Failures surface at the edge too — runSync throws a FiberFailure:
try {
  Effect.runSync(parseMinutes("banana"));
} catch (error) {
  console.log("edge caught:", String(error).split("\n")[0]);
}
