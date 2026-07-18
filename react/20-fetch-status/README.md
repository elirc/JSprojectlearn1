# React 20 — Fetch status

**Lesson: a request is in exactly one of four states — store *which one*, not
three flags that must be reset in lockstep.**

## Run it

Open `original.html`: click **report 3** (fails), then **report 4** (succeeds) —
the error stays on screen next to fresh data. Click 3 again: stale data + error
+ "Loading..." *simultaneously*. The refactor shows exactly one thing at every
moment.

## What's wrong with the original?

`isLoading` + `error` + `data` — the classic trio — is js#40's boolean explosion
applied to fetching: 2×2×2 representable combinations for a request that's only
ever in one of four states (idle / loading / success / error). The extra states
aren't theoretical; the demo walks you into two of them. Root cause: with
separate flags, **every transition must remember to reset every *other* flag**
(`setError(null)` when loading starts, `setData(null)` on failure...) — and this
code, like almost every hand-rolled fetch, forgot some. The bug isn't a typo;
it's a structure that requires perfect memory.

## What changed in the refactor

- **One `request` object whose `status` names the state**, with `data`/`error`
  riding along — and crucially, transitions **replace the object wholesale**
  (`setRequest({ status: 'success', data })`). Stale leftovers can't survive
  because nothing is patched field-by-field; there are no reset lines because
  there's nothing to reset. This shape is a *discriminated union* — ts#10 makes
  the compiler enforce that `error` only exists when status is `'error'`.
- **Rendering became a `switch`** (`RequestView`) instead of three independent
  `&&`s that can all be true — one state in, one view out, project 04's ladder.
- **Project 19's stale-flag rides along** — from here on in this track, fetch
  effects carry their race guard as standard equipment.
- Same lesson, third appearance: js#40 (orders), react#16 (wizard screens), now
  requests. Loading states are just the version everyone actually ships broken.

## Key takeaway

When you declare `isX`/`isY` flags about the same underlying thing, stop and
name the thing's states instead. For anything async that's `idle | loading |
success | error` — one status field, whole-object transitions, switch-based
rendering. Your UI can then only ever say one true thing.
