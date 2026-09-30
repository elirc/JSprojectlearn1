import { describe, expect, it } from "vitest";
import { Either, Schema } from "effect";
import {
  SessionId,
  SessionInput,
  StoredSession,
  decodeSessionInput,
} from "./exercises.js";

const right = <A, E>(either: Either.Either<A, E>): A => {
  if (Either.isLeft(either))
    throw new Error(`expected Right, got Left: ${String(either.left)}`);
  return either.right;
};

describe("SessionId", () => {
  const decode = Schema.decodeUnknownEither(SessionId);
  it("accepts a non-empty string", () => {
    expect(right(decode("s_1"))).toBe("s_1");
  });
  it("rejects an empty string", () => {
    expect(Either.isLeft(decode(""))).toBe(true);
  });
  it("rejects a number", () => {
    expect(Either.isLeft(decode(42))).toBe(true);
  });
});

describe("SessionInput", () => {
  const decode = Schema.decodeUnknownEither(SessionInput);
  it("accepts a valid input, note optional", () => {
    expect(right(decode({ topic: "Effect", minutes: 25 }))).toEqual({
      topic: "Effect",
      minutes: 25,
    });
    expect(
      right(decode({ topic: "Effect", minutes: 25, note: "good session" })).note
    ).toBe("good session");
  });
  it("rejects blank and whitespace-padded-to-empty topics", () => {
    expect(Either.isLeft(decode({ topic: "", minutes: 25 }))).toBe(true);
    expect(Either.isLeft(decode({ topic: "   ", minutes: 25 }))).toBe(true);
  });
  it("rejects non-integer and non-positive minutes", () => {
    expect(Either.isLeft(decode({ topic: "Effect", minutes: 2.5 }))).toBe(true);
    expect(Either.isLeft(decode({ topic: "Effect", minutes: 0 }))).toBe(true);
    expect(Either.isLeft(decode({ topic: "Effect", minutes: -5 }))).toBe(true);
  });
});

describe("StoredSession", () => {
  const decode = Schema.decodeUnknownEither(StoredSession);
  const wire = {
    id: "s_1",
    topic: "Effect",
    minutes: 25,
    loggedAt: "2026-09-29T10:00:00.000Z",
  };
  it("decodes the wire shape, turning loggedAt into a Date", () => {
    const session = right(decode(wire));
    expect(session.loggedAt).toBeInstanceOf(Date);
    expect(session.loggedAt.toISOString()).toBe("2026-09-29T10:00:00.000Z");
  });
  it("round-trips: encode(decode(wire)) === wire", () => {
    const session = right(decode(wire));
    const encoded = Schema.encodeSync(StoredSession)(session);
    expect(encoded).toEqual(wire);
  });
  it("rejects an invalid date string", () => {
    expect(Either.isLeft(decode({ ...wire, loggedAt: "not-a-date" }))).toBe(true);
  });
});

describe("decodeSessionInput", () => {
  it("returns Right for valid input", () => {
    expect(right(decodeSessionInput({ topic: "Effect", minutes: 25 }))).toEqual({
      topic: "Effect",
      minutes: 25,
    });
  });
  it("returns Left with readable text naming the failing field", () => {
    const result = decodeSessionInput({ topic: "Effect", minutes: -1 });
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(typeof result.left).toBe("string");
      expect(result.left).toContain("minutes");
    }
  });
});
