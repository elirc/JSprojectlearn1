# 54 — Search as you type

**Lesson: the out-of-order response race — debounce reduces requests, but
only a latest-wins guard makes the results *correct*.**

## Run it

Open both HTML files in a browser. In the original, type `ba`, pause a
beat, then type `n`: the results flash correct, then go **wrong** — the
slower, older query paints last. Then:

```
node --test 54-search-as-you-type/
```

## What's wrong with the original?

1. **A request per keystroke.** Typing "banana" fires six requests, five of
   them for queries the user already abandoned. Project 28 built `debounce`
   for exactly this; it just isn't wired in.
2. **The race that ships to production**: responses come back out of order.
   `"ba"` (many results, slow) resolves *after* `"ban"` (fewer, fast), and
   whichever resolves **last** paints the screen. The user typed `ban` and
   is looking at results for `ba`. This bug is invisible on localhost and
   constant on real networks.
3. **Loading and "no results" look identical** — an empty list means either.
4. Results injected via `innerHTML` string concatenation (project 35's XSS
   lesson — fine for this fruit list, fatal the day results echo user input).

## What changed in the refactor

- **`makeLatestOnly(fn)`** (`refactored/latest.js`, fully unit-tested): a
  closure counter stamps every call with a ticket; when a call settles, its
  result is delivered only if its ticket is still the newest. Losers resolve
  to a `STALE` sentinel the UI ignores. Even an *error* from an abandoned
  query is neutralized — but an error from the newest call still throws,
  because real failures must surface.
- **Debounce and latest-only are both used** — they solve different halves:
  debounce = don't ask until typing pauses (economy); latest-only = whatever
  still overlaps can't paint stale data (correctness). The debounce is
  project 28's, copied inline (file:// pages can't import modules).
- **Loading is a rendered state**, distinct from "no results".
- `textContent` instead of `innerHTML` concatenation.
- With a real `fetch` you'd add the third tool: pass an `AbortController`
  signal and abort the previous request, so the network also stops doing
  abandoned work. Ticket-checking still stays — abort is an optimization,
  the ticket is the guarantee.

## Key takeaway

Async responses are not FIFO. Any time you fire request N+1 before request
N settles, you must decide *on arrival* whether a response is still
relevant — a monotonic ticket in a closure is the whole trick. File it next
to project 48's phase-guards: same disease (a stale continuation touching
current state), different cure for a different shape.
