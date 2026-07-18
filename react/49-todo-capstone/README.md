# React 49 — Todo capstone

**Lesson: the whole track in one app — and a "before" that collects half its
mistakes in forty lines.**

## Run it

Open both files. In the original: add three todos, refresh at the wrong moment,
delete one and re-add, toggle from the "done" filter — each ritual finds a bug.

## What's wrong with the original?

A working first draft carrying one specimen of each track disease — it's a
review quiz in code form. Spot them before reading:

1. **Stored derived state** (`remaining` + sync effect) — react#09.
2. **The load/save effect race**: load runs *after* first render, so save can
   write the empty array over your data first; and unguarded `JSON.parse` on
   whatever's in storage — react#23's exact pitfalls.
3. **`id: todos.length`** — delete one, re-add, ids collide — react#03's
   identity lesson on the data side.
4. **`key={i}` on a *filtered* list** — the worst index-key variant: indexes
   shift as items move between filters — react#03 again.
5. Update logic smeared through JSX handlers — react#13.

## What changed in the refactor

- **js#14 → react#13 → here, the full lineage**: state renders the UI, rules
  live in `todosReducer` (imported conceptually from project 13, where it's
  Node-tested), and this capstone adds the app-shell concerns.
- **`usePersistentReducer`** — the capstone's one new idea, and it's just
  projects 13 + 23 fused: `useReducer`'s *lazy third argument* does the
  guarded load (runs once, corrupted data falls back — no load-after-save
  race, because the initial state *is* the stored state), one effect saves.
  Fifteen lines, reusable for any reducer app.
- **Filters are a lookup table** (`FILTERS`) — js#06/10's rules-as-data; the
  filter buttons render from `Object.keys(FILTERS)`, so adding a filter is
  one entry.
- **Everything else is track reflexes**: stable ids minted by the reducer,
  `key={t.id}`, derived `visible`/`remaining` (09), controlled input (07),
  Enter-to-submit (14).

Extensions, each a pointer back into the track: undo (40's `undoable`
wrapper — the reducer is already compatible), share filters in the URL (42),
sync to a server with optimistic toggles (39), global store if it grows (41).

## Key takeaway

Nothing in this app is novel — that's the achievement. Real features are
compositions of small, learned shapes: reducer for rules, hooks for
packaged policies, derivation for everything computable, ids for identity.
When a new app feels hard, the question is which of these shapes you're
missing — not which library to add.
