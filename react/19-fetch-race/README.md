# React 19 — Fetch races

**Lesson: responses don't arrive in the order you asked — only the latest request
may write state, and effect cleanup is how you enforce it.**

## Run it

Open `original.html`, type "cat" quickly, wait a second: the results settle on
**"c"** — the oldest, slowest, wrong response — under a box that says "cat".
Refactor: results always match the box.

## What's wrong with the original?

The effect is *almost* right — deps correct, logic clean. The missing idea:
**network responses are not queued.** The demo API makes short queries slow (a
realistic inversion — broader search, more work), so typing "cat" fires three
requests that resolve in reverse: "cat" first, then "ca", then "c" last —
overwriting the correct results. Nothing in the code says "only the latest
request may write," so *last to arrive wins*, and last is often stalest. This is
js#48's race condition in async-data form; every search box, autocomplete, and
tab-switching detail view ships it once.

## What changed in the refactor

- **One flag per effect run**: `let stale = false` lives in the effect's own
  closure; the response handler checks `if (!stale)` before writing; the
  cleanup sets `stale = true`. The sequencing does the magic: when `query`
  changes, React runs the *previous* run's cleanup first — expiring the old
  closure — then starts the new run. Old responses land, find their own flag
  raised, and are discarded. Note this uses closures-capture-their-render
  (project 11's "bug") as the *fix*: each run's flag is private precisely
  because of snapshot capture.
- **Cleanup ≠ just teardown of timers** (project 18): it's the general
  "this render's world is over" signal — ideal for expiring in-flight work you
  can't un-send but can refuse to honor (js#43's timeout made the same move).
- The page notes the production upgrade: with real `fetch`, use
  `AbortController` — same shape (`return () => controller.abort()`), plus it
  actually cancels the network transfer and surfaces as a catchable
  `AbortError`.

## Key takeaway

Any effect that awaits something and then writes state has this bug until
proven otherwise. The checklist: does anything guarantee the response being
written belongs to the *current* deps? If not, add the stale flag (or
AbortController) — three lines, and the class of "results for the wrong query"
bugs is gone.
