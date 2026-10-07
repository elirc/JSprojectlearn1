# SkillForge Quest migration report

> **Status note (2026-10-06):** this is the record of the original migration and its counts are frozen. The archive has since grown: `npm run verify:content` now reports 12 worlds, 336 catalog entries (331 missions + 5 reference documents), 993 gates and 1,851 archived files (10,193,564 bytes), after the Effect Forge and Agent Works worlds were added. See the README for current numbers.

## Outcome

The former collection of separate lesson directories has been transformed into one React and TypeScript learning application. The originals were captured verbatim in the content archive, verified by SHA-256, and then removed from the working tree as requested.

## Content retained

- 334 catalog entries: 329 playable missions and 5 reference documents
- 987 required challenge gates (3 per mission; reference documents have none)
- 1,839 archived source and lesson files
- 10,172,345 archived bytes
- 10 curriculum worlds spanning JavaScript, TypeScript, React, algorithms, production engineering, and an optional C# track
- Full source paths, language metadata, byte counts, and SHA-256 hashes in `public/content/migration-report.json`
- Mission `summary`, `concepts`, and `estimatedMinutes` derived from the archived Field Manual by the idempotent `npm run refresh:metadata`; archived `files[]` content and hashes are never rewritten

Generated build artifacts such as `bin`, `obj`, `.vs`, and prior distribution folders were intentionally excluded because they were not authored lessons or source material.

## Product changes

- Added a responsive React 19 + TypeScript + Vite application.
- Added onboarding with callsign and focus-block selection.
- Added sequential mission prerequisites and locked world transitions.
- Added recall, prediction, and build-evidence gates to every mission (reference documents are exempt and stay unlocked).
- Gated reference, solution, answer, and refactored files until prediction is complete.
- Added per-gate and per-mission XP, levels, streaks, badges, and progress maps.
- Added a persistent JavaScript scratch lab that executes in an isolated Web Worker and stops infinite loops after 2.5 seconds.
- Added contextual hints and preserved-file tabs inside each Field Manual.
- Added spaced repetition using 2, 7, 30, 90, 180, and 365-day intervals, plus a ten-minute retry after a miss.
- Added automatic local saving and portable JSON export/import.
- Added responsive desktop/mobile layouts, keyboard focus states, semantic controls, live result regions, and reduced-motion support.

## Verification completed

- Seven progression, idempotency, review-scheduling, streak, and prerequisite tests pass.
- Production TypeScript/Vite build passes.
- Archive verification passes for all 1,839 files and 987 gates.
- Chromium smoke test passes onboarding, locked nodes, mission loading, runnable lab output, all three gates, XP awards, next-node unlock, and persistence after reload.
- Desktop and 390×844 mobile layouts were visually inspected.
