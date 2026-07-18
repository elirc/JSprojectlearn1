# React 10 — State mutation

**Lesson: React detects change by reference, not by contents. Mutate state and
the screen simply never hears about it.**

## Run it

Open `original.html` and click **remove last** and **bigger font** — dead
buttons. Then read why **add** works (it shouldn't!).

## What's wrong with the original?

Every handler does `state.push(...)` / `state.prop = x`, then `setState(state)` —
handing React back **the same object it already had**. React compares old vs new
with `Object.is`; same reference means "nothing changed," so it skips the
re-render. The data *did* change — the screen just doesn't know. Three flavors on
display:

- `removeLast` and `embiggenFont`: textbook dead buttons.
- `addTag` "works" — **by accident**. The unrelated `setDraft('')` forces a
  render, which happens to read the mutated array. Accidental correctness is the
  nastiest kind: delete that line during a refactor and a *different* feature
  dies. Mutation bugs also love hiding — they surface later as memo'd components
  not updating (project 28) or effects not firing, far from the mutation.

## What changed in the refactor

- **Replace, never change.** Every update builds a fresh value:
  `[...current, draft]`, `current.slice(0, -1)`,
  `{ ...current, fontSize: current.fontSize + 2 }`. New reference → React knows.
  This is js#26's "never mutate inputs" house rule with a concrete enforcement
  mechanism attached: in React, mutation isn't just impolite, it's *invisible*.
- **The cheat sheet is printed on the page** — for every mutating array/object
  operation there's a replacing twin (`push`→spread, `splice`→`filter`,
  `arr[i]=`→`map`, `sort`→copy-then-sort). Learn the pairs once; they're the
  same idioms from js#17's snake and js#39's undo — which is the bonus: state
  you never mutate is state you can snapshot, time-travel, and diff for free.
- **Updater form** (`setTags(current => ...)`) throughout — project 11 explains
  when it saves you.

## Key takeaway

`setState`'s real contract is: *give me a value I can reference-compare*. So
treat state as read-only everywhere — the moment you type `state.` followed by
`push`, `pop`, `sort`, or `=`, stop and build the replacement instead. If the
screen ever ignores an update, hunt for a mutation first.
