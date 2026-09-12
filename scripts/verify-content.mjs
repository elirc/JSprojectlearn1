import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "public", "content");
const catalog = JSON.parse(await readFile(path.join(contentRoot, "catalog.json"), "utf8"));
const report = JSON.parse(await readFile(path.join(contentRoot, "migration-report.json"), "utf8"));
const missionFiles = (await readdir(path.join(contentRoot, "missions"))).filter(name => name.endsWith(".json"));
const failures = [];
const sha256 = value => createHash("sha256").update(value).digest("hex");
if (catalog.missions.length !== missionFiles.length) failures.push("catalog mission count does not match mission files");
if (report.archivedFileCount !== report.sourceFileCount) failures.push("not every source file was archived");
if (report.missionCount !== catalog.missions.length) failures.push("migration report mission count mismatch");
if (catalog.worlds.some(world => world.missionCount === 0)) failures.push("one or more worlds have no missions");
const isReference = mission => mission.kind === "reference";
const referenceIds = new Set(catalog.missions.filter(isReference).map(mission => mission.id));
const missionsByWorld = new Map();
for (const mission of catalog.missions) {
  if (!missionsByWorld.has(mission.worldId)) missionsByWorld.set(mission.worldId, []);
  missionsByWorld.get(mission.worldId).push(mission);
}
const hasEarlierMission = mission => (missionsByWorld.get(mission.worldId) ?? []).some(other => other.order < mission.order && !isReference(other));
for (const mission of catalog.missions) {
  if (isReference(mission)) {
    if (mission.challenges.length !== 0) failures.push(`${mission.id} is a reference but carries challenge gates`);
    if (mission.prerequisites.length !== 0) failures.push(`${mission.id} is a reference but has prerequisites`);
    if (mission.xp !== 0) failures.push(`${mission.id} is a reference but awards xp`);
  } else {
    if (mission.challenges.length !== 3) failures.push(`${mission.id} does not have three gates`);
    // A mission whose only earlier neighbours are references may legitimately be ungated.
    if (mission.order > 1 && mission.prerequisites.length === 0 && hasEarlierMission(mission)) failures.push(`${mission.id} is unexpectedly ungated`);
  }
  if (mission.prerequisites.some(id => referenceIds.has(id))) failures.push(`${mission.id} lists a reference document as a prerequisite`);
  const content = JSON.parse(await readFile(path.join(contentRoot, mission.contentFile), "utf8"));
  if ((content.kind ?? null) !== (mission.kind ?? null)) failures.push(`${mission.id} kind differs between catalog and mission document`);
  if (content.files.length !== mission.fileCount) failures.push(`${mission.id} file count mismatch`);
  if (content.files.some(file => !file.sha256)) failures.push(`${mission.id} contains an unhashed file`);
  if (content.files.some(file => sha256(Buffer.from(file.content, "utf8")) !== file.sha256)) failures.push(`${mission.id} contains content that does not match its source hash`);
}
console.log(`Worlds: ${catalog.worlds.length}`);
console.log(`Catalog entries: ${catalog.missions.length}`);
console.log(`Missions: ${catalog.missions.length - referenceIds.size}`);
console.log(`Reference documents: ${referenceIds.size}`);
console.log(`Archived source files: ${report.archivedFileCount}/${report.sourceFileCount}`);
console.log(`Archived bytes: ${report.sourceBytes}`);
console.log(`Challenge gates: ${catalog.missions.reduce((sum, mission) => sum + mission.challenges.length, 0)}`);
console.log(`Summaries with residual markdown (** \` [): ${catalog.missions.filter(mission => /\*\*|`|\[/.test(mission.summary ?? "")).length}`);
if (failures.length) { failures.forEach(failure => console.error(`- ${failure}`)); process.exitCode = 1; }
else console.log("Content migration verification: PASS");
