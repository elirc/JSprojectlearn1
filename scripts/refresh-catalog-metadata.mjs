/**
 * Idempotent refresh of derived mission metadata.
 *
 * Rewrites only top-level metadata in `public/content/catalog.json` and each
 * `public/content/missions/*.json`:
 *   - summary            (Field Manual first real paragraph, boilerplate replaced)
 *   - concepts           (first 8 h2/h3 headings, cleaned)
 *   - estimatedMinutes   (reading based, clamped 8..90)
 *   - kind: "reference"  (five orientation documents) + prerequisite rewiring
 *
 * `files[]` inside mission JSON is NEVER touched (SHA-256 verification depends on it).
 * Key order and the existing minified formatting are preserved.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "public", "content");
const catalogPath = path.join(contentRoot, "catalog.json");

/** The five entries that are orientation/reference documents, not build missions. */
const REFERENCE_IDS = new Set([
  "foundations-foundations-root-handbook",
  "foundations-foundations-root-quiz",
  "foundations-foundations-root-readme",
  "foundations-foundations-root-start-here",
  "production-production-start-here-diagnostic",
]);

const BOILERPLATE = /read this (before|alongside)/i;
const SKIP_HEADING = /how to use this guide|what you need installed|glossary|self-check|table of contents/i;
const SUMMARY_MAX = 180;
const MIN_PARAGRAPH_CHARS = 40;
const WORDS_PER_MINUTE = 180;
const MINUTES_PER_CODE_FILE = 4;
const MIN_MINUTES = 8;
const MAX_MINUTES = 90;

// ---------------------------------------------------------------- markdown ---

const stripFences = text => text.replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[ \t]*$/gm, "");
const stripHtmlComments = text => text.replace(/<!--[\s\S]*?-->/g, "");

function stripInlineMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<https?:\/\/[^>]+>/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, "$1$2")
    .replace(/\*\*/g, "") // dangling emphasis left by an earlier mid-sentence truncation
    .replace(/\s+/g, " ")
    .trim();
}

const EMOJI_PREFIX = /^(?:[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}‍️⃣\d]|\s)+/u;

function stripLeadingNumbering(value) {
  return value.replace(/^\s*\d+(?:\.\d+)*[.)]?\s+/, "").trim();
}

function cleanHeading(raw) {
  let text = stripInlineMarkdown(raw.replace(/#+\s*$/, "").trim());
  text = stripLeadingNumbering(text);
  // Strip a leading emoji run (and any numbering that hid behind it).
  const withoutEmoji = text.replace(EMOJI_PREFIX, "").trim();
  if (withoutEmoji && /\p{Extended_Pictographic}/u.test(text.slice(0, 4))) text = withoutEmoji;
  text = stripLeadingNumbering(text);
  return text.replace(/\s+/g, " ").trim();
}

/** Split markdown (fences removed) into blank-line separated blocks. */
function blocksOf(markdown) {
  return stripHtmlComments(stripFences(markdown))
    .split(/\n\s*\n/)
    .map(block => block.replace(/\r/g, "").trim())
    .filter(Boolean);
}

function isProsePara(block) {
  const first = block.split("\n")[0].trim();
  if (!first) return false;
  if (first.startsWith("#")) return false;              // heading
  if (first.startsWith("|") || /^\|?[-: ]+\|/.test(first)) return false; // table
  if (first.startsWith(">")) return false;              // blockquote
  if (/^([-*_]\s*){3,}$/.test(first)) return false;     // horizontal rule
  if (first.startsWith("<")) return false;              // raw HTML
  if (/^([-*+]|\d+[.)])\s+/.test(first)) return false;  // list
  if (/^\s{4,}\S/.test(block.split("\n")[0])) return false; // indented code
  return true;
}

function cutAtSentence(text) {
  if (text.length <= SUMMARY_MAX) return text;
  const window = text.slice(0, SUMMARY_MAX + 1);
  let cut = -1;
  const sentence = /[.!?](?=\s|$)/g;
  let match;
  while ((match = sentence.exec(window)) !== null) {
    if (match.index + 1 <= SUMMARY_MAX) cut = match.index + 1;
  }
  if (cut > 60) return window.slice(0, cut).trim();
  const words = text.slice(0, SUMMARY_MAX - 1);
  const space = words.lastIndexOf(" ");
  return `${(space > 0 ? words.slice(0, space) : words).replace(/[\s,;:–—-]+$/, "")}…`;
}

function extractSummary(markdown) {
  for (const block of blocksOf(markdown)) {
    if (!isProsePara(block)) continue;
    if (BOILERPLATE.test(block)) continue;
    const text = stripInlineMarkdown(block.replace(/\n/g, " "));
    if (text.length < MIN_PARAGRAPH_CHARS) continue;
    // A paragraph that leads into a list ends in a colon; make it a sentence.
    return cutAtSentence(text).replace(/:$/, ".");
  }
  return null;
}

function extractConcepts(markdown) {
  const seen = new Set();
  const concepts = [];
  for (const line of stripHtmlComments(stripFences(markdown)).split("\n")) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const heading = cleanHeading(match[2]);
    if (!heading) continue;
    if (SKIP_HEADING.test(heading)) continue;
    const key = heading.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    concepts.push(heading);
    if (concepts.length === 8) break;
  }
  return concepts;
}

