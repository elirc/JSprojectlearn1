import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  createProgress,
  dueMissionIds,
  earnedBadges,
  isChallengeComplete,
  isMissionUnlocked,
  levelFromXp,
  levelProgress,
  reviewMission,
  saveResponse,
  streakFromDates,
} from "./game/engine";
import {
  completedInWorld,
  completedMissionCount,
  gatedMissions,
  isReference,
  missionsOfWorld,
  totalGateCount,
} from "./game/catalog";
import {
  loadProgress,
  parseProgressExport,
  persistProgress,
  serializeProgress,
  resetProgress,
  STORAGE_KEY,
} from "./game/storage";
import type { Catalog, GameProgress, Mission, ReviewRating } from "./types";

import { validateAgainstCatalog, MAX_SAVE_BYTES } from "./game/schema";
import { SavePanel } from "./components/SavePanel";
import { LearningNotes } from "./components/LearningNotes";
import { Dashboard } from "./components/Dashboard";
import { MissionScreen } from "./components/MissionScreen";
import { cx } from "./components/shared";

type View = "home" | "journey" | "reviews" | "profile" | "mission";

function App() {
  const [initial] = useState(() => {
    try {
      return {
        progress: loadProgress(),
        error: undefined as string | undefined,
      };
    } catch (error) {
      return { progress: createProgress(), error: (error as Error).message };
    }
  });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string>();
  const [catalogReload, setCatalogReload] = useState(0);
  const [progress, setProgress] = useState<GameProgress>(initial.progress);
  const [saveError, setSaveError] = useState<string | undefined>(initial.error);
  const [recoveryRequired, setRecoveryRequired] = useState(!!initial.error);
  const [pending, setPending] = useState<GameProgress | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const [view, setView] = useState<View>("home");
  const [selectedWorld, setSelectedWorld] = useState("foundations");
  const [selectedMissionId, setSelectedMissionId] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(undefined);
    fetch("/content/catalog.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Mission catalog could not be loaded.");
        return r.json();
      })
      .then((value: Catalog) => {
        if (
          !value ||
          !Array.isArray(value.missions) ||
          !value.missions.length ||
          !Array.isArray(value.worlds)
        )
          throw new Error("Mission catalog is invalid.");
        setCatalog(value);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCatalogError(e.message);
      });
    return () => controller.abort();
  }, [catalogReload]);
  useEffect(() => {
    if (!catalog) return;
    try {
      validateAgainstCatalog(progress, catalog);
    } catch (e) {
      setSaveError((e as Error).message);
      setRecoveryRequired(true);
    }
  }, [catalog, progress]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        setSaveError(
          "Another tab changed saved progress. Your displayed data and drafts were kept. Load current progress to review the change.",
        );
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 4200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (saveError || pending) setBannerDismissed(false);
  }, [saveError, pending]);
  async function commitProgress(proposal: GameProgress): Promise<GameProgress> {
    if (inFlight.current)
      throw new Error(
        "A save is already running. Your draft is still here; try again after it finishes.",
      );
    inFlight.current = true;
    setSaving(true);
    try {
      if (!catalog) throw new Error("Load the mission catalog before saving.");
      validateAgainstCatalog(proposal, catalog);
      const accepted = await persistProgress(proposal);
      setProgress(accepted);
      setPending(null);
      setSaveError(undefined);
      setDirty(false);
      return accepted;
    } catch (e) {
      setPending(proposal);
      setSaveError((e as Error).message);
      throw e;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  function replaceView(next: GameProgress) {
    setProgress(next);
    setRecoveryRequired(false);
    setPending(null);
    setSaveError(undefined);
    setDirty(false);
    setWorkspaceKey((v) => v + 1);
  }
  async function loadCurrent() {
    if (
      !confirm(
        "Load the saved progress and discard open drafts? Export pending data or copy any text you want to keep first.",
      )
    )
      return;
    try {
      const next = loadProgress();
      if (catalog) validateAgainstCatalog(next, catalog);
      replaceView(next);
      setView("home");
      setSelectedMissionId(undefined);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }
  async function resetSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (
        !confirm(
          "Reset all saved progress, answers, reviews and learning notes in this browser? Export a backup first.",
        )
      )
        return;
      replaceView(await resetProgress(raw));
      setView("home");
      setSelectedMissionId(undefined);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }
  const savePanel = (
    <SavePanel
      progress={progress}
      error={saveError}
      saving={saving}
      pending={pending}
      onLoad={loadCurrent}
      onReset={resetSaved}
      onError={setSaveError}
    />
  );
  const selectedMission = catalog?.missions.find(
    (m) => m.id === selectedMissionId,
  );
  function canLeave() {
    if (inFlight.current) {
      setNotice("Wait for the current save to finish.");
      return false;
    }
    if (
      dirty &&
      !confirm(
        "Leave this view and discard unsaved drafts? Save or copy them first.",
      )
    )
      return false;
    setDirty(false);
    return true;
  }
  const openMission = (mission: Mission) => {
    if (!isMissionUnlocked(mission, progress) || !canLeave()) return;
    setSelectedMissionId(mission.id);
    setSelectedWorld(mission.worldId);
    setView("mission");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const navigate = (next: View) => {
    if (!canLeave()) return;
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (recoveryRequired)
    return (
      <main className="save-recovery">
        <h1>Recover your saved progress</h1>
        <p>
          The original data has not been replaced. Export it before choosing a
          reset.
        </p>
        {savePanel}
      </main>
    );
  if (!catalog)
    return (
      <>
        <div className="startup-save">{savePanel}</div>
        <LoadingScreen
          message={catalogError}
          onRetry={() => setCatalogReload((v) => v + 1)}
        />
      </>
    );
  if (!progress.onboarded)
    return (
      <>
        <div className="startup-save">{savePanel}</div>
        <Onboarding
          key={workspaceKey}
          catalog={catalog}
          progress={progress}
          onFinish={commitProgress}
          onDirty={setDirty}
        />
      </>
    );
  const showBanner =
    view !== "profile" && !bannerDismissed && (!!saveError || !!pending);
  return (
    <div className="app-shell" key={workspaceKey}>
      <Sidebar
        view={view}
        catalog={catalog}
        progress={progress}
        onNavigate={navigate}
      />
      <main className="main-shell">
        <Topbar progress={progress} catalog={catalog} saving={saving} />
        {showBanner && (
          <div className="save-banner" role="alert">
            <p>{saveError || "A draft could not be saved yet."}</p>
            <button
              className="ghost-button"
              onClick={() => navigate("profile")}
            >
              Open saves
            </button>
            <button
              className="banner-dismiss"
              aria-label="Dismiss save notice"
              onClick={() => setBannerDismissed(true)}
            >
              ✕
            </button>
          </div>
        )}
        {view === "home" && (
          <Dashboard
            catalog={catalog}
            progress={progress}
            onMission={openMission}
            onJourney={() => navigate("journey")}
            onReviews={() => navigate("reviews")}
          />
        )}
        {view === "journey" && (
          <Journey
            catalog={catalog}
            progress={progress}
            selectedWorld={selectedWorld}
            onWorld={setSelectedWorld}
            onMission={openMission}
          />
        )}
        {view === "reviews" && (
          <Reviews
            catalog={catalog}
            progress={progress}
            onProgress={commitProgress}
            onNotice={setNotice}
            onDirty={setDirty}
          />
        )}
        {view === "profile" && (
          <Profile
            catalog={catalog}
            progress={progress}
            onProgress={commitProgress}
            onNotice={setNotice}
            onDirty={setDirty}
            savePanel={savePanel}
            onImported={() => {
              setDirty(false);
              setWorkspaceKey((v) => v + 1);
            }}
          />
        )}
        {view === "mission" && selectedMission && (
          <MissionScreen
            key={selectedMission.id}
            mission={selectedMission}
            catalog={catalog}
            progress={progress}
            onProgress={commitProgress}
            onNotice={setNotice}
            onBack={() => navigate("journey")}
            onNext={openMission}
            onDirty={setDirty}
          />
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}

function LoadingScreen({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="loading-screen">
      <div className="brand-mark">SF</div>
      <div className="loading-bar">
        <span />
      </div>
      <p>{message || "Forging your mission map…"}</p>
      {message && <button onClick={onRetry}>Retry catalog</button>}
    </div>
  );
}

function Onboarding({
  catalog,
  progress,
  onFinish,
  onDirty,
}: {
  catalog: Catalog;
  progress: GameProgress;
  onFinish: (value: GameProgress) => Promise<GameProgress>;
  onDirty: (dirty: boolean) => void;
}) {
  const [callsign, setCallsign] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="onboarding">
      <div className="onboarding-copy">
        <span className="eyebrow">WELCOME, ENGINEER</span>
        <h1>
          Stop reading.
          <br />
          <em>Start shipping.</em>
        </h1>
        <p>
          Every lesson is now a mission. Explain the idea, predict the behavior,
          then build proof before the next node unlocks.
        </p>
        <div className="onboarding-stats">
          <span>
            <strong>{gatedMissions(catalog).length}</strong> missions
          </span>
          <span>
            <strong>{totalGateCount(catalog)}</strong> challenge gates
          </span>
          <span>
            <strong>{catalog.sourceFileCount}</strong> archived sources
          </span>
        </div>
      </div>
      <form
        className="onboarding-card"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!callsign.trim() || busy) return;
          setBusy(true);
          setError("");
          try {
            await onFinish({
              ...progress,
              callsign: callsign.trim(),
              sessionMinutes: minutes,
              onboarded: true,
            });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="brand-lockup">
          <div className="brand-mark">SF</div>
          <div>
            <b>SKILLFORGE</b>
            <small>QUEST</small>
          </div>
        </div>
        <h2>Create your learner profile</h2>
        {error && <p role="alert">{error}</p>}
        <label>
          Callsign
          <input
            autoFocus
            value={callsign}
            onChange={(event) => {
              setCallsign(event.target.value);
              onDirty(true);
            }}
            placeholder="e.g. async_smith"
            maxLength={24}
          />
        </label>
        <fieldset>
          <legend>Typical focus block</legend>
          <div className="choice-row">
            {[15, 30, 45, 60].map((value) => (
              <button
                className={minutes === value ? "selected" : ""}
                type="button"
                key={value}
                onClick={() => {
                  setMinutes(value);
                  onDirty(true);
                }}
              >
                {value}m
              </button>
            ))}
          </div>
        </fieldset>
        <div className="oath">
          <span>◆</span>
          <p>
            I will earn progress with predictions, working evidence, and honest
            reviews—not passive completion.
          </p>
        </div>
        <button
          className="primary-button wide"
          disabled={busy || !callsign.trim()}
        >
          Enter the frontier <span>→</span>
        </button>
      </form>
    </div>
  );
}

function Sidebar({
  view,
  catalog,
  progress,
  onNavigate,
}: {
  view: View;
  catalog: Catalog;
  progress: GameProgress;
  onNavigate: (view: View) => void;
}) {
  const due = dueMissionIds(progress).length;
  const nav: { id: View; label: string; glyph: string }[] = [
    { id: "home", label: "Command deck", glyph: "⌂" },
    { id: "journey", label: "Mission map", glyph: "⌁" },
    { id: "reviews", label: "Memory forge", glyph: "↻" },
    { id: "profile", label: "Loadout & saves", glyph: "◇" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">SF</div>
        <div>
          <b>SKILLFORGE</b>
          <small>QUEST</small>
        </div>
      </div>
      <nav aria-label="Primary">
        {nav.map((item) => (
          <button
            key={item.id}
            className={cx("nav-item", view === item.id && "active")}
            onClick={() => onNavigate(item.id)}
          >
            <span aria-hidden="true">{item.glyph}</span>
            <em>{item.label}</em>
            {item.id === "reviews" && due > 0 && <i>{due}</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-worlds">
        <span className="mini-label">THE FRONTIER</span>
        {catalog.worlds.map((world) => (
          <div key={world.id} className="mini-world">
            <span className={`world-dot ${world.color}`} />
            {world.name}
            <small>
              {completedInWorld(progress, catalog, world.id)}/
              {missionsOfWorld(catalog, world.id).length}
            </small>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <span>Archive integrity</span>
        <strong>
          <i className="status-dot" /> {catalog.sourceFileCount} sources secured
        </strong>
      </div>
    </aside>
  );
}

function Topbar({
  progress,
  catalog,
  saving,
}: {
  progress: GameProgress;
  catalog: Catalog;
  saving: boolean;
}) {
  const level = levelFromXp(progress.xp);
  const bar = levelProgress(progress.xp);
  const streak = streakFromDates(progress.activityDates);
  const due = dueMissionIds(progress).length;
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">OPERATOR</span>
        <strong>{progress.callsign}</strong>
      </div>
      <div className="top-stats">
        <div className="level-pill">
          <span>LVL {level}</span>
          <div className="tiny-progress">
            <i style={{ width: `${bar.percent}%` }} />
          </div>
          <small>
            {bar.current}/{bar.required} XP
          </small>
        </div>
        <div className="stat-pill">
          <span aria-hidden="true">◆</span>
          <b>{progress.xp.toLocaleString()}</b>
          <small>XP</small>
        </div>
        <div className="stat-pill">
          <span aria-hidden="true">↻</span>
          <b>{due}</b>
          <small>DUE</small>
        </div>
        <div className="stat-pill flame">
          <span aria-hidden="true">▲</span>
          <b>{streak}</b>
          <small>STREAK</small>
        </div>
      </div>
      <div className="catalog-count">
        <span className="save-chip" role="status">
          {saving
            ? "Saving progress…"
            : progress.epoch
              ? `Saved revision ${progress.revision}`
              : "No saved profile yet"}
        </span>
        <small>{gatedMissions(catalog).length} missions</small>
      </div>
    </header>
  );
}

function Journey({
  catalog,
  progress,
  selectedWorld,
  onWorld,
  onMission,
}: {
  catalog: Catalog;
  progress: GameProgress;
  selectedWorld: string;
  onWorld: (id: string) => void;
  onMission: (mission: Mission) => void;
}) {
  const world =
    catalog.worlds.find((item) => item.id === selectedWorld) ||
    catalog.worlds[0];
  const missions = catalog.missions.filter(
    (mission) => mission.worldId === world.id,
  );
  const activeTab = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Centre the active world tab inside its own strip. Setting scrollLeft
    // keeps this off the page scroll (scrollIntoView would inherit the
    // document's smooth scrolling and move the whole view).
    const tab = activeTab.current;
    const strip = tab?.parentElement;
    if (!tab || !strip) return;
    strip.scrollLeft = Math.max(
      0,
      tab.offsetLeft - (strip.clientWidth - tab.clientWidth) / 2,
    );
  }, [selectedWorld]);
  return (
    <div className="page">
      <section className="page-intro">
        <span className="eyebrow">MISSION CONTROL</span>
        <h1>Choose your next challenge.</h1>
        <p>
          Nodes unlock only when the prior mission’s recall, prediction, and
          evidence gates are complete.
        </p>
      </section>
      <div className="world-tabs" role="tablist" aria-label="Worlds">
        {catalog.worlds.map((item) => (
          <button
            role="tab"
            ref={item.id === world.id ? activeTab : undefined}
            aria-selected={item.id === world.id}
            className={cx(item.id === world.id && "active")}
            key={item.id}
            onClick={() => onWorld(item.id)}
          >
            <span className={`world-dot ${item.color}`} />
            {item.name}
          </button>
        ))}
      </div>
      <section className={`world-banner ${world.color}`}>
        <div className="world-icon large">{world.icon}</div>
        <div>
          <span className="mini-label">
            {world.optional
              ? "OPTIONAL"
              : `WORLD ${catalog.worlds.indexOf(world) + 1}`}
          </span>
          <h2>{world.name}</h2>
          <p>{world.description}</p>
        </div>
        <strong>{missionsOfWorld(catalog, world.id).length} missions</strong>
      </section>
      <div className="mission-path">
        {missions.map((mission, index) => {
          const reference = isReference(mission);
          const unlocked = reference || isMissionUnlocked(mission, progress);
          const complete =
            !reference && progress.completedMissions.includes(mission.id);
          const challengeCount = mission.challenges.filter((c) =>
            isChallengeComplete(progress, mission.id, c.id),
          ).length;
          return (
            <div className="mission-node-wrap" key={mission.id}>
              {index > 0 && !reference && (
                <div className={cx("path-line", complete && "complete")} />
              )}
              <button
                className={cx(
                  "mission-node",
                  reference && "reference",
                  complete && "complete",
                  !reference && unlocked && !complete && "available",
                  !unlocked && "locked",
                )}
                disabled={!unlocked}
                onClick={() => onMission(mission)}
              >
                <div className="node-index">
                  {reference
                    ? "❓"
                    : complete
                      ? "✓"
                      : unlocked
                        ? mission.order
                        : "⌾"}
                </div>
                <div className="node-copy">
                  <div>
                    <span className="mini-label">
                      {reference
                        ? "Reference"
                        : `MISSION ${String(mission.order).padStart(2, "0")}`}
                    </span>
                    {!reference && (
                      <span className="difficulty">
                        {"◆".repeat(mission.difficulty)}
                        {"◇".repeat(5 - mission.difficulty)}
                      </span>
                    )}
                  </div>
                  <h3>{mission.title}</h3>
                  <p>
                    {unlocked
                      ? mission.summary
                      : `Clear ${mission.prerequisites.length} prerequisite mission to decrypt.`}
                  </p>
                  <div className="mission-meta">
                    <span>{mission.estimatedMinutes} min</span>
                    <span>{mission.fileCount} source files</span>
                    {!reference && (
                      <>
                        <span>
                          +
                          {mission.xp +
                            mission.challenges.reduce(
                              (sum, c) => sum + c.xp,
                              0,
                            )}{" "}
                          XP
                        </span>
                        <span>{challengeCount}/3 gates</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="node-action">
                  {reference
                    ? "Open"
                    : complete
                      ? "Review"
                      : unlocked
                        ? "Enter →"
                        : "Locked"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Reviews({
  catalog,
  progress,
  onProgress,
  onNotice,
  onDirty,
}: {
  onDirty: (dirty: boolean) => void;
  catalog: Catalog;
  progress: GameProgress;
  onProgress: (p: GameProgress) => Promise<GameProgress>;
  onNotice: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const dueIds = dueMissionIds(progress);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    onDirty(Object.values(answers).some(Boolean));
  }, [answers, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const missions = dueIds
    .map((id) => catalog.missions.find((m) => m.id === id))
    .filter(Boolean) as Mission[];
  return (
    <div className="page">
      <section className="page-intro">
        <span className="eyebrow">MEMORY FORGE</span>
        <h1>Remember by rebuilding.</h1>
        <p>
          Successful reviews move through 2, 7, 30, 90, 180, and 365-day
          intervals. A miss returns quickly and becomes debugging evidence.
        </p>
      </section>
      {missions.length === 0 ? (
        <div className="empty-state">
          <div>↻</div>
          <h2>No reviews due</h2>
          <p>
            Build a mission or attempt a transfer challenge. Rest is part of
            spacing.
          </p>
        </div>
      ) : (
        <div className="review-list">
          {missions.map((mission) => {
            const answer = answers[mission.id] || "";
            return (
              <article className="review-card" key={mission.id}>
                <span className="eyebrow">
                  RETRIEVAL · STAGE {progress.reviews[mission.id].stage + 1}
                </span>
                <h2>{mission.title}</h2>
                <p>
                  Without opening the lesson, explain the core mechanism, one
                  counterexample or failure, and how you would prove the claim.
                  Then connect it to{" "}
                  <b>{mission.concepts[0] || "your capstone"}</b>.
                </p>
                <textarea
                  value={answer}
                  maxLength={100000}
                  disabled={busy}
                  onChange={(event) =>
                    setAnswers({ ...answers, [mission.id]: event.target.value })
                  }
                  placeholder="Answer before revealing or rating…"
                />
                <div className="review-actions">
                  <span>{answer.trim().length}/80 minimum</span>
                  {(["again", "hard", "good", "easy"] as ReviewRating[]).map(
                    (rating) => (
                      <button
                        disabled={busy || answer.trim().length < 80}
                        className={rating}
                        key={rating}
                        onClick={async () => {
                          if (busy) return;
                          setBusy(true);
                          try {
                            await onProgress(
                              reviewMission(
                                saveResponse(
                                  progress,
                                  mission.id,
                                  "review",
                                  answer,
                                ),
                                mission.id,
                                rating,
                              ),
                            );
                            setAnswers({ ...answers, [mission.id]: "" });
                            onNotice(
                              `${rating.toUpperCase()} recorded. Next review scheduled.`,
                            );
                          } catch (error) {
                            onNotice((error as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {rating}
                      </button>
                    ),
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Profile({
  catalog,
  progress,
  onProgress,
  onNotice,
  onDirty,
  onImported,
  savePanel,
}: {
  catalog: Catalog;
  progress: GameProgress;
  onProgress: (p: GameProgress) => Promise<GameProgress>;
  onDirty: (dirty: boolean) => void;
  onImported: () => void;
  onNotice: (v: string) => void;
  savePanel: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const badges = earnedBadges(progress);
  const exportSave = () => {
    const blob = new Blob([serializeProgress(progress)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `skillforge-${progress.callsign}-save.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onNotice("Save exported.");
  };
  return (
    <div className="page">
      <section className="page-intro">
        <span className="eyebrow">LOADOUT & SAVES</span>
        <h1>
          {progress.callsign}, level {levelFromXp(progress.xp)}
        </h1>
        <p>
          Your progress lives in this browser. Export it regularly to move
          devices or keep a backup.
        </p>
      </section>
      {savePanel}
      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="avatar">
            {progress.callsign.slice(0, 2).toUpperCase()}
          </div>
          <h2>{progress.callsign}</h2>
          <p>
            {completedMissionCount(progress, catalog)} missions ·{" "}
            {progress.completedChallenges.length} gates · {progress.xp} XP
          </p>
          <div className="profile-actions">
            <button className="primary-button" onClick={exportSave}>
              Export save
            </button>
            <button
              className="ghost-button"
              onClick={() => input.current?.click()}
            >
              Import save
            </button>
            <input
              ref={input}
              hidden
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > MAX_SAVE_BYTES)
                    throw new Error("Import exceeds the 4 MiB file limit.");
                  const imported = validateAgainstCatalog(
                    parseProgressExport(await file.text()),
                    catalog,
                  );
                  if (
                    !confirm(
                      `Replace saved progress and open drafts with ${imported.completedMissions.length} completed missions and ${imported.notes.length} notes? Export a backup first.`,
                    )
                  )
                    return;
                  await onProgress({
                    ...imported,
                    revision: progress.revision,
                    epoch: progress.epoch,
                  });
                  onImported();
                  onNotice("Save imported successfully.");
                } catch (error) {
                  onNotice((error as Error).message);
                } finally {
                  event.target.value = "";
                }
              }}
            />
          </div>
          <div className="integrity">
            <span>Archive fingerprint</span>
            <code>{catalog.migrationFingerprint.slice(0, 18)}…</code>
            <small>
              {catalog.sourceFileCount} source files preserved ·{" "}
              {(catalog.sourceBytes / 1_000_000).toFixed(1)} MB
            </small>
          </div>
        </section>
        <section className="panel badge-vault">
          <span className="eyebrow">BADGE VAULT</span>
          <h2>Earned proof</h2>
          <div className="badge-grid">
            {badges.map((badge) => (
              <div className="big-badge" key={badge.id}>
                <span>◆</span>
                <div>
                  <strong>{badge.name}</strong>
                  <p>{badge.description}</p>
                </div>
              </div>
            ))}
            {badges.length === 0 && (
              <p className="muted">
                Your first badge is behind the first active checkpoint.
              </p>
            )}
          </div>
        </section>
      </div>
      <LearningNotes
        catalog={catalog}
        progress={progress}
        onProgress={onProgress}
        onDirty={onDirty}
      />
    </div>
  );
}

export default App;
