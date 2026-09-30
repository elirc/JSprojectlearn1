# 02 — CLAUDE.md & skills engineering

Mission 01 steered an agent through a spec written per task. This mission is
about the steering that persists *between* tasks: the CLAUDE.md file an agent
reads at the start of every session, and the skills it can load on demand.
Written well, they turn corrections you would otherwise repeat forever into
configuration. Written badly, they are noise the agent skims past — and the
only way to know which you wrote is to measure.

## What project memory actually is

Claude Code reads `CLAUDE.md` from the repo root (and parent/child
directories) into every session's context. It is not magic — it is a prompt
prefix, competing for attention with everything else in the session. Three
consequences follow:

1. **Every line costs attention.** A 300-line CLAUDE.md gets skimmed the way
   you skim a 300-line README. Short files get followed.
2. **It persists, so errors persist.** A wrong instruction misleads every
   future session until someone notices.
3. **It is versioned with the code.** Review changes to it like code — a bad
   memory edit is a bug that reproduces in every session.

## What belongs in CLAUDE.md

The test: *would the agent get this wrong without being told, and does it
come up repeatedly?* Good entries are project facts an agent cannot derive:

- commands that are not obvious (`npm run verify:content`, not `npm test`)
- constraints ("mission JSON `files[]` is hash-verified — never hand-edit")
- conventions the codebase shows inconsistently
- what NOT to touch, and why

Bad entries: restating what the code already says, generic best practices
("write clean code"), long prose explanations, or instructions for tasks that
happen once. If you would not pin it above a new teammate's desk, it does not
go in.

## Skills: memory that loads on demand

A skill is a markdown file with frontmatter in `.claude/skills/<name>/SKILL.md`
that the agent loads only when its description matches the task. That makes
skills the right home for anything bulky or situational — a release
checklist, the mission-packing procedure, a review recipe — where CLAUDE.md
holds only the always-true two-liners. Rule of thumb: **CLAUDE.md is what the
agent must never forget; a skill is what it should look up.** The frontmatter
`description` decides whether the skill ever triggers, so write it with the
same care as a function signature: name the situations, verbs, and file types
that should summon it.

## The experiment method

Steering text is a hypothesis until tested. The measurement loop, which is
the actual skill this mission trains:

1. **Pick a probe task** — small, representative, with a checkable outcome.
   Example: "add a `remove` method to the SessionRepo service" in the Effect
   Forge mission 04 project.
2. **Baseline run** — fresh agent session, no CLAUDE.md (or the current one),
   run the probe, save the transcript. Note every place you had to correct it
   or it violated a project convention.
3. **Write the memory** — turn each correction into one terse CLAUDE.md line
   or one skill.
4. **Treatment run** — fresh session (this matters: same session remembers
   the correction anyway), same probe, save the transcript.
5. **Compare and record** in `EXPERIMENT-LOG.md`: did behavior change? Which
   lines were followed, which were ignored?

One probe task is a weak signal, but it is a signal; over missions your log
becomes evidence about which phrasings agents actually obey.

## Writing rules that get followed

Patterns that survive contact with real sessions:

- **Imperative, specific, one line.** "Run `npm run typecheck` before
  claiming a task is done" beats a paragraph about quality.
- **Say why in six words** when the rule looks arbitrary: "never edit
  `catalog.json` by hand (hash-verified)". Agents (and humans) obey rules
  they understand.
- **Prefer prohibitions with alternatives.** "Don't X" leaves a hole; "Don't
  X — do Y instead" fills it.
- **Cut ruthlessly.** When a rule stops earning its line (the code changed,
  the agent stopped making that mistake), delete it. Stale memory is worse
  than no memory because it teaches the agent to distrust the file.

## The exercise

1. Run the baseline: fresh Claude Code session in this repo, probe task of
   your choice against one of the Effect Forge projects. Log the corrections
   you had to make.
2. Write a `CLAUDE.md` for `projects/` using `CLAUDE-TEMPLATE.md` (study
   `EXAMPLE-CLAUDE.md` for calibration — note how short it is), plus one
   skill if something procedural came up.
3. Run the treatment on a fresh session and fill `EXPERIMENT-LOG.md` with
   both transcripts' evidence.
4. Your build evidence is the completed experiment log: baseline defects,
   the exact lines you added, and what changed on the treatment run.

## What good evidence looks like

Strong: "Baseline agent ran `npm test` at the repo root and burned four
minutes on the app suite; added 'Effect projects are standalone — run npm
commands inside `projects/effect/<mission>/`'; treatment agent cd'd into the
project first try." Weak: "the agent seemed better." Tie every claim to a
transcript line, the same way mission 01 tied every defect to a diff line.
