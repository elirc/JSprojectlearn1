# SkillForge Quest

SkillForge Quest turns the original software-engineering curriculum into an active, persistent campaign. You do not mark lessons complete by opening them: each mission requires recall, a prediction, and build evidence before the next node unlocks.

## Start the journey

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, create a callsign, and begin with **01 — FizzBuzz**. Profile submission saves in this browser. Mission answers and scratch code remain drafts until you choose **Save mission drafts** or submit a checkpoint.

## How a mission works

1. **Recall checkpoint** — explain the idea from memory, including a boundary or failure.
2. **Prediction checkpoint** — commit to expected behavior before seeing reference solutions.
3. **Build & prove** — run an experiment, test the edge cases, and record reproducible evidence.
4. **Unlock** — completing all three gates awards mission XP, schedules a review, and opens the next node.

Each mission also includes:

- the most explanatory lesson file selected as its Field Manual;
- every original lesson, source, test, and exercise in searchable file tabs;
- reference and solution files visually gated until the prediction checkpoint is cleared (the static archive is not access-protected);
- a JavaScript scratch lab with explicit draft saving, bounded output, and a worker timeout;
- contextual hints, concepts, difficulty, estimated time, and XP;
- spaced retrieval at 2, 7, 30, 90, 180, and 365 days.

## Learning styles supported

- **Learn by explaining:** retrieval prompts and teach-it-back answers.
- **Learn by predicting:** commit before revealing reference code.
- **Learn by doing:** the active lab and build-evidence gate.
- **Learn by debugging:** failure modes, edge cases, and short retry intervals.
- **Learn visually:** world map, node state, progress bars, XP, streaks, and badges.
- **Learn in short sessions:** choose a 15, 30, 45, or 60-minute focus block.
- **Learn by revisiting:** the Memory Forge uses expanding spaced-repetition intervals.

## Saving progress

Progress, answers, lab drafts, reviews, XP, and unlocks are stored in `localStorage` under `skillforge.quest.progress.v1`.

Use **Loadout & saves → Export save** for a portable JSON backup. **Import save** restores that backup on another browser or device. Export regularly; clearing site data removes the browser copy.

## Curriculum archive

The static archive under `public/content/` contains **334 catalog entries** — **329 missions** plus **5 reference documents** — **987 gates**, and **1,839 preserved source files** across ten worlds:

1. Syntax Frontier
2. Builder's Borough
3. Refactor Ridge
4. Async Expanse
5. Product Citadel
6. Type Temple
7. React Reactor
8. Algorithm Arena
9. Production Nexus
10. C# Side Expedition (optional)

The C# material is retained as an optional expedition; the application and primary journey use JavaScript, TypeScript, and React.

### Reference documents

Five catalog entries are orientation material rather than build missions: the JavaScript handbook, the 50-question quiz, the repository README, the offline start-here guide, and the production skills diagnostic. They carry `kind: "reference"`, have no gates, award no XP, are always unlocked, never appear in another entry's prerequisites, and are excluded from completion counts and percentages. Missions that previously sat behind one of them were rewired to the nearest earlier mission in the same world.

## Quality checks

```bash
npm test
npm run verify:content
npm run build
```

Mission `summary`, `concepts`, and `estimatedMinutes` are derived from the archived Field Manual by `npm run refresh:metadata` (`scripts/refresh-catalog-metadata.mjs`). It is idempotent, rewrites top-level metadata only, and never touches the hashed `files[]` arrays.

`verify:content` recomputes every archived file hash and validates mission counts, reference-document invariants, prerequisites, and all challenge gates. See [MIGRATION_REPORT.md](./MIGRATION_REPORT.md) for the transformation report.

## Reliable saves and learning-note CRUD

Open **Loadout & saves** to create, read, search, update, and delete mission-linked learning notes. Saves use a captured revision and reset generation under a Web Lock. A competing tab or storage failure keeps the editor and offers a pending export. **Load current progress** discards drafts only after confirmation. Invalid saved data is preserved for raw export before a confirmed reset. Imports validate the complete bounded document and catalog relationships before confirmed replacement. Use localhost or HTTPS in a browser with Web Locks.

Progression gates are self-reported evidence, not automated grading. The lab reports failed assertions and exceptions, caps output, and terminates long runs; it is not a security sandbox. Latest review reasoning is saved when its rating is accepted. There is no backend, account authorization, SQL store, or automatic cross-device synchronization.

Read the detailed [CRUD learning course](astraupskill/README.md), including worked changes, failure experiments, and a path to a real API and SQL database. For browser verification run `npx playwright install chromium` once, then `npm run test:browser`. The tests use an isolated browser profile and loopback port 4287.
