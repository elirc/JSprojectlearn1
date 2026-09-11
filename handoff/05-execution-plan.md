# 05 — Execution plan

## Build order

### Step 0 — commit the pending migration
See `01-repo-state.md`. Do not skip.

### Step 1 — write the generator *first* (highest-leverage step)

`scripts/build-content.mjs`. It is the only thing allowed to write `public/content/`.

Input: `content-src/<worldId>/<NNN>-<slug>/*` — plain authored lesson files.
Output: `public/content/catalog.json`, `public/content/missions/*.json`,
`public/content/migration-report.json`.

Requirements:

1. Walk `content-src/`, group files by mission directory, sort files deterministically.
2. For each file compute `bytes` (UTF-8 byte length), `sha256(Buffer.from(content,"utf8"))`,
   and `language` from the extension (mapping in `02-content-system.md`).
3. Pick the Field Manual with the app's own rule: `LEARN.md` → `README.md` → first file.
   Parse `summary` (first prose paragraph after the h1) and `concepts` (first 8 h2/h3
   headings, h1 excluded).
4. Apply the metadata formulas: `estimatedMinutes = 20 + 8*fileCount`,
   `difficulty = clamp(ceil(fileCount/3),1,5)`, `xp = 200`, `bytes = Σ file bytes`.
5. Build the three gates from `handoff/templates/gates.json`, substituting `<TITLE>` and
   `<FIRST CONCEPT>`.
6. Assign `order` and `prerequisites` per `03-expansion-spec.md`.
7. **Preserve the 334 existing missions unchanged.** Two workable approaches:
   - treat `public/content/missions/*.json` as the input of record for missions that have no
     `content-src/` directory, and re-emit them byte-identically; or
   - first back-fill `content-src/` from the existing JSON (a one-time extraction script), then
     generate everything from one source. Cleaner long-term; verify byte-identical output
     before trusting it.
8. **Assert global `id` uniqueness**; fail loudly on collision.
9. Be **idempotent** — running twice produces byte-identical output apart from `generatedAt`.
10. Update `migration-report.json` counts and `sourceHashes[]`.

Validate the generator on a **2-mission `content-src/` sample** and get
`npm run verify:content` to print PASS **before** spawning any authoring agents.

Add to `package.json`: `"build:content": "node scripts/build-content.mjs"`.

**Keep `content-src/` out of the app build.** It will contain `.ts`/`.tsx` teaching files that
deliberately throw or fail. Exclude it in `tsconfig.app.json`; `npm test` already scopes to
`src` only, so leave that as is.

### Step 2 — write the curriculum outline before any lessons

One agent per world (or one agent for all 10) produces `content-src/PLAN.md`: the full list of
3,006 mission titles + slugs + one-line scope each, grouped by world and numbered from 101.
Commit it.

Without a shared outline, 20 parallel agents produce large numbers of near-duplicate lessons —
"debounce" written nine times across three worlds. The outline is also what you slice into
per-agent assignments.

### Step 3 — author in waves

- **Wave size:** 20 agents × 15 missions = **300 missions per wave** → **~10 waves**.
- 150 missions per agent in a single turn is not realistic; 15 well-made missions is.
- **Partition by world and `NNN` range** so no two agents ever touch the same directory. Give
  each agent an explicit, non-overlapping list of `NNN-slug` directories from `PLAN.md`.
- After each wave: `npm run build:content && npm run verify:content && npm test`, then commit.
  Ten commits, each independently revertible.
- Spot-check three random new missions in the running app after each wave (see
  `06-verification-and-risks.md`).

### Step 4 — finish

Update `README.md` and `MIGRATION_REPORT.md` counts, run the full verification checklist, and
commit.

## Ready-to-paste agent prompt

> Author **15 new missions** for world `<worldId>` in this repository, under
> `content-src/<worldId>/`, one directory per mission named `<NNN>-<slug>`. Your exact
> assignment (do not deviate, do not add or skip any):
>
> ```
> <NNN>-<slug>   — <one-line scope from PLAN.md>
> … 15 lines …
> ```
>
> **Read first, in this order:** `handoff/04-authoring-style.md`, then the canonical mission —
> `node -e "const j=require('./public/content/missions/dsa-dsa-01-two-sum.json');for(const f of j.files)console.log('\n===== '+f.path+' =====\n'+f.content)"`
>
> **Each mission is 7 files:** `LEARN.md`, `README.md`, `PRACTICE.md`, `attempt.js`,
> `attempt.test.js`, `solution.js`, `solution.test.js`. (Use the per-world extensions from
> `04-authoring-style.md` — `.ts` for `typescript`, `.tsx` for `react`, C# layout for
> `csharp`.) Skeletons are in `handoff/templates/`.
>
> **`LEARN.md` rules:** 200–300 lines. It opens with an h1 title, then ONE strong paragraph —
> that paragraph becomes the mission summary shown on the world map. Then numbered h2 sections
> in the rhythm problem → prerequisites → mental model → common wrong turns → solution →
> tradeoffs → variations. The first 8 headings become the mission's public concept list, so
> they must read as a real table of contents. Second person, warm and direct; name the mistake
> before the fix; short runnable snippets with results in comments; ASCII diagrams for data
> flow.
>
> **Verify your own work:** every `solution.js` must pass its `solution.test.js` under
> `node --test`. Run it. Report the result per mission. `attempt.js` must contain a `TODO`
> throw and `attempt.test.js` must use the skip guard from `handoff/templates/attempt.test.js`.
>
> **Do not:** write any JSON, touch `public/content/`, edit `catalog.json`, edit
> `migration-report.json`, or modify `src/`. The generator script handles all of that. Do not
> create directories outside your assigned list.
>
> **Report back:** the list of directories you created, the `node --test` result for each, and
> any topic in your list you think duplicates another mission.

## Scale sanity check

3,006 missions × ~30 KB ≈ **90 MB of new content**, ≈ 21,000 new files. At 15 missions per
agent turn that is ~200 agent turns. Budget accordingly, and read
`06-verification-and-risks.md` §Risks before wave 1 — two of them (catalog size, repo size)
are worth deciding with the user rather than discovering at wave 8.