// ------------------------------------------------------------------- files ---

const isMarkdown = file => file.language === "markdown" || /\.mdx?$/i.test(file.path);
const basename = file => file.path.split("/").pop().toUpperCase();

function fieldManual(files) {
  const markdown = files.filter(isMarkdown);
  return (
    markdown.find(file => basename(file) === "LEARN.MD") ??
    markdown.find(file => basename(file) === "README.MD") ??
    markdown[0] ??
    null
  );
}

function countWords(text) {
  const body = stripHtmlComments(stripFences(text));
  const words = body.match(/\S+/g);
  return words ? words.length : 0;
}

function estimateMinutes(files) {
  let words = 0;
  let codeFiles = 0;
  for (const file of files) {
    if (isMarkdown(file)) words += countWords(file.content);
    else codeFiles += 1;
  }
  const minutes = Math.ceil(words / WORDS_PER_MINUTE) + MINUTES_PER_CODE_FILE * codeFiles;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes));
}

// -------------------------------------------------------------- json rules ---

/** Re-serialise with the same minified, newline-free shape the archive uses. */
const serialize = value => JSON.stringify(value);

/** Rebuild an object so `kind` sits directly after `title`, preserving all other order. */
function withKind(entry, kind) {
  const rebuilt = {};
  for (const [key, value] of Object.entries(entry)) {
    if (key === "kind") continue;
    rebuilt[key] = value;
    if (key === "title" && kind) rebuilt.kind = kind;
  }
  if (kind && !("kind" in rebuilt)) rebuilt.kind = kind;
  return rebuilt;
}

// -------------------------------------------------------------------- main ---

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const missionFileNames = (await readdir(path.join(contentRoot, "missions"))).filter(name => name.endsWith(".json"));
const missionDocs = new Map();
for (const name of missionFileNames) {
  const file = path.join(contentRoot, "missions", name);
  missionDocs.set(name, { file, doc: JSON.parse(await readFile(file, "utf8")), before: null });
}

const beforeMinutes = [];
const afterMinutes = [];
let summariesChanged = 0;
let conceptsChanged = 0;
let minutesChanged = 0;
const samples = [];

// Pass 1 — derived metadata per mission.
const derived = new Map();
for (const mission of catalog.missions) {
  const name = path.basename(mission.contentFile);
  const record = missionDocs.get(name);
  if (!record) throw new Error(`missing mission document for ${mission.id}`);
  const files = record.doc.files;
  const manual = fieldManual(files);
  const source = manual ? manual.content : "";

  const extractedSummary = source ? extractSummary(source) : null;
  const keepSummary = mission.summary && !BOILERPLATE.test(mission.summary);
  // Kept summaries are not re-derived, but inline markdown is stripped from every summary.
  const summary = keepSummary
    ? stripInlineMarkdown(mission.summary)
    : extractedSummary ?? stripInlineMarkdown(mission.summary ?? "");
  const concepts = source ? extractConcepts(source) : [];
  const estimatedMinutes = estimateMinutes(files);

  beforeMinutes.push(mission.estimatedMinutes);
  afterMinutes.push(estimatedMinutes);
  if (summary !== mission.summary) summariesChanged += 1;
  if (serialize(concepts) !== serialize(mission.concepts)) conceptsChanged += 1;
  if (estimatedMinutes !== mission.estimatedMinutes) minutesChanged += 1;

  derived.set(mission.id, {
    summary,
    concepts: concepts.length ? concepts : mission.concepts,
    estimatedMinutes,
    record,
  });
}

// Pass 2 — reference rewiring. Nearest earlier non-reference mission in the same world.
const byWorld = new Map();
for (const mission of catalog.missions) {
  if (!byWorld.has(mission.worldId)) byWorld.set(mission.worldId, []);
  byWorld.get(mission.worldId).push(mission);
}
for (const list of byWorld.values()) list.sort((a, b) => a.order - b.order);

function nearestEarlierMission(mission) {
  const list = byWorld.get(mission.worldId) ?? [];
  let best = null;
  for (const candidate of list) {
    if (candidate.order >= mission.order) break;
    if (REFERENCE_IDS.has(candidate.id)) continue;
    best = candidate;
  }
  return best;
}

