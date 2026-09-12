import {
  completedMissionCount,
  completionPercent,
  completedInWorld,
  isReference,
  missionsOfWorld,
} from "../game/catalog";
import { dueMissionIds, earnedBadges, isMissionUnlocked } from "../game/engine";
import type { Catalog, GameProgress, Mission, World } from "../types";
import { cx } from "./shared";

/** The first thing a one-minute session should see. */
export function Dashboard({
  catalog,
  progress,
  onMission,
  onJourney,
  onReviews,
}: {
  catalog: Catalog;
  progress: GameProgress;
  onMission: (mission: Mission) => void;
  onJourney: () => void;
  onReviews: () => void;
}) {
  const due = dueMissionIds(progress).length;
  const resumable = (mission: Mission | undefined) =>
    !!mission &&
    !isReference(mission) &&
    isMissionUnlocked(mission, progress) &&
    !progress.completedMissions.includes(mission.id);
  const last = catalog.missions.find((m) => m.id === progress.lastMissionId);
  const next =
    (resumable(last) ? last : undefined) ||
    catalog.missions.find(
      (mission) =>
        !isReference(mission) &&
        isMissionUnlocked(mission, progress) &&
        !progress.completedMissions.includes(mission.id),
    );
  const resuming = !!last && next?.id === last.id;
  const total = catalog.missions.filter((m) => !isReference(m)).length;
  const completed = completedMissionCount(progress, catalog);
  const badges = earnedBadges(progress);
  return (
    <div className="page dashboard">
      {due > 0 && (
        <section className="review-now">
          <div>
            <span className="eyebrow">MEMORY FORGE</span>
            <h2>Review now · {due} due</h2>
            <p>Spaced recall first — it is the shortest useful session.</p>
          </div>
          <button className="primary-button" onClick={onReviews}>
            Start review <span>→</span>
          </button>
        </section>
      )}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            {resuming ? "RESUME WHERE YOU STOPPED" : "CURRENT DIRECTIVE"}
          </span>
          <h1>{next ? next.title : "Frontier conquered"}</h1>
          <p>
            {next?.summary ||
              "Every mission is complete. Revisit weak skills in the Memory Forge."}
          </p>
          <div className="hero-actions">
            {next && (
              <button
                className="primary-button"
                onClick={() => onMission(next)}
              >
                {resuming ? "Continue mission" : "Start mission"} <span>→</span>
              </button>
            )}
            <button className="ghost-button" onClick={onJourney}>
              Open mission map
            </button>
          </div>
        </div>
        <div className="hero-radar">
          <div className="radar-ring">
            <div className="radar-core">
              <strong>{completionPercent(progress, catalog)}%</strong>
              <span>journey</span>
            </div>
          </div>
          <div className="floating-code">
            const proof = <b>ship()</b>;
          </div>
        </div>
      </section>
      <section className="section-heading">
        <div>
          <span className="eyebrow">CAMPAIGN STATUS</span>
          <h2>Your worlds</h2>
        </div>
        <p>
          {completed} of {total} missions cleared
        </p>
      </section>
      <div className="world-grid">
        {catalog.worlds.map((world) => (
          <WorldCard
            key={world.id}
            world={world}
            catalog={catalog}
            progress={progress}
          />
        ))}
      </div>
      <div className="dashboard-lower">
        <section className="panel daily">
          <span className="eyebrow">DAILY QUEST</span>
          <h3>Retrieve before you reveal</h3>
          <p>
            Before opening today’s lesson, write what you remember and one
            prediction that could be wrong.
          </p>
          <div className="reward">
            <span>+20 XP</span>
            <small>awarded through your next good review</small>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">BADGE WALL</span>
              <h3>Proof of work</h3>
            </div>
            <span>{badges.length}/6</span>
          </div>
          <div className="badge-row">
            {badges.length ? (
              badges.slice(-4).map((badge) => (
                <div className="badge" key={badge.id} title={badge.description}>
                  ◆<span>{badge.name}</span>
                </div>
              ))
            ) : (
              <p className="muted">
                Complete your first challenge to forge a badge.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function WorldCard({
  world,
  catalog,
  progress,
}: {
  world: World;
  catalog: Catalog;
  progress: GameProgress;
}) {
  const missions = missionsOfWorld(catalog, world.id);
  const complete = completedInWorld(progress, catalog, world.id);
  const unlocked = missionsOfWorld(catalog, world.id, true).some((m) =>
    isMissionUnlocked(m, progress),
  );
  return (
    <article className={cx("world-card", !unlocked && "locked")}>
      <div className={`world-icon ${world.color}`}>
        {unlocked ? world.icon : "⌾"}
      </div>
      <div>
        <span className="mini-label">
          {world.optional
            ? "OPTIONAL EXPEDITION"
            : `WORLD ${catalog.worlds.indexOf(world) + 1}`}
        </span>
        <h3>{world.name}</h3>
        <p>{world.description}</p>
        <div className="world-progress">
          <div>
            <i
              style={{
                width: `${missions.length ? (complete / missions.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span>
            {complete}/{missions.length}
          </span>
        </div>
      </div>
    </article>
  );
}
