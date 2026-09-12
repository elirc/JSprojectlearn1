import { describe, expect, it } from "vitest";
import { createProgress, saveResponse } from "./engine";
import {
  DRAFTS_KEY,
  UI_KEY,
  applyMissionDrafts,
  clearMissionDrafts,
  draftsDiffer,
  missionDraftsFrom,
  parseDraftStore,
  parseUiState,
  readMissionDrafts,
  readMissionUi,
  withMissionDrafts,
  withMissionUi,
  writeMissionDrafts,
  writeMissionUi,
} from "./drafts";
import { splitMarkdownSections } from "./lesson";

const ids = ["reconstruct", "predict", "prove", "code-lab"];
function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    port: {
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
    },
  };
}
const hostile = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  },
};

describe("mission drafts", () => {
  it("collects only this mission's draft responses", () => {
    let progress = saveResponse(createProgress(), "m1", "predict", "abc");
    progress = saveResponse(progress, "m1", "code-lab", "console.log(1)");
    progress = saveResponse(progress, "m2", "predict", "other");
    expect(missionDraftsFrom(progress, "m1", ids)).toEqual({
      predict: "abc",
      "code-lab": "console.log(1)",
    });
    expect(missionDraftsFrom(progress, "m3", ids)).toEqual({});
  });
  it("ignores responses outside the mission's challenge ids", () => {
    const progress = saveResponse(createProgress(), "m1", "review", "recall");
    expect(missionDraftsFrom(progress, "m1", ids)).toEqual({});
  });
  it("detects added, changed and removed drafts", () => {
    expect(draftsDiffer({ a: "1" }, { a: "1" })).toBe(false);
    expect(draftsDiffer({ a: "1" }, { a: "2" })).toBe(true);
    expect(draftsDiffer({ a: "1" }, {})).toBe(true);
    expect(draftsDiffer({}, { a: "" })).toBe(false);
  });
  it("merges recovered drafts without touching other responses", () => {
    const progress = saveResponse(createProgress(), "m2", "predict", "keep");
    const merged = applyMissionDrafts(progress, "m1", { predict: "restored" });
    expect(merged.responses["m1::predict"]).toBe("restored");
    expect(merged.responses["m2::predict"]).toBe("keep");
    expect(progress.responses["m1::predict"]).toBeUndefined();
  });
  it("parses only well formed stores", () => {
    expect(parseDraftStore(null)).toEqual({});
    expect(parseDraftStore("{not json")).toEqual({});
    expect(parseDraftStore("[1,2]")).toEqual({});
    expect(parseDraftStore('{"m1":{"a":1},"m2":{"a":"x"}}')).toEqual({
      m2: { a: "x" },
    });
  });
  it("removes a mission entry when its drafts are empty", () => {
    const store = { m1: { a: "1" }, m2: { b: "2" } };
    expect(withMissionDrafts(store, "m1", {})).toEqual({ m2: { b: "2" } });
    expect(withMissionDrafts(store, "m3", { c: "3" }).m3).toEqual({ c: "3" });
    expect(store.m1).toEqual({ a: "1" });
  });
  it("writes, reads and clears drafts through storage", () => {
    const store = memory();
    writeMissionDrafts("m1", { predict: "draft" }, store.port);
    expect(JSON.parse(store.data[DRAFTS_KEY])).toEqual({
      m1: { predict: "draft" },
    });
    expect(readMissionDrafts("m1", store.port)).toEqual({ predict: "draft" });
    clearMissionDrafts("m1", store.port);
    expect(readMissionDrafts("m1", store.port)).toEqual({});
  });
  it("swallows storage faults instead of losing progress", () => {
    expect(() => writeMissionDrafts("m1", { a: "1" }, hostile)).not.toThrow();
    expect(readMissionDrafts("m1", hostile)).toEqual({});
    expect(() =>
      writeMissionUi("m1", { section: "gates" }, hostile),
    ).not.toThrow();
    expect(readMissionUi("m1", hostile)).toEqual({});
  });
});

describe("ui preferences", () => {
  it("keeps only known fields", () => {
    expect(
      parseUiState('{"m1":{"section":"gates","file":"a.md","junk":9},"m2":5}'),
    ).toEqual({ m1: { section: "gates", file: "a.md" } });
    expect(parseUiState('{"m1":{"section":"nope"}}')).toEqual({});
    expect(parseUiState("nonsense")).toEqual({});
  });
  it("merges patches per mission", () => {
    const state = withMissionUi({}, "m1", { section: "read" });
    expect(withMissionUi(state, "m1", { file: "LEARN.md" }).m1).toEqual({
      section: "read",
      file: "LEARN.md",
    });
  });
  it("round-trips through storage", () => {
    const store = memory();
    writeMissionUi("m1", { section: "lab" }, store.port);
    writeMissionUi("m1", { heading: "Why it matters" }, store.port);
    expect(store.data[UI_KEY]).toContain("lab");
    expect(readMissionUi("m1", store.port)).toEqual({
      section: "lab",
      heading: "Why it matters",
    });
  });
});

describe("lesson sections", () => {
  it("keeps the lead-in and splits on h2 headings", () => {
    const { intro, sections } = splitMarkdownSections(
      "# Title\n\nLead in.\n\n## First\n\nbody one\n\n## Second\n\nbody two\n",
    );
    expect(intro).toBe("# Title\n\nLead in.");
    expect(sections.map((s) => s.heading)).toEqual(["First", "Second"]);
    expect(sections[0].body).toBe("body one");
    expect(new Set(sections.map((s) => s.id)).size).toBe(2);
  });
  it("ignores headings inside fenced code", () => {
    const { sections } = splitMarkdownSections(
      "intro\n\n## Real\n\n```sh\n## not a heading\n```\n\ntail",
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("## not a heading");
  });
  it("handles documents without headings", () => {
    const { intro, sections } = splitMarkdownSections("just text");
    expect(intro).toBe("just text");
    expect(sections).toEqual([]);
  });
  it("gives duplicate headings distinct ids", () => {
    const { sections } = splitMarkdownSections("## Same\na\n\n## Same\nb");
    expect(sections[0].id).not.toBe(sections[1].id);
  });
});
