import { describe, expect, it } from "vitest";
import { Cause, Effect, Exit, Option } from "effect";
import {
  EmptyTopic,
  InvalidMinutes,
  parseSession,
  sessionMessage,
  withFallbackTopic,
} from "./exercises.js";

const failureOf = <A, E>(effect: Effect.Effect<A, E>): E => {
  const exit = Effect.runSyncExit(effect);
  if (!Exit.isFailure(exit)) throw new Error("expected failure, got success");
  const failure = Cause.failureOption(exit.cause);
  if (Option.isNone(failure)) throw new Error("expected a typed failure");
  return failure.value;
};

describe("error classes", () => {
  it("carry the right tags", () => {
    expect(new EmptyTopic({})._tag).toBe("EmptyTopic");
    expect(new InvalidMinutes({ raw: "x", reason: "r" })._tag).toBe("InvalidMinutes");
  });
  it("InvalidMinutes exposes its payload", () => {
    const e = new InvalidMinutes({ raw: "-3", reason: "must be positive" });
    expect(e.raw).toBe("-3");
    expect(e.reason).toBe("must be positive");
  });
});

describe("parseSession", () => {
  it("parses a valid session and trims the topic", () => {
    expect(Effect.runSync(parseSession("  Effect  ", "25"))).toEqual({
      topic: "Effect",
      minutes: 25,
    });
  });
  it("fails with EmptyTopic for blank topics", () => {
    expect(failureOf(parseSession("   ", "25"))._tag).toBe("EmptyTopic");
  });
  it("fails with InvalidMinutes for non-numbers, carrying the raw input", () => {
    const e = failureOf(parseSession("Effect", "banana"));
    expect(e._tag).toBe("InvalidMinutes");
    if (e._tag === "InvalidMinutes") expect(e.raw).toBe("banana");
  });
  it("fails with InvalidMinutes for zero and negatives", () => {
    expect(failureOf(parseSession("Effect", "0"))._tag).toBe("InvalidMinutes");
    expect(failureOf(parseSession("Effect", "-5"))._tag).toBe("InvalidMinutes");
  });
});

describe("sessionMessage", () => {
  it("describes a success", () => {
    expect(Effect.runSync(sessionMessage("Effect", "25"))).toBe(
      "logged Effect for 25 min"
    );
  });
  it("describes an empty topic", () => {
    expect(Effect.runSync(sessionMessage("  ", "25"))).toBe("a topic is required");
  });
  it("describes bad minutes with raw and reason", () => {
    expect(Effect.runSync(sessionMessage("Effect", "banana"))).toBe(
      'bad minutes "banana": not a number'
    );
  });
});

describe("withFallbackTopic", () => {
  it("passes through a valid session", () => {
    expect(Effect.runSync(withFallbackTopic("Effect", "25", "untitled"))).toEqual({
      topic: "Effect",
      minutes: 25,
    });
  });
  it("recovers from EmptyTopic with the fallback", () => {
    expect(Effect.runSync(withFallbackTopic("  ", "25", "untitled"))).toEqual({
      topic: "untitled",
      minutes: 25,
    });
  });
  it("still fails for invalid minutes", () => {
    expect(failureOf(withFallbackTopic("Effect", "banana", "untitled"))._tag).toBe(
      "InvalidMinutes"
    );
  });
});
