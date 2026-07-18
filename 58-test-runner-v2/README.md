# 58 — Test runner v2: hooks, async, .only

**Lesson: the features every runner grows — nested hooks, awaited tests,
focus/skip — and the false-green bug that makes async support
non-negotiable.**

## Run it

```
node 58-test-runner-v2/original.js     # watch a failing async test "pass"
node --test 58-test-runner-v2/
```

## What's wrong with the original?

Project 45's runner, "just add features" edition:

1. **THE FALSE-GREEN BUG.** `t.fn()` ignores the returned promise. The
   try/catch sees no throw — the rejection happens later, elsewhere — so
   every async test *passes, including the failing ones*. The demo at the
   bottom prints `1 passed` for a test that throws. A test runner whose
   failures can't fail is worse than no tests: it manufactures confidence.
2. **One global `beforeEach` slot** — last assignment wins, nested groups
   can't have their own setup, and someone else's hook silently replaces
   yours.
3. **No `afterEach`** — cleanup lives inside each test, so a failing test
   skips its own cleanup and poisons the tests after it.
4. **No `.only`/`.skip`** — debugging one test means commenting out 400.
5. **Module-global everything** — the runner itself is untestable, because
   running it mutates the world.

## What changed in the refactor

- **A suite tree.** `describe` pushes a node and moves a cursor; hooks and
  tests register on the current node. `beforeEach` runs outermost-first
  (parents set the stage), `afterEach` unwinds innermost-first — and runs
  **even when the test failed**, in a `finally`, with the test's own error
  taking precedence over any hook error.
- **Every test and hook is awaited.** Async failure = red. The
  meta-test replays the original's invisible failure and asserts it fails.
- **`.only` marks and filters** — everything else is reported *skipped*,
  not silently dropped: a report that quietly omits tests is a lie of a
  different kind.
- **`createRunner()` returns an instance** — no module state. That's what
  makes the meta-tests possible: node:test runs our runner running fake
  suites, and even two runners in one process can't interfere.
- **`run()` returns data; `report()` prints it.** The decide/do split
  (project 01, and every project since), applied to the tool itself.

## Key takeaway

If your tooling touches async code, "I called it" and "I awaited it" are
different claims, and only one of them can fail. This is also the chapter
on hooks-as-isolation: `beforeEach` exists so each test gets a fresh
world, `afterEach` so no test can poison the next — the same
resource-lifecycle discipline as project 56, enforced by the framework so
individual tests can't forget it.