function rewirePrerequisites(mission) {
  if (REFERENCE_IDS.has(mission.id)) return [];
  if (!mission.prerequisites.some(id => REFERENCE_IDS.has(id))) return mission.prerequisites;
  const replacement = nearestEarlierMission(mission);
  const next = [];
  for (const id of mission.prerequisites) {
    const mapped = REFERENCE_IDS.has(id) ? replacement?.id ?? null : id;
    if (mapped && !next.includes(mapped)) next.push(mapped);
  }
  return next;
}

let referenceCount = 0;
let rewired = 0;
const nextMissions = [];
for (const mission of catalog.missions) {
  const info = derived.get(mission.id);
  const isReference = REFERENCE_IDS.has(mission.id);
  const prerequisites = rewirePrerequisites(mission);
  if (serialize(prerequisites) !== serialize(mission.prerequisites)) rewired += 1;

  const patch = {
    summary: info.summary,
    concepts: info.concepts,
    estimatedMinutes: info.estimatedMinutes,
    prerequisites,
  };
  if (isReference) {
    referenceCount += 1;
    patch.challenges = [];
    patch.xp = 0;
  }

  const catalogEntry = withKind({ ...mission, ...patch }, isReference ? "reference" : null);
  nextMissions.push(catalogEntry);

  const doc = info.record.doc;
  const nextDoc = withKind({ ...doc, ...patch }, isReference ? "reference" : null);
  info.record.next = nextDoc;

  samples.push({ id: mission.id, worldId: mission.worldId, summary: info.summary, concepts: info.concepts });
}

catalog.missions = nextMissions;

// ------------------------------------------------------------------ writes ---

let filesWritten = 0;
const catalogText = serialize(catalog);
if (catalogText !== (await readFile(catalogPath, "utf8"))) {
  await writeFile(catalogPath, catalogText);
  filesWritten += 1;
}
for (const record of missionDocs.values()) {
  if (!record.next) continue;
  const text = serialize(record.next);
  if (text !== (await readFile(record.file, "utf8"))) {
    await writeFile(record.file, text);
    filesWritten += 1;
  }
}

// migration-report.json stores source hashes only (path/bytes/sha256/missionId) plus
// counts — no per-mission summary/concepts/estimatedMinutes — so nothing there changes.

// ----------------------------------------------------------------- reports ---

function histogram(values) {
  const buckets = new Map();
  for (const value of values) {
    const floor = Math.floor(value / 10) * 10;
    buckets.set(floor, (buckets.get(floor) ?? 0) + 1);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]);
}

function printHistogram(label, values) {
  const rows = histogram(values);
  const total = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = (values.reduce((sum, value) => sum + value, 0) / total).toFixed(1);
  console.log(`${label} (n=${total}, min=${min}, max=${max}, mean=${mean})`);
  for (const [floor, count] of rows) {
    const bar = "#".repeat(Math.max(1, Math.round((count / total) * 60)));
    console.log(`  ${String(floor).padStart(3)}-${String(floor + 9).padEnd(3)} ${String(count).padStart(4)} ${bar}`);
  }
}

printHistogram("estimatedMinutes BEFORE", beforeMinutes);
printHistogram("estimatedMinutes AFTER ", afterMinutes);
console.log(`Summaries changed: ${summariesChanged}/${catalog.missions.length}`);
console.log(`Concept lists changed: ${conceptsChanged}/${catalog.missions.length}`);
console.log(`estimatedMinutes changed: ${minutesChanged}/${catalog.missions.length}`);
console.log(`Reference entries: ${referenceCount}`);
console.log(`Prerequisite lists rewired: ${rewired}`);
console.log(`Files written: ${filesWritten}`);

if (process.argv.includes("--samples")) {
  const count = 15;
  const pool = [...samples];
  const picked = [];
  const worlds = [...new Set(pool.map(entry => entry.worldId))];
  let seed = Number(process.env.SAMPLE_SEED ?? 20260911);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (const world of worlds) {
    const inWorld = pool.filter(entry => entry.worldId === world);
    picked.push(inWorld[Math.floor(random() * inWorld.length)]);
  }
  while (picked.length < count) {
    const candidate = pool[Math.floor(random() * pool.length)];
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  console.log("\n--- 15 random samples (mixed worlds) ---");
  for (const entry of picked.slice(0, count)) {
    console.log(`\n[${entry.worldId}] ${entry.id}`);
    console.log(`  summary : ${entry.summary}`);
    console.log(`  concepts: ${entry.concepts.join(" | ")}`);
  }
}
