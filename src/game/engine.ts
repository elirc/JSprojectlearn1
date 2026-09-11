import type {
  Challenge,
  GameProgress,
  Mission,
  ReviewRating,
  ReviewRecord,
} from "../types";

const DAY_MS = 86_400_000;
const TEN_MINUTES_MS = 600_000;
const REVIEW_INTERVALS = [2, 7, 30, 90, 180, 365] as const;
function clock(now: Date): void {
  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime()) ||
    now.getTime() < 0
  )
    throw new Error("Use a valid clock value.");
}
function checkedXp(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000)
    throw new Error("Progress XP is outside its supported range.");
  return value;
}
function ratingValue(rating: ReviewRating): void {
  if (!["again", "hard", "good", "easy"].includes(rating))
    throw new Error("Unknown review rating.");
}

export function createProgress(): GameProgress {
  return {
    version: 1,
    revision: 0,
    epoch: "",
    notes: [],
    callsign: "",
    sessionMinutes: 45,
    onboarded: false,
    xp: 0,
    completedMissions: [],
    completedChallenges: [],
    responses: {},
    reviews: {},
    activityDates: [],
  };
}

export const challengeKey = (missionId: string, challengeId: string) =>
  `${missionId}::${challengeId}`;

export function isMissionUnlocked(
  mission: Mission,
  progress: GameProgress,
): boolean {
  return mission.prerequisites.every((id) =>
    progress.completedMissions.includes(id),
  );
}

export function isChallengeComplete(
  progress: GameProgress,
  missionId: string,
  challengeId: string,
): boolean {
  return progress.completedChallenges.includes(
    challengeKey(missionId, challengeId),
  );
}

