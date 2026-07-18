# React 45 — Searchable table

**Lesson: filter + sort + paginate is a *derived pipeline*, not state to sync —
js#26's utilities and react#09's derivation, at feature scale.**

## Run it

Open `original.html`: search "a", go to page 2, clear the search — stale page,
wrong rows. Refactor: no input combination can show wrong rows.

## What's wrong with the original?

The displayed rows live in **state**, kept in sync by an effect that
re-filters, mutates-sorts, and slices whenever anything changes — project 09's
sin at feature scale. Consequences, each demonstrable:

1. **The stale-page bug** (live): clear a search while on page 2 and the page
   index outlives the page *boundaries* it referred to. Three interacting
   features write one state blob from different directions, and nobody owns
   the interaction rules.
2. **The filter logic is duplicated** — `totalPages` needs the filtered count,
   but the effect swallowed the intermediate, so the filter runs again,
   separately, drift-ready.
3. The comment trail records js#26's mutating-`sort()` scar — an earlier
   version scrambled the source array for every other feature.

## What changed in the refactor

- **State shrank to the user's three choices**: `query`, `sort`
  (key + direction), `page`. The pipeline derives fresh each render:
  `source → filter → sort → clamp → slice` — readable top to bottom as the
  feature spec, with every intermediate (`filtered`, `sorted`) available to
  whoever needs it. No duplication, no sync, seven rows of work per render
  (see 27 before memoizing anything).
- **The stale-page bug is handled twice, deliberately**:
  - *UX rule* (in the handler): searching resets to page 0 — a product
    decision, placed where actions are interpreted;
  - *Safety net* (in the pipeline): `Math.min(page, totalPages - 1)` clamps
    any stale index into range — so even inputs nobody anticipated can't
    render wrong rows. Rules where they belong, invariants enforced
    structurally (js#39's lesson).
- **js#26's `sortBy` slots in** — copy-then-sort (no mutated source), keyOf
  functions, and a `descending` flag that made click-to-toggle direction a
  three-line handler. The utilities earn rent across tracks.
- Real apps: the pipeline's *inputs* (query, sort, page) are exactly what
  belongs in the URL (project 42) — same architecture, shareable.

## Key takeaway

Data-grid features multiply badly as state (every pair needs interaction
rules) and compose trivially as a derivation (each stage reads the last).
Store the user's choices; derive everything they imply; clamp at the
boundaries. This shape scales from seven rows to seven thousand.
