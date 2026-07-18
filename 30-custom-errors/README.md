# 30 — Custom errors

**Lesson: one failure convention (throw), your own error classes, and catching only
at the boundary.**

## Run it

```
node 30-custom-errors/original.js
node 30-custom-errors/refactored/cli.js grace 41
node 30-custom-errors/refactored/cli.js x 8
node --test 30-custom-errors/
```

## What's wrong with the original?

Run it and read the second output: **both validations failed and registration
succeeded anyway** — the database gains a user named `"ERROR: too short"`, age `-1`.
That's the inevitable end state of error-as-return-value conventions:

1. **Three functions, three conventions**: magic `-1`, `"ERROR: ..."` strings, `null`.
   Every caller must remember all three and check every call. Miss one check (the
   original missed them all) and the failure value *keeps flowing as if it were data*.
2. **`-1` means two different things** — "not a number" and "under 13" — so even a
   caller who checks can't tell the user what's actually wrong.
3. **Silence.** No stack trace, no log line, nothing. Sentinel values fail *quietly*,
   and quiet failures surface weeks later, three tables away from the cause.

## What changed in the refactor

- **Throwing is the single convention.** A thrown error cannot be accidentally
  treated as data — it stops the registration *by default*. The test "invalid input
  can NEVER become account data" makes the contrast with the original explicit.
- **`ValidationError extends Error`** gives failures a *type* and a payload
  (`field`, `value`). The boundary can then do the crucial split with `instanceof`:
  expected failures (user typed something wrong → friendly message, exit code 1)
  versus unexpected failures (our bug → **rethrow**, crash loudly, keep the stack).
  Collapsing those two categories is how real bugs get disguised as "invalid input"
  and go unfixed for months.
- **Look at how clean `register` is**: no try/catch anywhere in it. It can't *act*
  on a bad age, so it doesn't touch it — errors fly past to `cli.js`, the one place
  that can respond. "Catch only where you can handle" usually means: one boundary
  (the CLI, the request handler, the event loop tick), and almost nowhere else.
  Scattered defensive try/catch is how errors get swallowed.
- Tests assert the error **class** and its fields, not just "it threw" — and one test
  pins that distinct problems have distinct messages, the thing the shared `-1` lost.

## Key takeaway

Return values are for answers; throws are for failures. Give failures a class so the
boundary can tell "their mistake" from "our bug", attach the context (`field`,
`value`) the handler will need, and keep try/catch out of the middle layers — the
happy path should read like there's no such thing as failure.