export function responseMeetsGate(
  response: string,
  challenge: Challenge,
): boolean {
  return response.trim().length >= challenge.minLength;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function withActivity(progress: GameProgress, now: Date): GameProgress {
  const key = dateKey(now);
  return progress.activityDates.includes(key)
    ? progress
    : { ...progress, activityDates: [...progress.activityDates, key].sort() };
}

export function saveResponse(
  progress: GameProgress,
  missionId: string,
  challengeId: string,
  response: string,
): GameProgress {
  return {
    ...progress,
    lastMissionId: missionId,
    responses: {
      ...progress.responses,
      [challengeKey(missionId, challengeId)]: response,
    },
  };
}

export function completeChallenge(
  progress: GameProgress,
  mission: Mission,
  challenge: Challenge,
  now = new Date(),
): GameProgress {
  clock(now);
  if (!isMissionUnlocked(mission, progress))
    throw new Error("Complete this mission's prerequisites first.");
  const canonical = mission.challenges.find((item) => item.id === challenge.id);
  if (!canonical)
    throw new Error("This checkpoint does not belong to the mission.");
  challenge = canonical;
  const key = challengeKey(mission.id, challenge.id);
  const response = progress.responses[key] ?? "";
  if (!responseMeetsGate(response, challenge)) {
    throw new Error(
      `Write at least ${challenge.minLength} characters of original evidence before completing this checkpoint.`,
    );
  }
  if (progress.completedChallenges.includes(key)) return progress;

  const completedChallenges = [...progress.completedChallenges, key];
  const missionComplete = mission.challenges.every((item) =>
    completedChallenges.includes(challengeKey(mission.id, item.id)),
  );
  const newlyCompleted =
    missionComplete && !progress.completedMissions.includes(mission.id);
  const next: GameProgress = {
    ...progress,
    xp: checkedXp(
      progress.xp + challenge.xp + (newlyCompleted ? mission.xp : 0),
    ),
    completedChallenges,
    completedMissions: newlyCompleted
      ? [...progress.completedMissions, mission.id]
      : progress.completedMissions,
    reviews: newlyCompleted
      ? {
          ...progress.reviews,
          [mission.id]: createReviewRecord(mission.id, now),
        }
      : progress.reviews,
    lastMissionId: mission.id,
  };
  return withActivity(next, now);
}

export function createReviewRecord(
  missionId: string,
  now = new Date(),
): ReviewRecord {
  clock(now);
  return {
    missionId,
    stage: 0,
    due: new Date(now.getTime() + REVIEW_INTERVALS[0] * DAY_MS).toISOString(),
    reviews: 0,
    lapses: 0,
  };
}

export function scheduleReview(
  record: ReviewRecord,
  rating: ReviewRating,
  now = new Date(),
): ReviewRecord {
  clock(now);
  ratingValue(rating);
  if (
    !Number.isInteger(record.stage) ||
    record.stage < 0 ||
    record.stage > REVIEW_INTERVALS.length ||
    !Number.isSafeInteger(record.reviews) ||
    record.reviews < 0 ||
    !Number.isSafeInteger(record.lapses) ||
    record.lapses < 0 ||
    record.lapses > record.reviews
  )
    throw new Error("The review record is invalid.");
  let stage = record.stage;
  let due: Date;
  if (rating === "again") {
    stage = Math.max(0, stage - 1);
    due = new Date(now.getTime() + TEN_MINUTES_MS);
  } else if (rating === "hard") {
    stage = Math.max(1, stage);
    const interval = Math.max(
      1,
      Math.round(
        REVIEW_INTERVALS[Math.min(stage - 1, REVIEW_INTERVALS.length - 1)] / 2,
      ),
    );
    due = new Date(now.getTime() + interval * DAY_MS);
  } else {
    stage = Math.min(
      REVIEW_INTERVALS.length,
      stage + (rating === "easy" ? 2 : 1),
    );
    due = new Date(
      now.getTime() +
        REVIEW_INTERVALS[Math.min(stage - 1, REVIEW_INTERVALS.length - 1)] *
          DAY_MS,
    );
  }
  return {
    ...record,
    stage,
    due: due.toISOString(),
    reviews: record.reviews + 1,
    lapses: record.lapses + (rating === "again" ? 1 : 0),
    lastRating: rating,
    lastReviewed: now.toISOString(),
  };
}

export function reviewMission(
  progress: GameProgress,
  missionId: string,
  rating: ReviewRating,
  now = new Date(),
): GameProgress {
  clock(now);
  ratingValue(rating);
  const existing = progress.reviews[missionId];
  if (!existing || !progress.completedMissions.includes(missionId))
    throw new Error("Complete the mission before reviewing it.");
  const due = new Date(existing.due).getTime();
  if (!Number.isFinite(due) || due > now.getTime())
    throw new Error("This mission is not due for review yet.");
  return withActivity(
    {
      ...progress,
      xp: checkedXp(
        progress.xp + { again: 5, hard: 10, good: 20, easy: 30 }[rating],
      ),
      reviews: {
        ...progress.reviews,
        [missionId]: scheduleReview(existing, rating, now),
      },
    },
    now,
  );
}

export function dueMissionIds(
  progress: GameProgress,
  now = new Date(),
): string[] {
  return Object.values(progress.reviews)
    .filter((record) => new Date(record.due).getTime() <= now.getTime())
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((record) => record.missionId);
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function levelProgress(xp: number): {
  current: number;
  required: number;
  percent: number;
} {
  const current = xp % 500;
  return { current, required: 500, percent: Math.round((current / 500) * 100) };
}

export function streakFromDates(dates: string[], now = new Date()): number {
  const unique = new Set(dates);
  let cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (!unique.has(dateKey(cursor)))
    cursor = new Date(cursor.getTime() - DAY_MS);
  let streak = 0;
  while (unique.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export function earnedBadges(
  progress: GameProgress,
): { id: string; name: string; description: string }[] {
  const badges = [];
  if (progress.completedChallenges.length >= 1)
    badges.push({
      id: "first-proof",
      name: "First Proof",
      description: "Completed the first active checkpoint.",
    });
  if (progress.completedMissions.length >= 1)
    badges.push({
      id: "pathfinder",
      name: "Pathfinder",
      description: "Cleared the first mission.",
    });
  if (progress.completedMissions.length >= 10)
    badges.push({
      id: "tenacious",
      name: "Tenacious",
      description: "Cleared ten missions.",
    });
  if (Object.values(progress.reviews).some((record) => record.reviews >= 3))
    badges.push({
      id: "memory-smith",
      name: "Memory Smith",
      description: "Reviewed one skill across three intervals.",
    });
  if (
    Object.values(progress.reviews).some(
      (record) => record.lapses >= 1 && record.stage >= 2,
    )
  )
    badges.push({
      id: "debugger-mind",
      name: "Debugger Mind",
      description: "Recovered a lapsed concept.",
    });
  if (streakFromDates(progress.activityDates) >= 7)
    badges.push({
      id: "seven-day",
      name: "Seven-Day Signal",
      description: "Maintained a seven-day evidence streak.",
    });
  return badges;
}
