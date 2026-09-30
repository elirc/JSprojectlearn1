# Spec: Implement the three Effect basics exercises

## Context

`projects/effect/01-effect-basics` is a small Effect TS project. The exercises
in `src/exercises.ts` are stubbed (each returns `Effect.fail` with a TODO
message) and `src/exercises.test.ts` describes the target behavior. The tests
currently fail.

## Requirements

1. `safeMinutes(raw)` succeeds with the parsed number for finite, positive
   numeric strings; fails with an `Error` whose message contains the raw input
   for non-numeric strings, zero, and negatives.
2. `sessionSummary(topic, raw)` yields `"<topic> — <minutes> min"` using
   `Effect.gen`, propagating failure from either the topic effect or the
   minutes parse.
3. `totalMinutes(raws)` sums all entries, totals an empty array to 0, and
   fails with the error of the FIRST invalid entry.

## Acceptance criteria

- `npm test` → exit 0, all 9 tests pass
- `npm run typecheck` → exit 0
- `git diff --stat` → only `src/exercises.ts` changed

## Allowed scope

- `projects/effect/01-effect-basics/src/exercises.ts`

## Non-goals

- Do not modify `src/exercises.test.ts`, `src/solutions.ts`, or any config.
- Do not add dependencies or scripts.
- Do not open or copy from `src/solutions.ts`.
- Do not add exports beyond the three existing ones.

## Constraints

- Use `Effect.gen` for requirement 2 (the mission teaches that form).
- Errors must be `Error` instances, not strings.
