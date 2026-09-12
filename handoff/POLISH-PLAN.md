# Polish plan — phone-first microlearning (Sept 2026)

Owner goal: a single learner (junior SWE) studies **on a phone, 1–10 minutes at a time**, to
upskill in CRUD web-app development. Content is mostly fine; the app shell needs to fit those
sessions. This file is the shared brief for the three implementation streams below.

Baseline (commit `e4564cf`): `npm test` 36/36 pass, `npm run verify:content` PASS,
`npm run build` OK, Playwright suite in `tests/learning.spec.ts` (run with `npm run test:browser`).

## What the phone audit found (iPhone 13 viewport, 390×844)

Measured on the first mission page:

| element | top (px) | height (px) |
|---|---|---|
| `.save-panel` (Load / Export / Reset) | 86 | 185 |
| `.mission-draft-bar` | 343 | 189 |
| `.mission-header` (title) | 593 | 297 |
| `.code-lab` | 1032 | 518 |
| `.lesson-content` (LEARN.md, 57 KB) | 1589 | **44,096** |
| `.challenge-rail` (the 3 gates) | **45,704** | 1146 |

Total page height 46,986 px. Nothing about the mission is visible above the fold; the
checkpoints are 45k px down; the lab sits *before* the reading. The same save panel is
repeated at the top of every page. Bottom-nav labels are unreadable (`font-size: 0.55rem`).

Content metadata: **233 of 334** mission summaries on the map/hero are the boilerplate line
"Read this before or alongside the README — …" because the extractor took the first paragraph
of LEARN.md. `estimatedMinutes = 20 + 8*fileCount` is meaningless (FizzBuzz shows 76 min).
Five entries are reference documents, not missions, yet carry three gates and sit in the
prerequisite chain — one of them (`production-production-start-here-diagnostic`, order 41/63)
blocks 22 later missions behind a "build and prove" gate on an orientation doc:

```
foundations-foundations-root-handbook      📗 The JavaScript Handbook          order 14/17
foundations-foundations-root-quiz          🧠 The JavaScript Quiz — 50 questions order 15/17
foundations-foundations-root-readme        JS Project Learn                     order 16/17
foundations-foundations-root-start-here    ✈️ Start Here — Offline Learning Guide order 17/17
production-production-start-here-diagnostic Start Here: Skills and Learning Diagnostic order 41/63
```

(`async-47-quiz-app` and `react-react-48-quiz-react` are real build-a-quiz projects, not references.)

Catalog is 640 KB raw but **55 KB gzipped** — no sharding needed.

## Shared contract (already applied)

`src/types.ts` now has `kind?: "mission" | "reference"` on `Mission`. Absent = mission.
A reference entry: `challenges: []`, `prerequisites: []`, `xp: 0`, is always unlocked, never
appears in any other mission's `prerequisites`, and does not count toward world/journey
completion percentages. Its JSON `files` are unchanged (hashes must still verify).

## Stream A — content metadata (files: `scripts/`, `public/content/`, `README.md`, `MIGRATION_REPORT.md`)

1. Write `scripts/refresh-catalog-metadata.mjs` (add `"refresh:metadata"` to package.json scripts).
   It is idempotent and rewrites `public/content/catalog.json` **and** each
   `public/content/missions/*.json` top-level metadata only — never `files[]`.
   - `summary`: from the Field Manual (LEARN.md → README.md → first markdown file). Skip the h1,
     skip any paragraph matching `/read this (before|alongside)/i`, skip tables, blockquotes,
     horizontal rules, HTML comments and headings, skip paragraphs shorter than 40 chars. Take
     the first remaining paragraph, strip markdown (`**`, `*`, backticks, links → text,
     emoji shortcodes untouched), collapse whitespace, cut at a sentence boundary ≤ 180 chars
     (append "…" only if cut mid-sentence). Existing summaries that are *not* boilerplate
     (e.g. dsa, production worlds) stay as they are.
   - `concepts`: first 8 h2/h3 headings excluding the h1, excluding any heading matching
     `/how to use this guide|what you need installed|glossary|self-check|table of contents/i`,
     with leading numbering (`1. `, `2.1 `) and emoji stripped, trimmed, deduplicated.
   - `estimatedMinutes`: reading-based: `ceil(markdownWords / 180) + 4 * codeFileCount`,
     clamped to 8–90. Print a before/after histogram.
   - `kind: "reference"` for exactly the five ids listed above: set `challenges: []`,
     `xp: 0`, `prerequisites: []`, and rewire every mission that listed a reference id as a
     prerequisite to the nearest earlier non-reference mission in the same world (or `[]` if
     it is the first). Keep `order` values untouched (saved progress is keyed by id/order).
   - Keep all other fields byte-identical. Preserve key order. Update
     `migration-report.json` only if it stores per-mission metadata that changed (check).
