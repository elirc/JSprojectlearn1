import { useEffect, useMemo, useState } from "react";
import type { Catalog, GameProgress, LearningNote } from "../types";
import { createNote, deleteNote, updateNote } from "../game/notes";
export function LearningNotes({
  catalog,
  progress,
  onProgress,
  onDirty,
}: {
  catalog: Catalog;
  progress: GameProgress;
  onProgress: (value: GameProgress) => Promise<GameProgress>;
  onDirty: (dirty: boolean) => void;
}) {
  const [base, setBase] = useState<GameProgress | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [missionId, setMissionId] = useState(catalog.missions[0].id);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missions = useMemo(
    () => new Map(catalog.missions.map((m) => [m.id, m.title])),
    [catalog],
  );
  useEffect(() => () => onDirty(false), [onDirty]);
  const filtered = progress.notes
    .filter((n) =>
      (n.title + " " + n.body + " " + missions.get(n.missionId))
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  function open(note?: LearningNote) {
    setBase(progress);
    setEditing(note?.id ?? null);
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
    setMissionId(
      note?.missionId ?? progress.lastMissionId ?? catalog.missions[0].id,
    );
    setError("");
    onDirty(true);
  }
  function close() {
    setBase(null);
    setEditing(null);
    setTitle("");
    setBody("");
    onDirty(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!base) return;
    setBusy(true);
    setError("");
    try {
      const input = {
        id: editing ?? crypto.randomUUID(),
        title,
        body,
        missionId,
      };
      const candidate = editing
        ? updateNote(base, input)
        : createNote(base, input);
      await onProgress(candidate);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(note: LearningNote) {
    if (!confirm(`Delete learning note "${note.title}"?`)) return;
    setBusy(true);
    setError("");
    try {
      await onProgress(deleteNote(progress, note.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel learning-notes" aria-label="Learning notes">
      <div className="notes-heading">
        <div>
          <span className="eyebrow">YOUR ENGINEERING JOURNAL</span>
          <h2>Learning notes</h2>
          <p>
            Keep explanations, examples, and debugging evidence linked to a
            mission.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={busy || !!base}
          onClick={() => open()}
        >
          New learning note
        </button>
      </div>
      {error && (
        <p role="alert" className="save-error">
          {error}
        </p>
      )}
      <label className="notes-search">
        Search learning notes
        <input
          value={query}
          maxLength={120}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {base && (
        <form
          className="note-editor"
          onSubmit={save}
          aria-label="Learning note form"
        >
          <h3>{editing ? "Edit learning note" : "Create learning note"}</h3>
          <p>
            Editing from revision {base.revision}. A rejected save keeps these
            fields.
          </p>
          <fieldset disabled={busy}>
            <label>
              Note title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Linked mission
              <select
                value={missionId}
                onChange={(e) => setMissionId(e.target.value)}
              >
                {catalog.worlds.map((world) => (
                  <optgroup key={world.id} label={world.name}>
                    {catalog.missions
                      .filter((m) => m.worldId === world.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              Note body
              <textarea
                required
                maxLength={10000}
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="save-actions">
            <button className="primary-button" disabled={busy}>
              {busy ? "Saving note…" : "Save learning note"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Discard this unsaved note draft?")) close();
              }}
            >
              Discard note draft
            </button>
          </div>
        </form>
      )}
      {!visible.length && (
        <p className="notes-empty">
          {progress.notes.length
            ? "No learning notes match this search."
            : "No learning notes yet. Create one after your next experiment."}
        </p>
      )}
      <div className="note-cards">
        {visible.map((note) => (
          <article key={note.id} className="note-card">
            <h3>{note.title}</h3>
            <p className="muted">
              {missions.get(note.missionId)} ·{" "}
              {new Date(note.updatedAt).toLocaleString()}
            </p>
            <p className="note-preview">
              {note.body.slice(0, 260)}
              {note.body.length > 260 ? "…" : ""}
            </p>
            <details>
              <summary>Read full note</summary>
              <p className="note-body">{note.body}</p>
            </details>
            <div className="save-actions">
              <button disabled={busy || !!base} onClick={() => open(note)}>
                Edit {note.title}
              </button>
              <button
                disabled={busy || !!base}
                onClick={() => void remove(note)}
              >
                Delete {note.title}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="notes-pages">
        <span>
          {filtered.length} matching notes · Page {currentPage} of {pages}
        </span>
        <button
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          Previous notes
        </button>
        <button
          disabled={currentPage === pages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next notes
        </button>
      </div>
    </section>
  );
}
