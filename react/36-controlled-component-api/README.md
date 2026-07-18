# React 36 — Controlled component APIs

**Lesson: decide who owns the state — a widget that takes `initialValue` *and*
keeps its own copy serves two masters and obeys neither.**

## Run it

Open `original.html`: click **reset** — the label says 0 while the stars keep
your old pick. The two "synced" widgets don't sync. Refactor: everything agrees,
always.

## What's wrong with the original?

`StarRating({ initialValue, onChange })` copies the prop into its own
`useState`. Now **two sources of truth** exist — parent's `rating`, widget's
`value` — agreeing only at mount. The word *initial* is the confession: every
parent write after that is ignored, so reset breaks and sibling widgets drift.
This is projects 07/08's single-source-of-truth lesson recurring one level up,
at the *component API* — and it's the single most common bug in published
custom inputs. (Project 31 met the same disease and patched it with sync
effects; here we design it away instead.)

## What changed in the refactor

- **Fully controlled**: `StarRating({ value, onChange })` owns zero state — it
  *displays* `value` and *reports wishes* through `onChange`. That's a native
  `<input>`'s exact contract (project 07), which is why the widget now
  composes with everything: reset is just a parent write; syncing two widgets
  is rendering the same state twice; there's no copy to drift.
- **Policy lives with the owner**: the capped-at-4 example filters in the
  parent's `onChange` — the widget needed no `maxAllowed` prop, because it
  doesn't decide anything. Controlled components push decisions to whoever
  owns the data, which is where product rules belong.
- **The dual-mode footnote** (on the page): if you want a zero-config mode for
  casual callers, mirror the platform — internal state only when no `value`
  prop is passed (`value` vs `defaultValue`, exactly like native inputs).
  Build the controlled core first; uncontrolled is sugar over it. What you
  must never build is the original's hybrid: initialized-then-independent.
- Naming rule worth adopting: a prop named `value` promises "I obey this
  always"; `defaultValue`/`initialX` promises "I read this once." The
  original's bug was implementing the second while consumers expect the first.

## Key takeaway

For every stateful widget you publish, answer one question in the API itself:
*who owns this state?* Caller owns it → `value`+`onChange`, no internal copy.
Widget owns it → `defaultValue`, no pretense of external control. The
in-between — copy the prop, then ignore it — is how "why won't it update"
issues get filed forever.
