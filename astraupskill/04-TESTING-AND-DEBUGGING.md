# Test observable outcomes across the save boundary

Run the model checks with `npm test`. These tests exercise pure progression rules and injected storage/lock adapters. They include malformed saves, legacy defaults, conflicting proposals, quota failures, reset generation changes, note operations, and catalog relationships. Injection makes a difficult failure deterministic: a fake `setItem` can throw every time without actually filling your browser profile.

Run `npm run build` to check TypeScript and production bundling. Compilation does not prove that a delete confirmation works or that a second tab preserves its draft. For those behaviors, install the Playwright Chromium runtime once with `npx playwright install chromium`, then run `npm run test:browser`. The configured server binds loopback port 4287 with strict port selection; it refuses to reuse an unrelated existing server. Tests create isolated browser contexts rather than modifying your ordinary profile.

The browser suite covers onboarding, note CRUD and identity, search, reload persistence, confirmed deletion, competing tabs, pending exports, quota failures, corrupt-data recovery, mission drafts, import replacement, fetch retries, worker assertions and timeouts, and narrow layouts. Download assertions read the actual downloaded bytes. This catches a recovery button that appears functional but exports the wrong snapshot.

## A reproducible conflict investigation

1. Create a note and open the same app URL in a second tab.
2. Begin an edit in each tab before saving either one.
3. Save Tab A, then save Tab B. Expect a conflict in B and unchanged accepted storage.
4. Export B's pending draft. Inspect its title and revision in a text editor.
5. Load current progress in B after confirming the discard. Reapply the intended edit against the new snapshot.

Write down all three representations: A's accepted value, B's draft, and the actual storage value. “The UI looks stale” is too vague to diagnose which boundary failed.

## Other useful fault experiments

Block `/content/catalog.json` in a disposable browser session and verify that Retry catalog works after restoring the response. Block one mission archive and verify Retry mission independently. Run `console.assert(false, "edge case")` in the scratch lab: the result must say ERROR. Run `while(true){}`: the worker must stop after its timeout rather than freezing the page. Log a thousand lines and confirm that output is bounded.

Finally run `npm run verify:content`. It recomputes archive evidence for all 334 missions and 1,839 preserved source files. This protects historical teaching content while the application around it changes. Record exact commands and outcomes; do not describe an unrun browser, deployment, or security audit as verified.
