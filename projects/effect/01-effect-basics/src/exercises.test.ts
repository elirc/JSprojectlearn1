import { describe, expect, it } from "vitest";
import { Cause, Effect, Exit } from "effect";
import { safeMinutes, sessionSummary, totalMinutes } from "./exercises.js";

const runExit = <A, E>(effect: Effect.Effect<A, E>) => Effect.runSyncExit(effect);

const failureMessage = <A>(exit: Exit.Exit<A, Error>): string => {
  if (!Exit.isFailure(exit)) throw new Error("expected failure, got success");
  return Cause.pretty(exit.cause);
};

describe("safeMinutes", () => {
  it("parses a normal value", () => {
    expect(Effect.runSync(safeMinutes("25"))).toBe(25);
  });
  it("fails on a non-number and names the input", () => {
    const exit = runExit(safeMinutes("banana"));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(failureMessage(exit)).toContain("banana");
  });
  it("fails on zero and negatives", () => {
    expect(Exit.isFailure(runExit(safeMinutes("0")))).toBe(true);
    expect(Exit.isFailure(runExit(safeMinutes("-10")))).toBe(true);
  });
});

describe("sessionSummary", () => {
  it("combines topic and minutes", () => {
    const summary = Effect.runSync(sessionSummary(Effect.succeed("Effect basics"), "25"));
    expect(summary).toBe("Effect basics — 25 min");
  });
  it("propagates a failing topic", () => {
    const exit = runExit(sessionSummary(Effect.fail(new Error("no topic")), "25"));
    expect(Exit.isFailure(exit)).toBe(true);
  });
  it("propagates invalid minutes", () => {
    const exit = runExit(sessionSummary(Effect.succeed("Effect basics"), "banana"));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("totalMinutes", () => {
  it("sums valid entries", () => {
    expect(Effect.runSync(totalMinutes(["25", "5", "10"]))).toBe(40);
  });
  it("totals an empty array to 0", () => {
    expect(Effect.runSync(totalMinutes([]))).toBe(0);
  });
  it("fails on the first invalid entry", () => {
    const exit = runExit(totalMinutes(["25", "banana", "oops"]));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(failureMessage(exit)).toContain("banana");
  });
});
