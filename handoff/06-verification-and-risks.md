# 06 — Verification and risks

## Run after every wave

```bash
npm run build:content          # the generator you wrote (step 1)
npm run verify:content         # hashes, counts, gates, prerequisites — must print PASS
npm test                       # 7 vitest engine tests in src/
npm run build                  # tsc -b && vite build
node scripts/browser-smoke.mjs # onboarding → mission → gates → unlock → reload
```

`verify:content` prints world count, mission count, archived files, bytes and gate count
before the PASS line — use it as the running scoreboard toward 3,340 / 10,020.

## Manual spot-check, three random new missions per wave

1. The mission's Field Manual pane opens on `LEARN.md` and renders correctly.
2. `summary` and `concepts` on the map read well — this catches a bad first paragraph or a
   `LEARN.md` whose headings are not a real table of contents.
3. `solution.js` / `solution.test.js` are **locked** until the prediction gate is cleared;
   `attempt.js` is visible from the start.
4. All three gates accept an answer of the required length and award 30 / 40 / 70 XP.
5. Completing the mission unlocks the next node in that world and no others.
6. The scratch lab still runs and still times out at 2.5 s.

## Risks — decide these before wave 1

**1. `catalog.json` grows ~640 KB → ~6.4 MB**, fetched in full at app startup
(`src/App.tsx:46`). This will visibly hurt first load. Options:

- (a) **Drop `challenges` from catalog entries** and rehydrate them client-side from the fixed
  template — they are byte-identical on all 3,340 missions apart from two substitutions. This
  alone removes most of the bulk. Note `scripts/verify-content.mjs` reads `mission.challenges`
  from the catalog, so it must be updated in the same change.
- (b) Drop `concepts` from the catalog and read them from the mission file on open.
- (c) Shard the catalog per world and lazy-load worlds.

Recommended: (a) + (b), and revisit (c) if it is still slow.

**2. `public/content/` grows ~13 MB → ~130 MB**, all committed to git. Confirm with the user
that they want ~130 MB of generated JSON in the repository before wave 1. Alternative: commit
`content-src/` only and generate `public/content/` at build time (add it to `.gitignore` and
run `build:content` in the `build` script). This is probably the right call at this scale and
is much easier to adopt before the first wave than after the tenth.

**3. World map rendering.** `src/App.tsx:303` renders every world's nodes. React Reactor will
have 610 nodes and Production Nexus 630. Expect this to need virtualization, collapsing, or
per-world pagination. Check it in the browser right after wave 1 rather than at the end.

**4. Duplicate and near-duplicate topics** across 20 parallel agents. Mitigated by producing
`content-src/PLAN.md` before wave 1 and by asking each agent to flag suspected duplicates in
its report.

**5. Unverified lesson code.** Generated solutions that were never executed are the most
likely quality failure. Require `node --test` output in every agent report; consider a CI-style
script that runs every `content-src/**/solution.test.js` after each wave.

**6. Progress compatibility.** `GameProgress` is stored in `localStorage` under
`skillforge.quest.progress.v1` and keyed by mission id. Since existing ids and `order` values
are never modified, saved progress stays valid. Do not renumber existing missions.

**7. Docs drift.** `README.md` ("334 missions", "1,002 gates", "1,839 preserved source files")
and `MIGRATION_REPORT.md` hardcode the counts. Update both at the end.
