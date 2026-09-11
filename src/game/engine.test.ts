import { describe, expect, it } from "vitest";
import {
  challengeKey,
  completeChallenge,
  createProgress,
  dueMissionIds,
  isMissionUnlocked,
  levelFromXp,
  reviewMission,
  saveResponse,
  scheduleReview,
  streakFromDates,
} from "./engine";
import type { Mission } from "../types";

const mission: Mission = {
  id: "m1",
  sourceKey: "one",
  worldId: "foundations",
  title: "Mission",
  summary: "Summary",
  concepts: [],
  estimatedMinutes: 30,
  xp: 200,
  difficulty: 1,
  fileCount: 1,
  bytes: 1,
  contentFile: "missions/m1.json",
  order: 1,
  prerequisites: [],
  challenges: [
    {
      id: "a",
      title: "A",
      kind: "reflection",
      xp: 30,
      minLength: 3,
      prompt: "",
      hint: "",
    },
    {
      id: "b",
      title: "B",
      kind: "prediction",
      xp: 40,
      minLength: 3,
      prompt: "",
      hint: "",
    },
  ],
};

describe("progression", () => {
  it("locks missions until every prerequisite is complete", () => {
    const locked = { ...mission, id: "m2", prerequisites: ["m1"] };
    expect(isMissionUnlocked(locked, createProgress())).toBe(false);
    expect(
      isMissionUnlocked(locked, {
        ...createProgress(),
        completedMissions: ["m1"],
      }),
    ).toBe(true);
  });

  it("requires original response evidence before a checkpoint completes", () => {
    expect(() =>
      completeChallenge(createProgress(), mission, mission.challenges[0]),
    ).toThrow(/at least 3/);
  });

  it("awards challenge and mission XP once and creates a spaced review", () => {
    let progress = saveResponse(createProgress(), mission.id, "a", "abc");
    progress = completeChallenge(
      progress,
      mission,
      mission.challenges[0],
      new Date("2026-01-01T00:00:00Z"),
    );
    progress = saveResponse(progress, mission.id, "b", "xyz");
    progress = completeChallenge(
      progress,
      mission,
      mission.challenges[1],
      new Date("2026-01-01T00:00:00Z"),
    );
    expect(progress.xp).toBe(270);
    expect(progress.completedMissions).toEqual([mission.id]);
    expect(progress.reviews[mission.id].due).toBe("2026-01-03T00:00:00.000Z");
    expect(completeChallenge(progress, mission, mission.challenges[1])).toBe(
      progress,
    );
  });

  it("keeps response keys mission-specific", () => {
    const progress = saveResponse(createProgress(), "m1", "a", "answer");
    expect(progress.responses[challengeKey("m1", "a")]).toBe("answer");
  });
});

describe("reviews and rewards", () => {
  it("widens good review intervals", () => {
    const base = {
      missionId: "m1",
      stage: 0,
      due: "2026-01-01T00:00:00Z",
      reviews: 0,
      lapses: 0,
    };
    const first = scheduleReview(
      base,
      "good",
      new Date("2026-01-01T00:00:00Z"),
    );
    const second = scheduleReview(
      first,
      "good",
      new Date("2026-01-03T00:00:00Z"),
    );
    expect(first.due).toBe("2026-01-03T00:00:00.000Z");
    expect(second.due).toBe("2026-01-10T00:00:00.000Z");
  });

  it("returns failed reviews quickly and tracks due missions", () => {
    const progress = {
      ...createProgress(),
      completedMissions: ["m1"],
      reviews: {
        m1: {
          missionId: "m1",
          stage: 2,
          due: "2026-01-01T00:00:00Z",
          reviews: 1,
          lapses: 0,
        },
      },
    };
    const reviewed = reviewMission(
      progress,
      "m1",
      "again",
      new Date("2026-01-02T00:00:00Z"),
    );
    expect(reviewed.reviews.m1.due).toBe("2026-01-02T00:10:00.000Z");
    expect(dueMissionIds(progress, new Date("2026-01-02T00:00:00Z"))).toEqual([
      "m1",
    ]);
  });

  it("derives levels and consecutive activity streaks", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(1000)).toBe(3);
    expect(
      streakFromDates(
        ["2026-01-01", "2026-01-02", "2026-01-03"],
        new Date("2026-01-03T12:00:00Z"),
      ),
    ).toBe(3);
  });
});

describe("runtime progression boundaries", () => {
  it("rejects completing a locked mission and a foreign checkpoint", () => {
    const progress = saveResponse(
      createProgress(),
      mission.id,
      "a",
      "evidence",
    );
    expect(() =>
      completeChallenge(
        progress,
        { ...mission, prerequisites: ["missing"] },
        mission.challenges[0],
      ),
    ).toThrow(/prerequisites/);
    expect(() =>
      completeChallenge(progress, mission, {
        ...mission.challenges[0],
        id: "foreign",
      }),
    ).toThrow(/belong/);
  });
  it("uses the catalog checkpoint reward instead of a supplied altered reward", () => {
    const progress = saveResponse(
      createProgress(),
      mission.id,
      "a",
      "evidence",
    );
    expect(
      completeChallenge(progress, mission, {
        ...mission.challenges[0],
        xp: 9999,
      }).xp,
    ).toBe(30);
  });
  it("rejects early or repeated review rewards", () => {
    const progress = {
      ...createProgress(),
      completedMissions: ["m1"],
      reviews: {
        m1: {
          missionId: "m1",
          stage: 0,
          due: "2026-01-02T00:00:00Z",
          reviews: 0,
          lapses: 0,
        },
      },
    };
    expect(() =>
      reviewMission(progress, "m1", "good", new Date("2026-01-01T00:00:00Z")),
    ).toThrow(/not due/);
    const accepted = reviewMission(
      progress,
      "m1",
      "good",
      new Date("2026-01-02T00:00:00Z"),
    );
    expect(() =>
      reviewMission(accepted, "m1", "good", new Date("2026-01-02T00:00:00Z")),
    ).toThrow(/not due/);
  });
  it("rejects invalid clocks, stages and runtime ratings", () => {
    const record = {
      missionId: "m1",
      stage: 0,
      due: "2026-01-01T00:00:00Z",
      reviews: 0,
      lapses: 0,
    };
    expect(() => scheduleReview(record, "good", new Date("invalid"))).toThrow(
      /clock/,
    );
    expect(() => scheduleReview({ ...record, stage: -1 }, "good")).toThrow(
      /invalid/,
    );
    expect(() => scheduleReview(record, "unknown" as never)).toThrow(/rating/);
  });
});
