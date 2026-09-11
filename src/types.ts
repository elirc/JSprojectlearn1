export type ChallengeKind = "reflection" | "prediction" | "evidence";
export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface Challenge {
  id: string;
  title: string;
  kind: ChallengeKind;
  xp: number;
  minLength: number;
  prompt: string;
  hint: string;
}

export interface Mission {
  id: string;
  sourceKey: string;
  worldId: string;
  title: string;
  summary: string;
  concepts: string[];
  estimatedMinutes: number;
  xp: number;
  difficulty: number;
  fileCount: number;
  bytes: number;
  contentFile: string;
  order: number;
  prerequisites: string[];
  challenges: Challenge[];
}

export interface World {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  optional?: boolean;
  missionCount: number;
}

export interface Catalog {
  schemaVersion: number;
  generatedAt: string;
  sourceFileCount: number;
  sourceBytes: number;
  migrationFingerprint: string;
  worlds: World[];
  missions: Mission[];
}

export interface ArchivedFile {
  path: string;
  language: string;
  content: string;
  bytes: number;
  sha256: string;
}

export interface MissionContent extends Mission {
  files: ArchivedFile[];
}

export interface ReviewRecord {
  missionId: string;
  stage: number;
  due: string;
  reviews: number;
  lapses: number;
  lastRating?: ReviewRating;
  lastReviewed?: string;
}

export interface LearningNote {
  id: string;
  missionId: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface GameProgress {
  revision: number;
  epoch: string;
  notes: LearningNote[];
  version: 1;
  callsign: string;
  sessionMinutes: number;
  onboarded: boolean;
  xp: number;
  completedMissions: string[];
  completedChallenges: string[];
  responses: Record<string, string>;
  reviews: Record<string, ReviewRecord>;
  activityDates: string[];
  lastMissionId?: string;
}
