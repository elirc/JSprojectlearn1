# 01 — Repo state and the first commit

## What this repo is now

`SkillForge Quest` — a React 19 + TypeScript + Vite app that turns a software-engineering
curriculum into a gamified, gated learning journey. Each mission requires three written
checkpoints (recall → prediction → build evidence) before the next node unlocks. Progress is
stored in `localStorage`.

```
index.html
package.json                # scripts: dev, build, preview, test, verify:content
vite.config.ts, tsconfig.*.json
src/
  App.tsx                   # 1,183 lines — whole UI: map, mission view, gates, lab, saves
  game/engine.ts            # 156 lines — XP, unlocks, streaks, spaced repetition
  game/engine.test.ts       # 7 vitest tests
  game/storage.ts, types.ts, styles.css, main.tsx
scripts/
  verify-content.mjs        # npm run verify:content — the content contract
  browser-smoke.mjs         # chromium end-to-end smoke test
public/content/             # 13 MB — the entire curriculum, as JSON (see 02)
README.md, MIGRATION_REPORT.md
```

Toolchain: React 19.2, TypeScript 7, Vite 8, Vitest 5, Node ≥ 22.

Commands:

```bash
npm install
npm run dev
npm test                 # vitest run src
npm run verify:content
npm run build            # tsc -b && vite build
node scripts/browser-smoke.mjs
```

## ⚠ Do this before anything else

The working tree is **mid-migration and uncommitted**:

- **1,772 staged deletions** — the old per-lesson directories (`01-fizzbuzz/`,
  `02-count-characters/`, …) were absorbed into `public/content/` and deleted.
- **`public/`, `scripts/`, `src/` are untracked.** None of the current application is in git
  history yet.
- `.gitignore` is modified.

```bash
git status --short | wc -l     # ~1,772
git add -A
git commit -m "Migrate lesson directories into SkillForge Quest app"
```

Commit this **before** generating content. Otherwise the 3,006-mission diff is tangled with
the migration diff and neither is revertible.

The original lesson source files (LEARN.md / PRACTICE.md / README.md / solutions per
directory) still exist in git history at commit **`6b5ff4c`** —
`git show 6b5ff4c:01-fizzbuzz/LEARN.md` — if you ever want to consult an original outside the
JSON archive.

## Recent history

```
6b5ff4c  Expand repo to 263 projects across 5 tracks with full learning layers
63840b6  Initial commit: JSProjectLearn snapshot
```

Branch: `main`. Git user: `elirc`.

## Current curriculum size (from `npm run verify:content`)

- 10 worlds
- 334 missions
- 1,002 challenge gates (3 per mission)
- 1,839 archived source files, 10,172,345 bytes
- `public/content/` on disk: ~13 MB
