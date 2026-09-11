# 02 — How the content system works

Everything here was verified against the live data on 2026-09-04. The formulas are exact:
they were checked against all 334 missions with **zero exceptions**.

## Storage layout

```
public/content/
  catalog.json               #  640 KB — { schemaVersion, generatedAt, sourceFileCount,
                             #             sourceBytes, migrationFingerprint,
                             #             worlds[], missions[] }   (metadata only)
  migration-report.json      #  419 KB — { generatedAt, sourceFileCount, sourceBytes,
                             #             missionCount, archivedFileCount,
                             #             worldCounts{}, sourceHashes[] }
  missions/<mission-id>.json # 334 files, ~30 KB median — Mission + files[] (full text inline)
```

There are **no lesson files on disk any more**. The JSON *is* the content: every mission file
is stored inline as `{ path, language, content, bytes, sha256 }`.

The app fetches `/content/catalog.json` once at startup (`src/App.tsx:46`), then
`/content/<mission.contentFile>` when a mission is opened (`src/App.tsx:683`).

## Types

Authoritative source: `src/types.ts`.

```ts
interface Mission {
  id: string; sourceKey: string; worldId: string; title: string; summary: string;
  concepts: string[]; estimatedMinutes: number; xp: number; difficulty: number;
  fileCount: number; bytes: number; contentFile: string; order: number;
  prerequisites: string[]; challenges: Challenge[];
}
interface ArchivedFile { path: string; language: string; content: string; bytes: number; sha256: string; }
interface MissionContent extends Mission { files: ArchivedFile[]; }
interface World { id: string; name: string; icon: string; color: string; description: string; optional?: boolean; missionCount: number; }
```

`missions/<id>.json` is a `MissionContent`: the same fields as the catalog entry, plus `files`.
The duplication is intentional — keep the two copies identical.

## Derived metadata — verified formulas

```js
estimatedMinutes = 20 + 8 * fileCount                 // 0/334 exceptions
difficulty       = clamp(Math.ceil(fileCount / 3), 1, 5)  // 0/334 exceptions
xp               = 200                                 // constant on every mission
bytes            = sum of files[].bytes
fileCount        = files.length
concepts         = first 8 markdown headings of the Field Manual (h2/h3, document order,
                   the h1 title excluded); never more than 8
summary          = first prose paragraph of the Field Manual
contentFile      = `missions/${id}.json`
language         = per file extension: md→markdown, js→javascript, ts→typescript,
                   tsx→typescript, html→html, css→css, cs→csharp, csproj→xml,
                   json→json, yml/yaml→yaml, else text
```

Observed `estimatedMinutes` values are therefore 28, 44, 52, 60, 68, 76, 84 … 148, and
`difficulty` runs 1–5. A standard 7-file mission lands on **76 minutes, difficulty 3**.

## The three gates are a fixed template

Every one of the 334 missions carries exactly these three challenges. Only `<TITLE>` and
`<FIRST CONCEPT>` vary — generate them, never hand-write them. Machine-readable copy:
`templates/gates.json`.

```json
[
  { "id": "reconstruct", "title": "Recall checkpoint", "kind": "reflection", "xp": 30, "minLength": 80,
    "prompt": "Without reopening the lesson, explain <TITLE> in your own words. Include the problem it solves, the core mechanism, and one boundary or failure.",
    "hint": "Use “<FIRST CONCEPT>” as a cue, then close the lesson again." },
  { "id": "predict", "title": "Prediction checkpoint", "kind": "prediction", "xp": 40, "minLength": 100,
    "prompt": "Choose one example or source file from this mission. Predict its behavior for a normal input and a changed or invalid input before running or revealing the reference. Explain the rule separating the outcomes.",
    "hint": "Change one condition at a time so the result teaches a rule." },
  { "id": "prove", "title": "Build and prove checkpoint", "kind": "evidence", "xp": 70, "minLength": 120,
    "prompt": "Implement, debug, or adapt the mission exercise yourself. Record the acceptance criterion, command or interaction used to verify it, failure evidence, and one tradeoff. Do not paste the reference solution.",
    "hint": "A passing check, measured result, focused diff, or reproducible demo is stronger than ‘done.’" }
]
```

Note the curly quotes (`“ ” ‘ ’`) — the existing data uses them; match it.
Gate XP totals 140 per mission; mission `xp` (200) is awarded on top.

## Runtime behavior that constrains authoring

**Field Manual selection** — `src/App.tsx:688`:

```js
data.files.find(f => /LEARN\.md$/i.test(f.path))
  || data.files.find(f => /README\.md$/i.test(f.path))
  || data.files[0]
```

→ Every new mission **must ship a `LEARN.md`**. Its first paragraph becomes the mission
`summary` and its first 8 headings become `concepts`, both of which are shown on the world map
before the learner opens the mission.

**Reference lock** — `src/App.tsx:1177`:

```js
const isReferenceFile = file =>
  /(?:^|\/)(?:refactored|solution)(?:\/|\.|$)|SOLUTION\.md$/i.test(file.path);
```

→ `solution.js`, `solution.test.js`, `SOLUTION.md`, and anything under `refactored/` stay
hidden until the learner clears the prediction gate. Learner-facing starter code must **not**
match this pattern — name it `attempt.js` / `attempt.test.js`.

**Unlocking** — `src/game/engine.ts:24`: a mission is unlocked when *every* id in its
`prerequisites` is in `progress.completedMissions`. A mission completes when all three gates
are cleared. Gate answers are validated only by length (`minLength`) and non-emptiness
(`engine.ts:32`).

## What `npm run verify:content` enforces

`scripts/verify-content.mjs`, 30 lines — read it. It fails the build if any of these break:

1. `catalog.missions.length === count of public/content/missions/*.json`
2. `report.archivedFileCount === report.sourceFileCount`
3. `report.missionCount === catalog.missions.length`
4. no world has `missionCount === 0`
5. every mission has exactly 3 challenges
6. every mission with `order > 1` has a non-empty `prerequisites`
7. per mission: `content.files.length === mission.fileCount`
8. every file has a `sha256`, and `sha256(Buffer.from(file.content,"utf8"))` matches it

Rule 8 is the reason content must be emitted by a script rather than written by hand.

## Existing shape statistics (targets to match)

- mission bytes: min 13 · p25 24,447 · **median 30,472** · p75 37,303 · max 107,963 · mean 30,456
- `fileCount` distribution: 1→64 · 5→112 · 6→37 · **7→68** · 8→10 · 9→11 · 10→12 · 11–16→17
- the 64 single-file missions are doc-only nodes: 59 in `production`, 4 in `foundations`,
  1 in `dsa` (runbooks, threat models, capstone case studies, overviews)
- file basenames by frequency: `README.md` 276 · `LEARN.md` 263 · `PRACTICE.md` 233 ·
  `index.html` 90 · `original.html` 82 · `original.js` 63 · `original.ts` 52 ·
  `Program.cs`/`Tests.cs`/`Check.cs`/`refactored.csproj` 36 each ·
  `attempt.js`/`attempt.test.js`/`solution.js`/`solution.test.js`/`SOLUTION.md` 30 each
- languages: markdown 869 · javascript 416 · csharp 229 · html 173 · typescript 105 ·
  xml 36 · css 5 · json 4 · yaml 1 · text 1
