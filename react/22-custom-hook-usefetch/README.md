# React 22 — Custom hooks (useFetch)

**Lesson: a custom hook is just a function that calls hooks — the
extract-the-duplication move, applied to component logic.**

## Run it

Open `original.html`: the alerts widget "loads" forever (its pasted copy
swallows errors). Refactor: the error shows, and there's one copy of the
plumbing.

## What's wrong with the original?

Three widgets, each with the same ~15 lines of fetch plumbing pasted in — and
copy-paste doesn't duplicate code, it **forks** it. The forks have already
rotted independently: `StatsWidget`'s copy lost the race guard during a
"simplification"; `AlertsWidget`'s copy swallows errors, so a failing service
renders as an eternal spinner. This is js#04's copy-drift, but the payload is
subtle correctness machinery (projects 19–20's guards) — exactly the kind of
thing that dies quietly in a paste.

## What changed in the refactor

- **`useFetch(path)` is the whole trick**: a plain function whose name starts
  with `use`, calling `useState` + `useEffect` inside. No registration, no API
  — the naming convention is for the linter and readers. It packages the
  status-object (20) *and* the stale-flag (19) once; every consumer gets the
  correct version and none can drift.
- **Each *call* gets its own state.** Three widgets → three independent
  requests. That's React's per-call-site hook state, the same isolation js#28's
  debounce got from per-wrapper closures. A custom hook shares *logic*, never
  *state* — if you want shared state, that's context (project 41).
- **`[path]` as a dep** makes the hook navigable: change the path, it
  refetches — with the race guard making the change safe.
- **Widgets collapsed to one line of data logic** (`const request =
  useFetch('/profile')`) plus rendering — and even the loading/error rendering
  deduplicated into `StatusLine`, a plain component.
- When to extract a hook: same test as extracting a function (js#04's rule of
  three) — you've written the stateful pattern twice and a third is coming; or
  the component's effect soup obscures what it *shows*. Names like
  `useFetch`, `useDebouncedValue` (24), `usePersistentState` (23) mark the
  reusable seam.

## Key takeaway

Anything you can do in a component, you can do in a function the component
calls — including hooks. When stateful logic repeats across components, extract
`useThing()` exactly like you'd extract any function, and the correctness
machinery (cleanup, races, status shapes) gets written once, reviewed once,
and inherited everywhere.
