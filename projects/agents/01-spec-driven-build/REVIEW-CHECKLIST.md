# Agent diff review checklist

Work the passes in order. Log every finding in DEFECT-LOG.md, including clean
passes ("scope pass: clean").

## Pass 1 — Scope

- [ ] `git diff --stat`: every touched file is in the spec's allowed scope
- [ ] No new dependencies, scripts, or config changes unless specified
- [ ] No files created that the spec didn't ask for

## Pass 2 — Spec coverage

- [ ] For each numbered requirement, I can point to the lines satisfying it
- [ ] No requirement is satisfied only by coincidence of the current tests
- [ ] Non-goals were respected (check especially for "helpful" extras)

## Pass 3 — Correctness

- [ ] Errors are propagated, not silently swallowed or logged-and-ignored
- [ ] Edge cases beyond the tests: empty input, boundary values, unicode/whitespace
- [ ] Tests were not weakened, skipped, or rewritten to pass
- [ ] API usage matches the library's real behavior (spot-check one call in docs)
- [ ] Claimed test results reproduce when I run the commands myself

## Pass 4 — Judgment

- [ ] Naming and style match the surrounding code
- [ ] No dead code, commented-out blocks, or narrating comments
- [ ] I would approve this diff in a human PR review — if not, why not?