2. Update `scripts/verify-content.mjs`: reference entries must have 0 challenges and empty
   prerequisites and must not be referenced by any prerequisite; non-reference missions keep the
   3-gate / gated-when-order>1 rules **except** a mission whose only earlier neighbours are
   references may be ungated. Print counts of missions vs references. Gate count line should
   read e.g. `Challenge gates: 987`.
3. Run `npm run refresh:metadata && npm run verify:content` → PASS. Spot-print 15 random
   summaries/concepts (mixed worlds) in your report.
4. Update the hard-coded counts in `README.md` and `MIGRATION_REPORT.md` (missions, gates,
   references). Add a short "Reference documents" paragraph to README.
5. Do not touch `src/` or `tests/`.

## Stream B — app shell for short sessions (files: `src/**` except `src/main.tsx` and `src/types.ts`, `tests/**`, `scripts/browser-smoke.mjs`)

Principles: keep the explicit-save / accepted-record model (it is a teaching point in
`astraupskill/`), keep every existing Playwright test passing, and keep desktop working.

1. **Save panel placement.** Render `SavePanel` only on the recovery screen, the startup/
   onboarding screens, and the **Loadout & saves** (profile) page. On the other views replace it
   with nothing; when `saveError` or `pending` is set, show a compact dismissible banner at the
   top of the main shell with one button "Open saves" that navigates to profile.
2. **Mission page = three sections with a sticky segmented switcher** (`Read` · `Lab` · `Gates`),
   placed directly under the mission title. On viewports ≥ 1050 px keep today's two-column layout
   (lesson + lab left, gates rail right) and hide the switcher. Below 1050 px show one section
   at a time. Default section on open: `Gates` if the mission has drafts or ≥1 gate done, else
   `Read`. Persist the last section per mission in `localStorage` key
   `skillforge.quest.ui.v1` (a small JSON object; wrap every read/write in try/catch; this key is
   UI preference only and is **not** part of the save document, imports, or exports).
   Move `CodeLab` below the lesson on desktop and into the `Lab` section on mobile.
3. **Draft bar.** Replace the big `.mission-draft-bar` with a slim sticky bottom bar (above the
   phone nav) that appears only when the mission has unsaved changes: "Unsaved drafts ·
   [Save]" plus a subtle "Checkpoints are self-reported" line. Keep the button text
   "Save mission drafts" (tests click it).
4. **Draft recovery (separate from the save document).** Debounce (400 ms) writes of the
   mission's draft responses (`responses` entries for this mission id, including `code-lab`)
   to `localStorage` key `skillforge.quest.drafts.v1` as `{ [missionId]: { [challengeId]: text } }`.
   On mission open, if an entry exists whose values differ from `progress.responses`, load it into
   `draftProgress`, mark dirty, and show a notice "Recovered unsaved drafts from this device."
   Delete the entry on successful save/checkpoint. Storage `null`/quota errors must be swallowed
   (drafts are a convenience, never a source of truth). `beforeunload` guard stays.
   Add a unit test for the pure helpers (put them in `src/game/drafts.ts`).
