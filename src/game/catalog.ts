import type { Catalog, GameProgress, Mission } from "../types";

/**
 * Reference entries (handbooks, quizzes, orientation docs) are readable at any
 * time, carry no gates and never count toward completion. `kind` may be absent
 * in older catalogs, which always means "mission".
 */
export const isReference = (mission: Mission): boolean =>
  mission.kind === "reference";

export const gatedMissions = (catalog: Catalog): Mission[] =>
  catalog.missions.filter((mission) => !isReference(mission));

export const missionsOfWorld = (
  catalog: Catalog,
  worldId: string,
  includeReferences = false,
): Mission[] =>
  catalog.missions.filter(
    (mission) =>
      mission.worldId === worldId &&
      (includeReferences || !isReference(mission)),
  );

/** Completed missions, excluding reference entries. */
export function completedMissionCount(
  progress: GameProgress,
  catalog: Catalog,
): number {
  const byId = new Map(catalog.missions.map((m) => [m.id, m]));
  return progress.completedMissions.filter((id) => {
    const mission = byId.get(id);
    return !!mission && !isReference(mission);
  }).length;
}

export function completedInWorld(
  progress: GameProgress,
  catalog: Catalog,
  worldId: string,
): number {
  const byId = new Map(catalog.missions.map((m) => [m.id, m]));
  return progress.completedMissions.filter((id) => {
    const mission = byId.get(id);
    return !!mission && !isReference(mission) && mission.worldId === worldId;
  }).length;
}

export function completionPercent(
  progress: GameProgress,
  catalog: Catalog,
): number {
  const total = gatedMissions(catalog).length;
  if (!total) return 0;
  return Math.round((completedMissionCount(progress, catalog) / total) * 100);
}

export const totalGateCount = (catalog: Catalog): number =>
  catalog.missions.reduce((sum, mission) => sum + mission.challenges.length, 0);
