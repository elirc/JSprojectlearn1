import type { GameProgress } from "../types";
export function downloadFile(name: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
export function SavePanel({
  progress,
  error,
  saving,
  pending,
  onLoad,
  onReset,
  onError,
}: {
  progress: GameProgress;
  error?: string;
  saving: boolean;
  pending: GameProgress | null;
  onLoad: () => Promise<void>;
  onReset: () => Promise<void>;
  onError: (message: string) => void;
}) {
  function exportOriginal() {
    try {
      const raw = localStorage.getItem("skillforge.quest.progress.v1");
      if (raw === null)
        throw new Error("There is no stored save to export yet.");
      downloadFile("skillforge-original-save.json", raw);
    } catch (e) {
      onError((e as Error).message);
    }
  }
  function exportPending() {
    if (!pending) return;
    try {
      downloadFile(
        "skillforge-pending-save.json",
        JSON.stringify(
          { exportedAt: new Date().toISOString(), progress: pending },
          null,
          2,
        ),
      );
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <section
      className={`save-panel ${error ? "save-fault" : ""}`}
      aria-label="Save status"
    >
      <div>
        <strong role="status">
          {saving
            ? "Saving progress…"
            : progress.epoch
              ? `Saved revision ${progress.revision}`
              : "No saved profile yet"}
        </strong>
        <p>Drafts stay separate until you save or submit a checkpoint.</p>
      </div>
      {error && (
        <p className="save-error" role="alert">
          {error}
        </p>
      )}
      <div className="save-actions">
        <button disabled={saving} onClick={() => void onLoad()}>
          Load current progress
        </button>
        <button disabled={saving} onClick={exportOriginal}>
          Export stored data
        </button>
        {pending && (
          <button disabled={saving} onClick={exportPending}>
            Export pending draft
          </button>
        )}
        <button disabled={saving} onClick={() => void onReset()}>
          Reset saved progress
        </button>
      </div>
    </section>
  );
}