5. **Lesson reader.** Split the active markdown file on `##` headings (keep content before the
   first `##` as an intro). Render a "Contents" list (heading text, tap to jump) and each
   section as a collapsible block (`<details>`-style with a real button, `aria-expanded`).
   On mobile only the intro and the last-opened section are open by default; on desktop all open.
   Remember the last-opened section + file per mission in the same `ui.v1` key and restore it.
   Code files (non-markdown) render as today. Do not add dependencies — use `react-markdown`
   per section.
6. **Dashboard for a 1-minute session.** Order: (a) if reviews are due, a "Review now · N due"
   card first (navigates to reviews); (b) "Continue" resumes `progress.lastMissionId` when that
   mission is unlocked and not complete, otherwise the first unlocked incomplete mission;
   (c) worlds grid. Skip `kind === "reference"` entries when choosing "next".
7. **Reference entries in the UI.** In the map, render `kind === "reference"` nodes with a
   "Reference" label, always enabled, action "Open", no XP/gates meta, no path-line state
   change. On the mission page for a reference entry: no gates rail, no lab, no draft bar,
   no "prediction gates reference files" lock (nothing is locked), and a "Back to map" action.
   Exclude references from every completion count and percentage (sidebar, world cards,
   journey banner, topbar "missions" count → count missions only, profile).
8. **Phone nav & tap targets.** Bottom nav labels ≥ 0.66 rem and visible; nav height 60 px +
   `env(safe-area-inset-bottom)`; all buttons/tabs ≥ 44 px tall on ≤ 720 px; world tabs scroll
   horizontally with the active tab scrolled into view. Add `<meta name="theme-color">` only if
   `index.html` is edited by Stream C — otherwise leave `index.html` alone.
9. **Tests.** Extend `tests/learning.spec.ts`: (a) at 390×844, opening a mission shows the
   title and the switcher above the fold and `Gates` is reachable in one tap; (b) draft recovery
   after a reload restores an unsaved answer and saving clears the drafts key; (c) reference
   node opens without gates; (d) no horizontal overflow on mission/map/profile at 390 px. Keep
   the existing tests green (they click "Save mission drafts", "Loadout & saves",
   "Mission map", `.mission-node.available`, the lab textarea `aria-label`, etc. — preserve those
   accessible names). Run `npm test`, `npm run build`, and `npm run test:browser` and report.

Split `src/App.tsx` (1,525 lines) as you go: at minimum `src/components/MissionScreen.tsx`,
`src/components/LessonReader.tsx`, `src/components/Dashboard.tsx`. Keep prop names stable.

## Stream C — installable / offline on the phone (files: `index.html`, `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `src/main.tsx`, `vite.config.ts`)

1. Add a web app manifest (name "SkillForge Quest", short_name "SkillForge", `display:
   standalone`, dark `background_color`/`theme_color` matching `--bg` in `src/styles.css`,
   192/512 PNG icons generated with a tiny Node script — a rounded square with "SF" — and
   a maskable variant). Link it plus `theme-color` and `apple-mobile-web-app-*` metas in
   `index.html`.
2. Add `public/sw.js`: precache the app shell on install (`/`, `/index.html`, built assets are
   hashed so use a network-first strategy for navigation and same-origin `assets/`), and
   **cache-first with background refresh** for `/content/catalog.json` and
   `/content/missions/*.json` so a mission opened once is readable offline. Cap the mission
   cache at 60 entries (LRU by insertion). Register it from `src/main.tsx` only in production
   builds (`import.meta.env.PROD`) and only when `serviceWorker` is supported. Never intercept
   `localStorage`-related behaviour; never cache POST.
3. Ensure `npm run build` copies `manifest.webmanifest` and `sw.js` unchanged (Vite `public/`
   does). Verify with `npm run preview` + Playwright: manifest served with correct type,
   SW registers, a mission JSON is served from cache on second load with network disabled
   (`context.setOffline(true)`). Put that check in `scripts/offline-check.mjs` (not in the
   Playwright suite) and report its output.
4. Do not touch `src/App.tsx`, `src/styles.css`, `src/types.ts`, `public/content/`, or `tests/`.

## After all streams

Fable runs: `npm run verify:content`, `npm test`, `npm run build`, `npm run test:browser`,
re-measures the phone layout, reviews diffs, then commits per stream.
