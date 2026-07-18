# TS 32 — Typed actions

**Lesson: react#13's reducer with its action vocabulary as a discriminated
union — dispatches checked end to end, silent no-ops extinct.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`{ type: string; payload?: any }` — the action type that isn't one. Each
`case` invents its own payload shape (`.text` here, a raw id there) and
nothing records them, so the honor system governs every dispatch. The
three wrong dispatches all compile: a bare-string payload (a todo with
`undefined` text), a **typo'd action type** (`'toggeld'` → the `default`
→ *silent no-op* — worse than react#13's original, which at least threw),
and an object where the id should be (another silent no-op via
`t.id === {id: 1}`).

## What changed in the refactor

- **`TodoAction` is the vocabulary**: one union variant per event, each
  carrying *exactly* its data (`{type: 'added'; text: string}`) — ts#10
  applied to the dispatch channel. All four bad dispatches are type
  tests, including payload fields crossing actions (`clearedDone` with an
  `id`).
- **The reducer narrows per case** — `action.text` inside `'added'` is
  certain, no `payload.` guessing — and **has no `default`**: the switch
  is exhaustive over the union (ts#12), so adding an action to the
  vocabulary makes the reducer *fail to compile* until handled.
  react#13's runtime throw-on-unknown became can't-even-write-unknown.
- **Dispatch sites get autocomplete on the whole shape**: type
  `{ type: '` and the four real actions offer themselves; pick one and
  its payload fields are demanded. The vocabulary is discoverable, not
  documented.
- This is precisely how Redux Toolkit types its actions under the hood —
  and combined with react#40's `undoable`, the entire state layer of an
  app is now checkable: state shape (ts#30) + action vocabulary (this) +
  exhaustive rules (ts#12).

## Key takeaway

Any command channel — reducer actions, message buses (ts#20), RPC calls,
worker messages — deserves a discriminated-union vocabulary: every
command name paired with exactly its payload. Senders get checked and
autocompleted; receivers narrow and must be exhaustive; and the
typo-into-silent-no-op bug class is gone.
