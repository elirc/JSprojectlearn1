# Follow the data, not only the folders

The main entry is [App.tsx](../src/App.tsx). It loads the static catalog, reads browser progress, chooses the visible screen, and owns the accepted `GameProgress`. Its `commitProgress` function coordinates saving. Components propose a new value; they receive the accepted value only after persistence succeeds. This is the most useful starting point when investigating a report such as “my note vanished after refreshing.”

[LearningNotes.tsx](../src/components/LearningNotes.tsx) owns the note editor. Opening an editor captures the accepted progress as `base`. The title, body, and linked mission then change independently. Search and pagination operate on accepted notes, so an unsubmitted title does not silently appear as a saved card. The list shows twenty records per page and sorts by update time, then stable identifier. Deletion requires confirmation, while a failed save keeps the editor open.

[notes.ts](../src/game/notes.ts) contains pure create, update, and delete operations. “Pure” means the operation returns a candidate without writing storage or mutating its input. Creation checks identity uniqueness. Updating locates the existing identity rather than deleting and recreating the record. Deletion rejects a missing record. Each operation passes its candidate through the same normalization boundary used by imports.

[schema.ts](../src/game/schema.ts) validates unknown external values. A TypeScript interface disappears at runtime; a JSON import can still contain negative XP, repeated identities, a note with no title, or an unknown mission. Structural normalization checks shape and bounds. `validateAgainstCatalog` then checks relationships against the shipped curriculum, including prerequisites and completed gates. These are separate questions: “is this field a string?” and “does this mission actually exist?”

[storage.ts](../src/game/storage.ts) owns the browser boundary. It reads the original key, coordinates cooperating tabs with Web Locks, compares revision and epoch, writes once, and returns the accepted snapshot. [SavePanel.tsx](../src/components/SavePanel.tsx) exposes recovery actions without automatically replacing damaged data. [engine.ts](../src/game/engine.ts) owns mission completion, XP, unlocks, and spaced review scheduling. [lab.ts](../src/game/lab.ts) owns worker execution and cleanup.

The files in `public/content/` are the preserved curriculum archive. Application improvements do not require rewriting those embedded source files. `scripts/verify-content.mjs` verifies the archive hashes and relationships. Unit tests live beside the game modules; [browser tests](../tests/learning.spec.ts) cross the React and browser boundaries. When changing behavior, identify the smallest owner of the rule first, then find the test that can observe its consequence.

## In scope and out of scope in `src/game/`

| file | scope | why |
|---|---|---|
| `notes.ts`, `schema.ts`, `storage.ts` (+ `storage.test.ts`) | **in** | the CRUD, validation, revision and persistence lessons |
| `drafts.ts` (+ `drafts.test.ts`, 15 cases) | in, second pass | draft-versus-accepted state |
| `engine.ts` (+ `engine.test.ts`), `lab.ts`, `lesson.ts` | out | game mechanics; read only if a test you touch imports them |
| `catalog.ts` and the 331-mission archive | out | content, not behavior |

