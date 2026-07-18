# React 29 — State colocation

**Lesson: a state change re-renders its owner and everything below — so give
state the *smallest* owner that covers its readers.**

## Run it

Open `original.html` and type a sentence: three render counters march in
lockstep, ~30ms per keystroke. Refactor: only the SearchBox counter moves —
with zero memoization.

## What's wrong with the original?

The habit "state goes at the top" put the search box's text on `Dashboard` —
the root. React's rule is simple: when state changes, **its owner re-renders,
and by default so does the whole subtree under it**. So every keystroke
re-renders the chart and the table, two heavy components that never read
`searchText`. They're billed for state they don't use, purely because it lives
above them.

Notice this is the mirror image of project 08: there, state was too *low*
(siblings couldn't share it); here it's too *high* (strangers pay for it).
Both break the same rule.

## What changed in the refactor

- **The state moved down into `SearchBox`** — the only component that reads
  it. Now a keystroke re-renders a component that renders one input and one
  line of text. The heavy siblings aren't skipped by cleverness; they're
  *outside the blast radius entirely*.
- **No `memo`, no `useCallback`.** Compare project 28's machinery: memoization
  *suppresses* re-renders that structure causes; colocation means the
  re-renders *never exist*. Structural fixes are free forever — no deps
  arrays to maintain, no reference-stability audits. That's why colocation is
  the first tool, memo the second.
- **The unified rule** (this project + 08): *state lives with exactly its
  readers.* One reader → in that component. Several → their closest common
  parent. App-wide → context (34/41). When you inherit a slow React app, the
  first question is almost always "what state is living too high?"
- Bonus discipline: colocation also improves *deletability* — SearchBox now
  carries its own state, so moving or deleting the feature is one line in
  Dashboard.

## Key takeaway

Before optimizing re-renders, relocate the state. Ask of each `useState`: "who
actually reads this?" and move it to the smallest component that covers the
answer. Most React performance problems are state-placement problems wearing a
performance costume.
