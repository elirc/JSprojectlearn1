# SkillForge Quest: build reliable CRUD from a learning journal

This course uses the application you are running as the worked example. SkillForge has 334 archived missions, but reading those missions alone does not demonstrate that you can maintain a web application. Here you will follow one feature through forms, domain rules, browser persistence, concurrency, failure recovery, and tests. The feature is a mission-linked learning journal. You can create notes, list and search them, edit their contents without changing their identity, and delete them after confirmation.

Start with Node 22 or newer, then run `npm ci` and `npm run dev` from this project folder. Open the URL printed by Vite. Create a callsign, open **Loadout & saves**, and create a note titled “Why a draft is not a saved record.” In its body, describe what should happen when storage fails. Reload the page and verify that the note survives. Export a backup before experimenting with resets or imports.

## Prerequisites and glossary

**Prerequisites:** TypeScript with React hooks, promises and `async`/`await`, `localStorage` and JSON, and running a Vitest file. The vanilla browser course in `04 JavaScript Training/react` is a lighter predecessor.

| Term | Meaning here | Where in this project |
|---|---|---|
| accepted progress | The saved record returned by storage, as distinct from what a component is holding. | `loadProgress` and `persistProgress` in `src/game/storage.ts` |
| revision | The counter a save must match and that an accepted save raises by one. | `proposal.revision !== current.revision` in `persistProgress`, `src/game/storage.ts` |
| epoch | The identity of a save file, so a reset is not mistaken for an edit. | `epoch` in `persistProgress`, `src/game/storage.ts` |
| web lock | Serialises two saves in the same browser before the compare runs. | `browserLock` in `src/game/storage.ts` |
| normalization | Turning untrusted stored JSON into a valid domain object or an error. | `normalizeProgress` and `normalizeNote` in `src/game/schema.ts` |
| catalog validation | Rejecting progress that refers to missions the catalog does not contain. | `validateAgainstCatalog` in `src/game/schema.ts` |
| bounded write | A size ceiling enforced before anything is stored. | `boundedJson` and `MAX_SAVE_BYTES` in `src/game/schema.ts` |
| draft store | Unsaved mission text kept apart from accepted progress. | `readMissionDrafts` and `writeMissionDrafts` in `src/game/drafts.ts` |
| commit boundary | The single place a proposal becomes accepted state for the UI. | `commitProgress` in `src/App.tsx` |
| identity vs content | Editing a note changes its text and `updatedAt`, never its id. | `updateNote` in `src/game/notes.ts` |
| recovery export | A serialized copy that can be read back after a failed save. | `serializeProgress` and `parseProgressExport` in `src/game/storage.ts` |

## Setup, in one block

```powershell
node --version                    # 22.x
npm ci
npx playwright install chromium   # only for the browser suite
npm test                          # vitest, src/**
npm run build
npm run verify:content
npm run test:browser              # playwright, tests/
```

## Suggested learning sequence

1. Read [the codebase map](01-CODEBASE-MAP.md), then locate the component, pure domain operation, schema validator, and storage adapter yourself. Explain why each owns a different decision.
2. Work through [the concepts](02-CONCEPTS.md). Draw two tabs reading revision 3 and trying to save revision 4. Predict which proposal must be rejected.
3. Follow [the worked change](03-WORKED-CHANGE.md), changing one note and observing the returned accepted revision. A successful button click is insufficient evidence; inspect the durable value and reload.
4. Run [the debugging checks](04-TESTING-AND-DEBUGGING.md), including a storage quota failure and competing edits. Record the expected state before pressing Save.
5. Complete [the practice tasks](05-PRACTICE.md) before reading [the review guidance](06-SOLUTIONS-AND-REVIEW.md). Finish with [the trace lab](07-TRACE-LAB.md).

Allow several focused sessions. A useful session produces a small diff, a reproducible check, and a short explanation of one tradeoff. For example, “I kept the old accepted record after a failed write because displaying the candidate as saved would mislead the learner.” That explanation is stronger than “I added error handling.”

The current application is a local learning tool. It has no authenticated server, SQL database, shared team workspace, or protected grading service. Mission gates accept self-reported reasoning of a minimum length. They do not establish correctness or prevent cheating. The scratch worker isolates execution from the main UI thread and stops long runs; it is not a security sandbox. Use these limits to identify the next design questions, not to claim production readiness. [Verification](VERIFICATION.md) separates executed checks from future practice.
