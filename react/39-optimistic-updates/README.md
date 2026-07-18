# React 39 — Optimistic updates

**Lesson: for low-stakes actions, update the UI first and let the server catch
up — with a rollback for when it objects.**

## Run it

Open `original.html` and click a heart: 1.2 seconds of "saving…" per like.
Refactor: instant hearts — and roughly a third of them quietly flip back a
second later with an explanation (the demo server fails 30% of the time, on
purpose, so you'll actually see rollbacks).

## What's wrong with the original?

Nothing, technically — that's the point of this pair. The pessimistic pattern
(disable, await, then update) is *correct*: the UI never shows an unsaved like.
But for a like button it's the wrong trade: every click costs a round trip of
staring at "saving…", users double-click and drift away, and the app feels
broken while being perfectly honest. Correctness of *data* isn't the only
requirement; responsiveness is a feature too, and for a reversible,
usually-succeeds action, waiting buys almost nothing.

## What changed in the refactor

- **The optimistic three-step**, readable directly in `toggleLike`:
  1. `setLiked(next)` — instant feedback, before any network;
  2. `await likeOnServer(...)` — sync in the background;
  3. on failure, `setLiked(!next)` + a visible note — **the rollback**.
  The state becomes a *prediction* of the server's answer; predictions about
  like buttons are cheap to correct.
- **The write-side race guard**: an attempt counter in a ref (project 26)
  ensures an *old* failure can't roll back a *newer* click — project 19's
  only-the-latest-wins rule, applied to mutations. Click fast on a flaky
  network and it still converges right.
- **The judgment table is the real lesson** (printed on the page): optimistic
  for likes, stars, toggles, reorders — low-stakes, high-success,
  easy-to-reverse. Pessimistic (the original! it stays correct) for payments,
  deletes, sends — anything the user can't shrug off. Choose per action, not
  per app.
- Note what didn't change: the server API, the failure rate, the latency. UX
  improved purely by *reordering* truth and hope.

## Key takeaway

The pessimistic and optimistic patterns are both tools; the skill is matching
them to stakes. When you go optimistic, the contract is three parts —
predict, sync, roll back visibly — and a guard so stale failures can't undo
fresh intent. Instant-feeling apps are mostly this pattern, applied
relentlessly to the small stuff.
