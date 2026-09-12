import { challengeKey } from "./engine";
import type { GameProgress } from "../types";

/**
 * Draft recovery and UI preferences are *conveniences stored beside* the save
 * document. They are never exported, never imported, never validated against the
 * catalog, and every storage access is wrapped in try/catch: losing them must
 * never lose or corrupt accepted progress.
 */
export const DRAFTS_KEY = "skillforge.quest.drafts.v1";
export const UI_KEY = "skillforge.quest.ui.v1";

/** challengeId -> draft text (the scratch lab uses the id "code-lab"). */
export type MissionDrafts = Record<string, string>;
/** missionId -> that mission's drafts. */
export type DraftStore = Record<string, MissionDrafts>;

export interface MissionUiState {
  section?: "read" | "lab" | "gates";
  file?: string;
  heading?: string;
}
export type UiState = Record<string, MissionUiState>;

export type ReadPort = Pick<Storage, "getItem">;
export type WritePort = Pick<Storage, "getItem" | "setItem">;

const isRecordOfStrings = (value: unknown): value is MissionDrafts =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(
    (entry) => typeof entry === "string",
  );

/** Collect the drafts this mission owns out of a progress document. */
export function missionDraftsFrom(
  progress: GameProgress,
  missionId: string,
  challengeIds: string[],
): MissionDrafts {
  const drafts: MissionDrafts = {};
  for (const id of challengeIds) {
    const value = progress.responses[challengeKey(missionId, id)];
    if (typeof value === "string" && value.length) drafts[id] = value;
  }
  return drafts;
}

/** True when two draft sets differ in any key or value. */
export function draftsDiffer(a: MissionDrafts, b: MissionDrafts): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] ?? "") !== (b[key] ?? "")) return true;
  return false;
}

/** Merge recovered drafts back into a progress document (pure). */
export function applyMissionDrafts(
  progress: GameProgress,
  missionId: string,
  drafts: MissionDrafts,
): GameProgress {
  const responses = { ...progress.responses };
  for (const [id, text] of Object.entries(drafts))
    if (typeof text === "string") responses[challengeKey(missionId, id)] = text;
  return { ...progress, responses };
}

/** Parse a stored draft store, discarding anything that is not well formed. */
export function parseDraftStore(raw: string | null): DraftStore {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const store: DraftStore = {};
  for (const [missionId, drafts] of Object.entries(
    parsed as Record<string, unknown>,
  ))
    if (isRecordOfStrings(drafts)) store[missionId] = drafts;
  return store;
}

/** Set (or, when empty, remove) one mission's entry in the store (pure). */
export function withMissionDrafts(
  store: DraftStore,
  missionId: string,
  drafts: MissionDrafts,
): DraftStore {
  const next = { ...store };
  if (Object.keys(drafts).length === 0) delete next[missionId];
  else next[missionId] = { ...drafts };
  return next;
}

export function parseUiState(raw: string | null): UiState {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const state: UiState = {};
  for (const [missionId, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const next: MissionUiState = {};
    if (
      entry.section === "read" ||
      entry.section === "lab" ||
      entry.section === "gates"
    )
      next.section = entry.section;
    if (typeof entry.file === "string") next.file = entry.file;
    if (typeof entry.heading === "string") next.heading = entry.heading;
    if (Object.keys(next).length) state[missionId] = next;
  }
  return state;
}

export function withMissionUi(
  state: UiState,
  missionId: string,
  patch: MissionUiState,
): UiState {
  return { ...state, [missionId]: { ...state[missionId], ...patch } };
}

/* ---- storage wrappers: every access swallows errors ---- */

function safeRead(key: string, storage?: ReadPort): string | null {
  try {
    return (storage ?? localStorage).getItem(key);
  } catch {
    return null;
  }
}
function safeWrite(key: string, value: string, storage?: WritePort): void {
  try {
    (storage ?? localStorage).setItem(key, value);
  } catch {
    /* drafts are a convenience, never a source of truth */
  }
}

export function readDraftStore(storage?: ReadPort): DraftStore {
  return parseDraftStore(safeRead(DRAFTS_KEY, storage));
}
export function readMissionDrafts(
  missionId: string,
  storage?: ReadPort,
): MissionDrafts {
  return readDraftStore(storage)[missionId] ?? {};
}
export function writeMissionDrafts(
  missionId: string,
  drafts: MissionDrafts,
  storage?: WritePort,
): void {
  const next = withMissionDrafts(readDraftStore(storage), missionId, drafts);
  if (Object.keys(next).length === 0) {
    safeWrite(DRAFTS_KEY, "{}", storage);
    return;
  }
  safeWrite(DRAFTS_KEY, JSON.stringify(next), storage);
}
export function clearMissionDrafts(missionId: string, storage?: WritePort) {
  writeMissionDrafts(missionId, {}, storage);
}

export function readUiState(storage?: ReadPort): UiState {
  return parseUiState(safeRead(UI_KEY, storage));
}
export function readMissionUi(
  missionId: string,
  storage?: ReadPort,
): MissionUiState {
  return readUiState(storage)[missionId] ?? {};
}
export function writeMissionUi(
  missionId: string,
  patch: MissionUiState,
  storage?: WritePort,
): void {
  safeWrite(
    UI_KEY,
    JSON.stringify(withMissionUi(readUiState(storage), missionId, patch)),
    storage,
  );
}
