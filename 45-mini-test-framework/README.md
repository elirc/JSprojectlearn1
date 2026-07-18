# 45 — Mini test framework

**Lesson: demystify the tool you've used 44 projects in a row — a real test
framework is ~60 lines, and knowing its anatomy makes you better at using big ones.**

## Run it

```
node 45-mini-test-framework/original.js
node 45-mini-test-framework/refactored/demo.js       (our framework, testing project 01!)
node --test 45-mini-test-framework/                  (node:test testing OUR assertions)
echo $LASTEXITCODE                                   (PowerShell: see the exit code)
```

## What's wrong with the original?

The if/console.log script everyone writes first:

1. **A crash stops everything after it.** Check 3 typos a function name; checks 4+
   never run. You learn about *one* problem per run — project 31's one-error-per-
   submit disease, in test form.
2. **No summary, no count** — a wall of "ok" lines nobody reads by day two.
3. **The killer: exit code 0 on failure.** CI systems only read the exit code. Hook
   this script to CI and the build stays green while tests fail forever. A test
   that fails *quietly* is worse than no test — it's a false alibi.

## What changed in the refactor

The anatomy every framework shares, one concern at a time:

- **Registration, then running.** `test()` only *collects*; `run()` executes later.
  That split is why frameworks can count, filter, parallelize, and report before
  anything executes — and it's invisible until you build one.
- **Isolation**: each test runs in its own try/catch, so one crash fails *one*
  test and the rest still run. (Project 38's listener isolation — same pattern,
  different domain.)
- **`await fn()`** — three characters, and async tests just work.
- **`process.exitCode`** — the single line that makes the framework *automatable*.
  Humans read the summary; machines read the exit code; both must tell the truth.
- **`assertEqual` imports project 25's `deepEqual`** — an assertion is a deep-equal
  plus a message with `expected` and `got` in it (the message *is* the debugging).
  `assertThrows` handles the three cases people forget: threw right (pass), threw
  wrong (fail *differently*), didn't throw (fail).
- **`demo.js` closes the loop**: our framework testing project 01's fizzbuzz. And
  `framework.test.js` has node:test checking *our* assertions — tools all the way
  down.

## Key takeaway

Frameworks are code someone wrote, not magic. When one seems mysterious — why
`describe` blocks? why do async tests hang? what does the reporter see? — the
answer usually lives in a 60-line core like this one. Build small versions of your
tools once; you'll never use the big ones blindly again.
