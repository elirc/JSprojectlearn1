# 01 — Spec-driven agent building

The highest-leverage agentic skill for a junior engineer is not prompting
tricks — it is writing a spec precise enough that an agent can implement it,
then reviewing the result like a senior reviewer. This mission turns one Effect
Forge exercise into a full spec → agent → review loop and grades you on the
defects you catch, not the code you type.

## Why spec-driven building

When Claude Code implements and you review, your output is judgment, not
keystrokes. That is exactly the junior→mid transition: the mid-level engineer
is trusted to say *what* should be built and to recognize when something built
is wrong. Vague prompts ("add validation") produce plausible code that drifts
from intent; a spec with acceptance criteria produces code you can check
mechanically. The spec is not bureaucracy — it is you doing the thinking the
agent cannot do for you.

## The workflow loop

One pass through the loop looks like this:

1. **Spec.** Fill in `SPEC-TEMPLATE.md`: context, requirements, acceptance
   criteria, non-goals, constraints.
2. **Plan review.** Ask the agent for its implementation plan *before any
   code*. Reject plans that touch files outside the spec's scope.
3. **Implement.** Let the agent work. Resist steering mid-flight unless it is
   clearly stuck; note where you wanted to intervene.
4. **Review the diff.** Read every changed line with `REVIEW-CHECKLIST.md`
   open. Log everything in `DEFECT-LOG.md` — including "no defect found in X",
   which is itself a review finding.
5. **Verify.** Run the acceptance criteria yourself. The agent saying "tests
   pass" is a claim, not evidence.

## Writing an implementable spec

A spec an agent can implement has three properties:

- **Bounded scope.** Name the files that may change. "Only
  `src/exercises.ts`" is a testable constraint; an agent that edits the test
  file has failed the spec even if tests pass.
- **Observable requirements.** "safeMinutes fails on zero" is checkable.
  "handle edge cases properly" is not — the agent will pick its own meaning.
- **Explicit non-goals.** Agents gold-plate. "Do not add a CLI, do not add
  new dependencies, do not refactor the test helpers" prevents an hour of
  reviewing code you never asked for.

## Acceptance criteria that an agent can verify

Every criterion must be a command plus an expected outcome:

```
- `npm test` exits 0, 9 tests passed
- `npm run typecheck` exits 0
- `git diff --stat` touches only src/exercises.ts
```

If you cannot phrase a requirement this way, it is not ready — sharpen it or
move it to non-goals. This habit transfers directly to writing tickets and PR
descriptions for human teammates.

## Reviewing a diff you did not write

Reviewing agent code is harder than reviewing your own because nothing in it
is familiar. Work in passes, smallest lens first:

1. **Scope pass** — `git diff --stat`. Anything outside the spec is a defect,
   however good the code.
2. **Spec pass** — for each requirement, find the lines that satisfy it.
   A requirement you cannot point to is unimplemented or accidental.
3. **Correctness pass** — hunt the classic agent failure modes: silently
   swallowed errors, edge cases the tests don't cover, plausible-but-wrong
   API usage, tests weakened to pass.
4. **Judgment pass** — would you defend this code in a human PR review?
   Naming, duplication, comment noise.

## Logging defects like a reviewer

Every finding goes in `DEFECT-LOG.md` with a severity, the file and line, what
is wrong, and what evidence proved it. The log matters more than the fix: over
several missions it becomes a catalog of how agents fail, which is exactly the
intuition that makes you fast at directing them. A session with zero logged
findings usually means a shallow review, not a perfect agent.

## The exercise

Run the loop once, end to end, on real work:

1. Copy `EXAMPLE-SPEC.md` as your starting point — it specs the three
   exercises of Effect Forge mission 01 (`projects/effect/01-effect-basics`).
   Tighten anything you disagree with; the spec is yours now.
2. Have an agent (Claude Code, fresh session, no hints from this file)
   implement it. Save its plan before it starts.
3. Review the diff with the checklist, fill `DEFECT-LOG.md`, and run every
   acceptance criterion yourself.
4. Your build evidence for this mission is the completed defect log plus the
   acceptance-criteria transcript — not the code.

## What good evidence looks like

Strong: "Criterion 2 failed on first run — agent's safeMinutes accepted "0"
because it checked `n < 0`, not `n <= 0`; caught in spec pass, test output
attached, fixed via one-line follow-up prompt." Weak: "it worked." The
difference between those two sentences is the entire skill this world trains.
