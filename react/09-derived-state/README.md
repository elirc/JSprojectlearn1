# React 09 — Derived state

**Lesson: the #1 React smell — storing what you could compute. If it can be
calculated from existing state, it is not state.**

## Run it

Open `original.html` and drag the max-price slider. Nothing happens. Read the
effect to find out why. Then the refactor: the slider just works.

## What's wrong with the original?

The app's *actual* state is two user inputs: `query` and `maxPrice`. The original
stores five: those two **plus** `filtered`, `total`, and `count` — three values
that are pure functions of the first two — and hires a `useEffect` to keep the
copies in sync. Copies + sync point = the standard failure kit:

1. **The demo bug**: whoever added the price slider forgot to teach the sync
   effect about it — `maxPrice` is in neither the filter nor the deps — so the
   slider silently does nothing. With derived copies, every new input must be
   threaded through the sync point, and someday someone won't.
2. **Stale-bait initials**: `total: 466` and `count: 4` are hand-computed
   constants that must match `PRODUCTS` forever (js#08's hand-agreed values).
3. **Double renders**: every keystroke renders once for `query`, then again when
   the effect writes the three copies.

## What changed in the refactor

- **State shrank to the two inputs.** `filtered` and `total` are plain `const`s
  computed *during render* — no `useState`, no `useEffect`, no sync step to
  forget. `count` didn't even need a name (`filtered.length`).
- **Correctness by construction**: the filter reads `maxPrice` directly, so the
  slider works because there's nothing to keep in sync — a formula can't be
  stale, the same way a spreadsheet cell can't forget to recalculate. That
  spreadsheet model *is* React's render model.
- **On performance**: recomputing a 4-item filter per render is nanoseconds.
  Derive by default; reach for `useMemo` (project 27) only when a computation is
  *measured* slow. Correct-but-recomputed beats fast-but-stale every time.

## Key takeaway

Before every `useState`, ask: **could I compute this from state I already
have?** If yes, it's a `const` in render, not state. The litmus test that
catches it: if setting one state ever makes you immediately set another, the
second one is derived — delete it. (Effects that only compute get the full
treatment in project 21.)
