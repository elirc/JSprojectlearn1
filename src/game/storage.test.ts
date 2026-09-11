import { describe, it, expect } from "vitest";
import { createProgress } from "./engine";
import {
  normalizeProgress,
  parseJson,
  validateAgainstCatalog,
  MAX_SAVE_BYTES,
} from "./schema";
import { createNote, updateNote, deleteNote } from "./notes";
import {
  loadProgress,
  persistProgress,
  resetProgress,
  serializeProgress,
  parseProgressExport,
  STORAGE_KEY,
} from "./storage";
import type { LockPort, StoragePort } from "./storage";
import type { Catalog } from "../types";
function fixture(raw: string | null = null) {
  let value = raw;
  return {
    storage: {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next;
      },
    } as StoragePort,
    raw: () => value,
  };
}
function queue(): LockPort {
  let tail: Promise<unknown> = Promise.resolve();
  return (work) => {
    const result = tail.then(work);
    tail = result.catch(() => undefined);
    return result;
  };
}
const note = {
  id: "note-one",
  missionId: "m1",
  title: "Transactions",
  body: "Commit the worker and audit together.",
};
const now = new Date("2026-01-01T00:00:00.000Z");
it("reads absent storage without writing defaults", () => {
  const f = fixture();
  expect(loadProgress(f.storage)).toEqual(createProgress());
  expect(f.raw()).toBeNull();
});
it("fills legacy revision epoch and notes without erasing existing progress", () => {
  const legacy = { ...createProgress(), callsign: "Learner", onboarded: true };
  const { revision, epoch, notes, ...raw } = legacy;
  void revision;
  void epoch;
  void notes;
  const f = fixture(JSON.stringify(raw));
  const read = loadProgress(f.storage);
  expect(read.revision).toBe(0);
  expect(read.epoch).toBe("");
  expect(read.notes).toEqual([]);
  expect(read.callsign).toBe("Learner");
  expect(f.raw()).toBe(JSON.stringify(raw));
});
it.each([
  "{broken",
  '{"version":2}',
  JSON.stringify({ ...createProgress(), reviews: [] }),
  JSON.stringify({ ...createProgress(), onboarded: "yes" }),
])("preserves corrupt or unsupported saved bytes %s", (raw) => {
  const f = fixture(raw);
  expect(() => loadProgress(f.storage)).toThrow();
  expect(f.raw()).toBe(raw);
});
it.each([
  { xp: NaN },
  { xp: -1 },
  { sessionMinutes: 25 },
  { callsign: "x".repeat(25) },
  { completedMissions: ["m1", "m1"] },
  { responses: { "bad-key": "text" } },
  { activityDates: ["2026-02-30"] },
  { notes: [{ ...note, updatedAt: "bad" }] },
  { extra: "unsupported" },
])("rejects malformed nested values %j", (patch) => {
  expect(() => normalizeProgress({ ...createProgress(), ...patch })).toThrow();
});
it("rejects prototype-shaped JSON keys and oversized transport", () => {
  expect(() =>
    normalizeProgress(
      JSON.parse('{"version":1,"responses":{"__proto__":"bad"}}'),
    ),
  ).toThrow();
  expect(() => parseJson(" ".repeat(MAX_SAVE_BYTES + 1))).toThrow(/limit/);
});
it("accepts a save only after its storage write and returns detached normalized data", async () => {
  const f = fixture();
  const candidate = {
    ...createProgress(),
    callsign: "Learner",
    onboarded: true,
  };
  const accepted = await persistProgress(candidate, f.storage, queue());
  expect(candidate.revision).toBe(0);
  expect(accepted.revision).toBe(1);
  expect(accepted.epoch).not.toBe("");
  expect(loadProgress(f.storage)).toEqual(accepted);
});
it("rejects competing same-revision saves with one accepted winner", async () => {
  const f = fixture();
  const lock = queue();
  const a = { ...createProgress(), callsign: "First" };
  const b = { ...createProgress(), callsign: "Second" };
  const results = await Promise.allSettled([
    persistProgress(a, f.storage, lock),
    persistProgress(b, f.storage, lock),
  ]);
  expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
  expect(loadProgress(f.storage).callsign).toBe("First");
  expect(loadProgress(f.storage).revision).toBe(1);
});
it("leaves storage and proposal unchanged after quota rejection", async () => {
  const original = JSON.stringify(createProgress());
  const f = fixture(original);
  f.storage.setItem = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };
  const proposal = { ...createProgress(), callsign: "Pending" };
  await expect(persistProgress(proposal, f.storage, queue())).rejects.toThrow(
    /Quota/,
  );
  expect(f.raw()).toBe(original);
  expect(proposal.revision).toBe(0);
});
it("reset checks exact raw data and changes identity so old tabs cannot resurrect drafts", async () => {
  const f = fixture();
  const lock = queue();
  const initial = await persistProgress(
    { ...createProgress(), callsign: "Old" },
    f.storage,
    lock,
  );
  const before = f.raw();
  f.storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...initial, callsign: "Newer" }),
  );
  await expect(resetProgress(before, f.storage, lock)).rejects.toThrow(
    /changed/,
  );
  const reset = await resetProgress(f.raw(), f.storage, lock);
  expect(reset.epoch).not.toBe(initial.epoch);
  await expect(persistProgress(initial, f.storage, lock)).rejects.toThrow(
    /another tab/,
  );
  expect(loadProgress(f.storage).callsign).toBe("");
});
it("exports and validates imported notes without trusting transport metadata", () => {
  const data = createNote(createProgress(), note, now);
  expect(parseProgressExport(serializeProgress(data))).toEqual(data);
  expect(() =>
    parseProgressExport(JSON.stringify({ progress: data, unexpected: true })),
  ).toThrow();
});
it("creates edits and deletes notes without mutating their previous snapshot", () => {
  const start = createProgress();
  const one = createNote(start, note, now);
  const two = updateNote(
    one,
    { ...note, title: "Atomic transactions" },
    new Date("2026-01-02T00:00:00Z"),
  );
  expect(one.notes[0].title).toBe("Transactions");
  expect(two.notes[0].id).toBe(one.notes[0].id);
  expect(two.notes[0].updatedAt).not.toBe(one.notes[0].updatedAt);
  expect(deleteNote(two, note.id).notes).toEqual([]);
  expect(start.notes).toEqual([]);
});
it("rejects duplicate or missing note identities and blank note content", () => {
  const one = createNote(createProgress(), note, now);
  expect(() => createNote(one, note, now)).toThrow(/already exists/);
  expect(() => updateNote(one, { ...note, id: "absent" }, now)).toThrow(
    /no longer/,
  );
  expect(() => deleteNote(one, "absent")).toThrow(/no longer/);
  expect(() =>
    createNote(createProgress(), { ...note, body: " " }, now),
  ).toThrow();
});
describe("catalog integrity for imported progress", () => {
  const catalog = {
    missions: [
      {
        id: "m1",
        prerequisites: [],
        challenges: [{ id: "prove", minLength: 3 }],
      },
      {
        id: "m2",
        prerequisites: ["m1"],
        challenges: [{ id: "prove", minLength: 3 }],
      },
    ],
  } as unknown as Catalog;
  it("rejects unknown notes and checkpoint claims without prerequisites/evidence", () => {
    expect(() =>
      validateAgainstCatalog(
        createNote(createProgress(), { ...note, missionId: "missing" }, now),
        catalog,
      ),
    ).toThrow();
    expect(() =>
      validateAgainstCatalog(
        {
          ...createProgress(),
          completedChallenges: ["m2::prove"],
          responses: { "m2::prove": "evidence" },
        },
        catalog,
      ),
    ).toThrow(/prerequisites/);
    expect(() =>
      validateAgainstCatalog(
        { ...createProgress(), completedMissions: ["m1"] },
        catalog,
      ),
    ).toThrow(/incomplete/);
  });
  it("accepts known mission notes and valid completion records", () => {
    const progress = createNote(
      {
        ...createProgress(),
        completedMissions: ["m1"],
        completedChallenges: ["m1::prove"],
        responses: { "m1::prove": "evidence" },
      },
      note,
      now,
    );
    expect(validateAgainstCatalog(progress, catalog)).toBe(progress);
  });
});
