# React 21 — You might not need an effect

**Lesson: effects are for synchronizing with the outside world — not a place to
put logic. Most effects that compute something should be deleted.**

## Run it

Open both files — identical behavior. Then diff them: the refactor is shorter by
three states and three effects, and doesn't import `useEffect` at all.

## What's wrong with the original?

"`useEffect` is where logic goes" produces the **effect chain**: quantity change
→ render → effect 1 writes subtotal → render → effect 3 writes total → render.
Three renders per click, and the middle ones show *half-updated* numbers
(new subtotal, old total) — micro-flashes of inconsistency. Worse than the waste
is the mental load: the effects form a dependency graph the author must keep
topologically sorted in their head, and adding tax means wiring a fourth
state+effect into the right place in the chain. This is project 09's
derived-state smell in its most virulent form — each derived value got a state
*and* a synchronizer.

## What changed in the refactor

- **The chain was just arithmetic.** Three `const`s computed in render order:
  `subtotal`, `discount`, `total`. Always mutually consistent (they're computed
  together from the same snapshot), one render per change, nothing to wire.
  Deleting `useEffect` deleted the bug class.
- **The page states the decision rule** worth keeping forever: effects are for
  synchronizing React with the **outside world** — a server (projects 17–20),
  timers (18), the document title, localStorage (23), browser APIs (25). The
  test for any effect: *is the outside world involved?* No → it's either a
  computation (do it in render) or a reaction to a user action (do it in the
  event handler). Yes → effect, with deps and cleanup.
- The other common not-an-effect: "when X changes, update state Y" where both
  are React state. If Y is computable → derive it (this project). If Y should
  *reset* when a prop changes → use `key` (project 31). Effects that just
  shuttle React state into other React state are always the wrong tool.

## Key takeaway

Before writing `useEffect`, say the sentence from project 17 — "keep ___
synchronized with ___" — and check the second blank names something *outside*
React. If it names your own state, you're about to build a Rube Goldberg
machine; write a `const` instead.
