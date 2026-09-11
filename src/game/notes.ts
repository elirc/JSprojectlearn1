import type { GameProgress, LearningNote } from "../types";
import { normalizeNote, normalizeProgress } from "./schema";
type NoteInput = Omit<LearningNote, "updatedAt">;
export function createNote(
  progress: GameProgress,
  input: NoteInput,
  now = new Date(),
): GameProgress {
  const note = normalizeNote({ ...input, updatedAt: now.toISOString() });
  if (progress.notes.some((item) => item.id === note.id))
    throw new Error("A note with this identity already exists.");
  return normalizeProgress({ ...progress, notes: [...progress.notes, note] });
}
export function updateNote(
  progress: GameProgress,
  input: NoteInput,
  now = new Date(),
): GameProgress {
  const note = normalizeNote({ ...input, updatedAt: now.toISOString() });
  if (!progress.notes.some((item) => item.id === note.id))
    throw new Error(
      "This note no longer exists. Keep its text before loading current progress.",
    );
  return normalizeProgress({
    ...progress,
    notes: progress.notes.map((item) => (item.id === note.id ? note : item)),
  });
}
export function deleteNote(progress: GameProgress, id: string): GameProgress {
  if (!progress.notes.some((item) => item.id === id))
    throw new Error("This note no longer exists.");
  return normalizeProgress({
    ...progress,
    notes: progress.notes.filter((item) => item.id !== id),
  });
}
