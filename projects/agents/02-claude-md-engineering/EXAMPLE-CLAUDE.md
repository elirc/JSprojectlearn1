# Example: a CLAUDE.md for this repo's projects/ directory

A worked example calibrated to SkillForge. Note what it leaves out: nothing
about "writing clean TypeScript", nothing the READMEs already say, no prose.
Twelve lines of content steering ~90% of the mistakes a fresh agent makes
here.

```markdown
# SkillForge projects/

Runnable learning projects backing the Effect Forge and Agent Works worlds.
Each mission folder is a standalone npm package.

## Commands

- Run npm commands inside `projects/<world>/<mission>/`, never at the repo root.
- Verify a project: `npm run typecheck && npm test` in its folder.
- After changing any mission content: `npm run refresh:metadata && npm run verify:content` at the repo root.

## Constraints

- `public/content/missions/*.json` and `catalog.json` are packed artifacts (hash-verified) — never hand-edit; re-pack from `projects/` instead.
- Never modify `src/exercises.test.ts` files — specs treat them as fixed.
- `src/solutions.ts` files are learner-gated: don't copy them into exercises.

## Conventions

- Effect code uses `Effect.gen` for sequences, `pipe` for single-value chains (see any LEARN.md).
- LEARN.md first paragraph becomes the mission summary; first 8 h2/h3 headings become its concepts — keep both intentional.
```

Why these lines earn their place:

- **The root-vs-project npm confusion** happens on nearly every fresh
  session in a repo with nested packages.
- **The packed-artifact rule** prevents the one mistake that is genuinely
  expensive here (silent hash mismatches failing verification later).
- **The test-file and solutions rules** encode the learning contract an
  agent cannot infer from code alone.
- **The LEARN.md convention** is invisible coupling — editing a heading
  changes app metadata, which no agent would guess.
