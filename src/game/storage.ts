import { createProgress } from "./engine";
import { boundedJson, normalizeProgress, object, parseJson } from "./schema";
import type { GameProgress } from "../types";
export const STORAGE_KEY = "skillforge.quest.progress.v1";
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export type LockPort = <T>(work: () => T | Promise<T>) => Promise<T>;
export const browserLock: LockPort = (work) => {
  if (!navigator.locks)
    throw new Error(
      "This browser cannot coordinate saves. Use a browser with Web Locks on localhost or HTTPS.",
    );
  return navigator.locks.request(STORAGE_KEY, work);
};
export function loadProgress(
  storage: StoragePort = localStorage,
): GameProgress {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? createProgress() : normalizeProgress(parseJson(raw));
}
export async function persistProgress(
  progress: GameProgress,
  storage: StoragePort = localStorage,
  lock: LockPort = browserLock,
): Promise<GameProgress> {
  const proposal = normalizeProgress(progress);
  return lock(() => {
    const current = loadProgress(storage);
    if (
      proposal.revision !== current.revision ||
      proposal.epoch !== current.epoch
    )
      throw new Error(
        "Progress changed in another tab. Export your pending draft or copy its text, then load current progress before retrying.",
      );
    if (current.revision === Number.MAX_SAFE_INTEGER)
      throw new Error("Save revision is exhausted. Export for recovery.");
    const accepted = {
      ...proposal,
      revision: current.revision + 1,
      epoch: current.epoch || crypto.randomUUID(),
    };
    storage.setItem(STORAGE_KEY, boundedJson(accepted));
    return accepted;
  });
}
export function serializeProgress(progress: GameProgress): string {
  return boundedJson({
    exportedAt: new Date().toISOString(),
    progress: normalizeProgress(progress),
  });
}
export function parseProgressExport(value: string): GameProgress {
  const parsed = object(parseJson(value), ["exportedAt", "progress"]);
  return normalizeProgress(parsed.progress);
}
export async function resetProgress(
  expectedRaw: string | null,
  storage: StoragePort = localStorage,
  lock: LockPort = browserLock,
): Promise<GameProgress> {
  return lock(() => {
    if (storage.getItem(STORAGE_KEY) !== expectedRaw)
      throw new Error(
        "Saved data changed while recovery was open. Export and review the current data first.",
      );
    const next = { ...createProgress(), epoch: crypto.randomUUID() };
    storage.setItem(STORAGE_KEY, boundedJson(next));
    return next;
  });
}
