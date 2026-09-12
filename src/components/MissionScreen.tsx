import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  challengeKey,
  completeChallenge,
  isChallengeComplete,
  saveResponse,
} from "../game/engine";
import {
  applyMissionDrafts,
  clearMissionDrafts,
  draftsDiffer,
  missionDraftsFrom,
  readMissionDrafts,
  readMissionUi,
  writeMissionDrafts,
  writeMissionUi,
} from "../game/drafts";
import { isReference } from "../game/catalog";
import { startLab } from "../game/lab";
import { LessonReader } from "./LessonReader";
import {
  cx,
  DESKTOP_QUERY,
  isReferenceFile,
  shortPath,
  useMediaQuery,
} from "./shared";
import type { Catalog, GameProgress, Mission, MissionContent } from "../types";

type Section = "read" | "lab" | "gates";
const DEBOUNCE_MS = 400;

export function MissionScreen({
  mission,
  catalog,
  progress,
  onProgress,
  onNotice,
  onBack,
  onNext,
  onDirty,
}: {
  mission: Mission;
  catalog: Catalog;
  progress: GameProgress;
  onProgress: (p: GameProgress) => Promise<GameProgress>;
  onDirty: (dirty: boolean) => void;
  onNotice: (v: string) => void;
  onBack: () => void;
  onNext: (m: Mission) => void;
}) {
  const reference = isReference(mission);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [content, setContent] = useState<MissionContent>();
  const [contentError, setContentError] = useState<string>();
  const [contentReload, setContentReload] = useState(0);
  const [draftProgress, setDraftProgress] = useState(progress);
  const [busy, setBusy] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [activePath, setActivePath] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [openHeading, setOpenHeading] = useState<string | undefined>(
    () => readMissionUi(mission.id).heading,
  );
  const draftIds = useMemo(
    () => [...mission.challenges.map((c) => c.id), "code-lab"],
    [mission],
  );
  const completeCount = mission.challenges.filter((c) =>
    isChallengeComplete(progress, mission.id, c.id),
  ).length;

  /* ---- section switcher ---- */
  const [section, setSection] = useState<Section>(() => {
    if (reference) return "read";
    const stored = readMissionUi(mission.id).section;
    if (stored) return stored;
    const hasDrafts =
      Object.keys(readMissionDrafts(mission.id)).length > 0 ||
      Object.keys(missionDraftsFrom(progress, mission.id, draftIds)).length > 0;
    return hasDrafts || completeCount > 0 ? "gates" : "read";
  });
  const showSection = (next: Section) => {
    setSection(next);
    writeMissionUi(mission.id, { section: next });
  };

  /* ---- draft recovery (convenience store, never the source of truth) ---- */
  useEffect(() => {
    if (reference) return;
    const stored = readMissionDrafts(mission.id);
    if (!Object.keys(stored).length) return;
    if (!draftsDiffer(stored, missionDraftsFrom(progress, mission.id, draftIds)))
      return;
    setDraftProgress((current) =>
      applyMissionDrafts(current, mission.id, stored),
    );
    setRecovered(true);
    onDirty(true);
    // Runs once per mission; progress is the freshly accepted record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id]);

  const dirtyDrafts = draftsDiffer(
    missionDraftsFrom(draftProgress, mission.id, draftIds),
    missionDraftsFrom(progress, mission.id, draftIds),
  );
  useEffect(() => {
    if (reference) return;
    const drafts = missionDraftsFrom(draftProgress, mission.id, draftIds);
    const timer = setTimeout(() => {
      if (dirtyDrafts) writeMissionDrafts(mission.id, drafts);
      else clearMissionDrafts(mission.id);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftProgress, dirtyDrafts, mission.id, draftIds, reference]);

  /** Stable so the (expensive) lesson does not re-render on every keystroke. */
  const rememberHeading = useCallback(
    (heading: string | undefined) => {
      setOpenHeading(heading);
      writeMissionUi(mission.id, { heading: heading ?? "" });
    },
    [mission.id],
  );

  const updateDraft = (next: GameProgress) => {
    setDraftProgress(next);
    onDirty(true);
  };
  useEffect(() => () => onDirty(false), [onDirty]);
  const accept = (accepted: GameProgress) => {
    setDraftProgress(accepted);
    clearMissionDrafts(mission.id);
    setRecovered(false);
  };
  async function saveDrafts() {
    if (busy) return;
    setBusy(true);
    try {
      accept(await onProgress(draftProgress));
      onNotice("Mission drafts saved.");
    } catch (e) {
      onNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setContent(undefined);
    setContentError(undefined);
    fetch(`/content/${mission.contentFile}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("This mission could not be loaded.");
        return r.json();
      })
      .then((data: MissionContent) => {
        if (
          data.id !== mission.id ||
          !Array.isArray(data.files) ||
          !data.files.length
        )
          throw new Error("This mission archive is invalid.");
        setContent(data);
        const stored = readMissionUi(mission.id).file;
        const preferred =
          (stored && data.files.find((f) => f.path === stored)) ||
          data.files.find((f) => /LEARN\.md$/i.test(f.path)) ||
          data.files.find((f) => /README\.md$/i.test(f.path)) ||
          data.files[0];
        setActivePath(preferred.path);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setContentError(e.message);
      });
    return () => controller.abort();
  }, [mission, contentReload]);

  if (!content)
    return (
      <div className="page">
        <div className="mission-loading">
          {contentError || "Decrypting mission archive…"}
        </div>
        {contentError && (
          <>
            <p role="alert">{contentError}</p>
            <button onClick={() => setContentReload((v) => v + 1)}>
              Retry mission
            </button>
            <button onClick={onBack}>Back to journey</button>
          </>
        )}
      </div>
    );

  const predictionDone =
    reference || isChallengeComplete(progress, mission.id, "predict");
  const availableFiles = content.files.filter(
    (file) => predictionDone || !isReferenceFile(file),
  );
  const lockedReferences = reference
    ? 0
    : content.files.filter(isReferenceFile).length -
      availableFiles.filter(isReferenceFile).length;
  const activeFile =
    availableFiles.find((file) => file.path === activePath) ||
    availableFiles[0];
  const next = catalog.missions.find((item) =>
    item.prerequisites.includes(mission.id),
  );
  const selectFile = (path: string) => {
    setActivePath(path);
    setOpenHeading(undefined);
    writeMissionUi(mission.id, { file: path, heading: "" });
  };
  const lessonPanel = (
    <section className="lesson-panel">
      <div className="lesson-toolbar">
        <div>
          <span className="eyebrow">FIELD MANUAL</span>
          <h2>Learn only what you need</h2>
        </div>
        {lockedReferences > 0 && (
          <span className="reference-lock">
            ⌾ {lockedReferences} reference{" "}
            {lockedReferences === 1 ? "file" : "files"} gated by prediction
          </span>
        )}
      </div>
      <div className="file-tabs" role="tablist" aria-label="Mission files">
        {availableFiles.map((file) => (
          <button
            role="tab"
            aria-selected={file.path === activeFile.path}
            className={file.path === activeFile.path ? "active" : ""}
            key={file.path}
            onClick={() => selectFile(file.path)}
          >
            {shortPath(file.path)}
          </button>
        ))}
      </div>
      <LessonReader
        key={activeFile.path}
        file={activeFile}
        allOpen={desktop}
        openHeading={openHeading}
        onOpenHeading={rememberHeading}
      />
    </section>
  );

  const lab = (
    <CodeLab
      mission={mission}
      progress={draftProgress}
      onProgress={updateDraft}
      disabled={busy}
    />
  );

  const gates = (
    <aside className="challenge-rail">
      <div className="rail-heading">
        <span className="eyebrow">MISSION GATES</span>
        <h2>Earn the unlock</h2>
        <p>
          Save drafts explicitly, or submit a checkpoint to save your reasoning.
        </p>
      </div>
      {mission.challenges.map((challenge, index) => {
        const done = isChallengeComplete(progress, mission.id, challenge.id);
        const key = challengeKey(mission.id, challenge.id);
        const response = draftProgress.responses[key] || "";
        return (
          <section
            className={cx("challenge-card", done && "done")}
            key={challenge.id}
          >
            <header>
              <span>{done ? "✓" : index + 1}</span>
              <div>
                <small>{challenge.kind}</small>
                <h3>{challenge.title}</h3>
              </div>
              <b>+{challenge.xp} XP</b>
            </header>
            <p>{challenge.prompt}</p>
            {hint === challenge.id && (
              <div className="hint">◇ {challenge.hint}</div>
            )}
            <button
              className="hint-button"
              onClick={() =>
                setHint(hint === challenge.id ? undefined : challenge.id)
              }
            >
              {hint === challenge.id ? "Hide hint" : "Need a nudge?"}
            </button>
            <textarea
              value={response}
              disabled={done || busy}
              maxLength={100000}
              onChange={(event) =>
                updateDraft(
                  saveResponse(
                    draftProgress,
                    mission.id,
                    challenge.id,
                    event.target.value,
                  ),
                )
              }
              placeholder={
                challenge.kind === "evidence"
                  ? "Record command, result, failure evidence, and tradeoff…"
                  : "Write from memory before reopening the reference…"
              }
            />
            <div className="challenge-footer">
              <span
                className={
                  response.trim().length >= challenge.minLength ? "ready" : ""
                }
              >
                {response.trim().length}/{challenge.minLength}
              </span>
              <button
                disabled={
                  done || busy || response.trim().length < challenge.minLength
                }
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  try {
                    const updated = completeChallenge(
                      draftProgress,
                      mission,
                      challenge,
                    );
                    const accepted = await onProgress(updated);
                    accept(accepted);
                    onNotice(
                      updated.completedMissions.includes(mission.id) &&
                        !progress.completedMissions.includes(mission.id)
                        ? "Mission cleared. The next node is unlocked."
                        : "Checkpoint secured.",
                    );
                  } catch (error) {
                    onNotice((error as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {done ? "Secured" : "Submit proof"}
              </button>
            </div>
          </section>
        );
      })}
      {completeCount === 3 && next && (
        <button className="primary-button wide" onClick={() => onNext(next)}>
          Enter unlocked mission →
        </button>
      )}
    </aside>
  );

  const tabs: { id: Section; label: string }[] = [
    { id: "read", label: "Read" },
    { id: "lab", label: "Lab" },
    { id: "gates", label: "Gates" },
  ];
  return (
    <div className={cx("page", "mission-page", reference && "reference-page")}>
      <button className="back-button" onClick={onBack}>
        ← Mission map
      </button>
      <section className="mission-header">
        <div>
          <span className="eyebrow">
            {catalog.worlds.find((w) => w.id === mission.worldId)?.name} /{" "}
            {reference
              ? "REFERENCE"
              : `MISSION ${String(mission.order).padStart(2, "0")}`}
          </span>
          <h1>{mission.title}</h1>
          <p>{mission.summary}</p>
          <div className="concept-row">
            {mission.concepts.slice(0, 5).map((concept) => (
              <span key={concept}>{concept}</span>
            ))}
          </div>
        </div>
        {!reference && (
          <div className="mission-score">
            <strong>{completeCount}/3</strong>
            <span>gates cleared</span>
            <div>
              {"◆".repeat(mission.difficulty)}
              {"◇".repeat(5 - mission.difficulty)}
            </div>
          </div>
        )}
      </section>
      {!reference && (
        <div
          className="section-switcher"
          role="tablist"
          aria-label="Mission sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-label={tab.label}
              aria-selected={section === tab.id}
              className={cx(section === tab.id && "active")}
              onClick={() => showSection(tab.id)}
            >
              {tab.label}
              {tab.id === "gates" && <i>{completeCount}/3</i>}
            </button>
          ))}
        </div>
      )}
      {recovered && (
        <p className="draft-recovered" role="status">
          Recovered unsaved drafts from this device.
        </p>
      )}
      {desktop || reference ? (
        <div className={cx("mission-layout", reference && "single")}>
          <div className="lesson-column">
            {lessonPanel}
            {!reference && lab}
          </div>
          {!reference && gates}
        </div>
      ) : (
        <div className="mission-layout single">
          {section === "read" && lessonPanel}
          {section === "lab" && lab}
          {section === "gates" && gates}
        </div>
      )}
      {reference && (
        <button className="ghost-button back-to-map" onClick={onBack}>
          Back to map
        </button>
      )}
      {!reference && dirtyDrafts && (
        <div
          className="mission-draft-bar"
          role="region"
          aria-label="Unsaved drafts"
        >
          <div>
            <strong>Unsaved drafts</strong>
            <p>Checkpoints are self-reported.</p>
          </div>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => void saveDrafts()}
          >
            {busy ? "Saving…" : "Save mission drafts"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CodeLab({
  mission,
  progress,
  onProgress,
  disabled = false,
}: {
  mission: Mission;
  progress: GameProgress;
  onProgress: (progress: GameProgress) => void;
  disabled?: boolean;
}) {
  const saved = progress.responses[challengeKey(mission.id, "code-lab")];
  const starter = `// ${mission.title}\n// Make a small claim, then test it.\nconsole.assert(2 + 2 === 4, "Addition should work");\nconsole.log("Experiment complete");`;
  const code = saved ?? starter;
  const [output, setOutput] = useState("Run the lab to see output.");
  const [running, setRunning] = useState(false);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);
  const run = () => {
    cancel.current?.();
    setRunning(true);
    cancel.current = startLab(code, (result) => {
      setRunning(false);
      setOutput(
        `${result.ok ? "COMPLETED" : "ERROR"}\n${result.lines.join("\n") || "(no output)"}`,
      );
    });
  };
  return (
    <section className="code-lab">
      <div className="code-lab-heading">
        <div>
          <span className="eyebrow">ACTIVE LAB</span>
          <h3>Test the idea in JavaScript</h3>
          <p>
            Scratch code stays in this mission's draft until you save it. Include
            assertions and edge cases; a completed run alone does not prove
            correctness.
          </p>
        </div>
        <button onClick={run} disabled={running || disabled}>
          {running ? "Running…" : "Run code ▶"}
        </button>
      </div>
      <div className="code-lab-grid">
        <textarea
          aria-label="JavaScript scratch lab"
          spellCheck={false}
          disabled={disabled}
          maxLength={100000}
          value={code}
          onChange={(event) =>
            onProgress(
              saveResponse(
                progress,
                mission.id,
                "code-lab",
                event.target.value,
              ),
            )
          }
        />
        <pre aria-live="polite">{output}</pre>
      </div>
    </section>
  );
}
