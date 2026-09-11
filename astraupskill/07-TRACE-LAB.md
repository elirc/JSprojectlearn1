# Trace lab: connect a click to an accepted record

Use a disposable browser context and export any progress you want to keep. Open developer tools and locate the `skillforge.quest.progress.v1` local-storage value. Do not edit your main learning profile for this exercise. Keep a short table with columns for action, editor base revision, stored revision, stored epoch, visible accepted title, and draft title.

## Trace A: a normal note update

Create “Boundary notes” and record the saved revision. Open Edit and change the title to “Runtime boundary notes.” Before saving, inspect storage: its title and revision should be unchanged. Place a breakpoint in `LearningNotes.save`, then step through `updateNote`, `App.commitProgress`, and `persistProgress`. Observe that the schema is checked before the lock callback writes anything. Inside the callback, compare the proposal and current revision/epoch. After `setItem` returns, inspect the accepted object returned to the parent. The editor closes only after that acceptance.

## Trace B: a competing writer

Open another tab before editing. Capture a draft in both tabs. Save the first tab and observe the storage event warning in the second. The warning does not replace the second tab's fields. Submit there and follow the conflict exception back through the promise chain. The parent retains a pending proposal; the editor retains its input. Export pending data and compare its revision with current storage. Loading current progress requires an explicit discard confirmation and returns the view to the command deck.

## Trace C: reset generations

Leave an editor open in one tab. In the other, export a backup and reset saved progress. Compare epochs before and after the reset. The numeric revision restarts, but the epoch changes. Try submitting the old draft. It must fail even if its numeric revision happens to match a later revision in the new generation. Explain the difference between a record version and a generation identifier in your own words.

## Trace D: mission progress and evidence

Enter FizzBuzz, type an answer and scratch code, and inspect storage before pressing Save mission drafts. Submit one gate and inspect the response key, completed checkpoint list, XP, and revision together. The gate is self-reported evidence; satisfying minimum length does not prove the explanation correct. Complete a scheduled review when it becomes due and inspect the latest review response alongside its updated schedule. A premature repeat should be rejected by the engine.

Finish with a one-page engineering note: describe the invariant, the observable failure, the smallest owning module, and the test that would catch a regression. Then identify which parts would move to a server in a multi-user CRUD application and which UI draft responsibilities would remain in React.
