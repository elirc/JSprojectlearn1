# Projects — Effect Forge & Agent Works

Real, runnable project repos backing the two newest SkillForge worlds. Unlike the
older worlds, these missions cannot be completed inside the browser scratch lab:
each mission folder here is a working project you run on your machine. The
mission JSON in `public/content/missions/` archives a snapshot of these files for
phone reading; the folder here is the live copy you actually build in.

Both tracks deliberately build **one product** — a study-session tracker called
**Forgelog** (sessions have a topic, minutes, a note, and a date) — layer by
layer, so CRUD skill compounds instead of restarting from zero each mission.

> **Status (2026-10-06):** folders exist for Effect 01–04 and Agents 01–04; only `effect-01-effect-basics` and `agents-01-spec-driven-build` are packed into the app catalog. Rows without a folder are plans, not code.

## Effect Forge ladder (worldId: `effect`)

| # | Mission | You learn |
|---|---------|-----------|
| 01 | Effect basics: programs as values | `Effect.gen`, `pipe`, `Effect.try`, running effects |
| 02 | Tagged errors | `Data.TaggedError`, `catchTag`, typed failure channels |
| 03 | Schema | `effect/Schema` decode/encode, brands, transforms for the Forgelog domain |
| 04 | Services & Layers | `Context.Tag` repository, in-memory Layer, layer-swapped tests |
| 05 | HTTP CRUD API v1 | `@effect/platform` HttpApi, typed endpoints, derived client |
| 06 | Real persistence | `@effect/sql` + SQLite; only the Layer changes |
| 07 | Auth & middleware | sessions/API keys as HttpApiMiddleware, `Redacted` |
| 08 | Concurrency & resilience | `Schedule` retries, timeouts, bounded `Effect.all` |
| 09 | Testing | `@effect/vitest`, `TestClock`, layer test doubles |
| 10 | Frontend integration | React calling the derived Effect HTTP client |

## Agent Works ladder (worldId: `agents`)

| # | Mission | You learn |
|---|---------|-----------|
| 01 | Spec-driven agent building | writing specs and acceptance criteria, reviewing agent diffs, defect logging |
| 02 | CLAUDE.md & skills engineering | steering agents with project memory, before/after measurement |
| 03 | Tool-use loop from scratch | Claude API + hand-rolled tools that fix a failing test |
| 04 | Agent over your CRUD store | natural-language CRUD tools over a local JSON-file Forgelog store (`src/store.mjs`), driven by the SDK tool runner; the HTTP version waits for Effect mission 05 |
| 05 | MCP server | wrap the API as an MCP server for Claude Code |
| 06 | Structured output with Schema | validating LLM tool output with your `effect/Schema` types |
| 07 | Evals | a small harness scoring tool-call correctness |
| 08 | Multi-step workflow | plan → execute → verify with a human approval gate |

## Adding the next mission

1. Build the project here first, under `projects/<world>/NN-slug/`, with a
   `LEARN.md` written as the explanation you wish you'd had (its first prose
   paragraph becomes the mission summary; its first 8 h2/h3 headings become the
   concepts).
2. Pack it into the content archive (mission JSON + catalog + migration report).
   The packing rules live in `handoff/02-content-system.md`; gates come from
   `handoff/templates/gates.json` with `<TITLE>` and `<FIRST CONCEPT>` filled in.
3. Chain `prerequisites` from the previous mission in the world, then run:

   ```bash
   node scripts/refresh-catalog-metadata.mjs
   node scripts/verify-content.mjs
   ```
