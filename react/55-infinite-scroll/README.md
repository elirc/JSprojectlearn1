# React 55 — Infinite scroll

**Lesson: stop measuring the scrollbar — hand the browser a sentinel and let it
tell you; and give every async load a rule that says "one at a time".**

## Run it

```
open original.html and refactored/index.html in a browser
flick the scrollbar to the bottom ONCE on each, then compare the counters
node --test react/55-infinite-scroll/refactored/feed.test.js   <- the "one at a time" rule, tested in Node
```

## What's wrong with the original?

It works, and it works badly in three compounding ways.

**It asks an expensive question constantly.** A `scroll` listener runs on every
scroll event — dozens per second, on the same thread that is trying to scroll —
and each run reads `scrollHeight`, `scrollTop` and `clientHeight`, forcing the
browser to stop and measure. The on-page counter climbs into the hundreds for
one flick.

**Nothing knows a load is already running.** Those dozens of fires all happen
inside one 500ms request, and every one of them starts another. The same page
is fetched three, five, ten times; every reply is appended; rows arrive twice
(outlined in red on the page). It's project 44's double-submit bug, except the
"button" is a scrollbar being pressed sixty times a second.

**The page number comes from a snapshot.** `loadMore` closes over `page` from
the render that created it, so all those simultaneous fires compute the same
`page + 1` (project 11). The effect re-attaches its listener on every page just
to keep that value fresh — five teardowns and rebuilds per session.

## What changed in the refactor

- **`IntersectionObserver` replaces the arithmetic.** A 1px sentinel `<div>` sits
  at the end of the list; the browser reports when it comes into view. It
  already knows where everything is, so the answer is free — observer callbacks
  land in single digits instead of hundreds. `rootMargin: '120px'` starts the
  fetch *before* the reader arrives.
- **Wrapped in a `useOnScreen(ref, options)` hook** — one `useEffect` that
  creates the observer and `disconnect()`s it in the cleanup (project 18's
  pairing: an observer left running is the same species of leak as a leaked
  interval). Its deps are a stable ref and a string, never the caller's inline
  options object (project 30).
- **The in-flight guard is a rule, not a boolean.** `feedReducer` refuses
  `'loadStarted'` unless `canLoadMore(state)`, and refusal returns the *same
  state reference*, so a second request is impossible by construction rather
  than by everyone remembering to check. Duplicates: 0.
- **One discriminated `status`** — `'idle' | 'loading' | 'error' | 'done'`
  (project 20) — instead of `loading`/`done`/`failed` booleans that can spell
  states the feed can't actually be in. `'done'` is permanent; `'error'` is
  recoverable only via `'retried'`.
- **The rules are React-free and tested in Node** — `feed.js` has no observer,
  no `scrollTop`, no fetch. One test replays the exact action sequence the
  original suffers (`loadStarted` ×3, then two identical replies) and asserts
  twenty items, one page, zero duplicate ids.
- Same medicine as js#73's infinite gallery, one level up: there the fix was
  observing images to lazy-load them; here it's observing the end of the list.

## Key takeaway

Two habits, both cheap. When you want to know whether something is on screen,
ask the browser instead of computing it — that's what observers are for. And
when an event can fire faster than the work it triggers can finish, the guard
belongs in your state rules, where it's one line and a unit test, not scattered
across every caller as a boolean someone will forget.
