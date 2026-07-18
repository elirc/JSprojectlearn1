# 68 — Collaborative todo list

**Lesson: the capstone — 65's API + 67's push pipe + an event log = two
browsers editing one list, optimistic UI, and your first sync conflicts.**

## Run it

```
node 68-collab-todo/original.js          # watch the lost update, deterministically
node --test 68-collab-todo/
node 68-collab-todo/refactored/server.js
```

Open http://localhost:3000 in **two windows**. Add and toggle in both.
Kill the server, keep clicking, restart it — the clients reconnect and
replay what they missed.

## What's wrong with the original?

The classic first attempt — poll every 2s, save the whole list:

1. **The lost update.** Alice adds a todo; Bob (holding a stale snapshot)
   toggles one and saves *his whole list*. Alice's todo silently vanishes.
   No error anywhere — the app just "eats todos".
2. **Whole-list writes make every save a total overwrite**, so any
   concurrency destroys data. Blast radius: everything.
3. **Polling**: up to 2s of lag, a GET drumbeat for nothing, and project
   67's push pipe sitting right there.

## What changed in the refactor

- **The server owns an event log.** Every change is a numbered event
  (`{version, type, todo, originTag}`), appended and broadcast over
  project 67's WebSocket. Writes are *fine-grained operations* over
  project 65's HTTP API — validated, error-shaped — never "save the list".
  One door per direction: HTTP for writes, the socket as a read-only
  firehose.
- **Clients rebuild state from events in server order — including their
  own edits**, which return through the same pipe as everyone else's. One
  code path; convergence by construction. The killer test replays the
  original's exact scenario and both clients end identical, nothing lost.
- **Optimistic UI with `originTag`s**: your edit renders instantly as a
  tagged placeholder; when the server's echo arrives, the tag match swaps
  it in place — no duplicate, no flicker. Rejection rollback is just
  "re-sync from the log" (no inverse-operation bookkeeping, thanks to
  event-log truth). Placeholders render dimmed: *pending* is a visible
  state, not a secret.
- **Reconnect = `?since=version` replay.** The versioned log turns
  "missed messages" from a catastrophe into a filter. 67's
  backoff-reconnect plus catch-up means a restarted server just works.
- **Conflicts resolve last-write-wins in server order** — two clients
  toggling the same todo may disagree with one user's *intent*, but never
  with each other (tested). That honesty — pick a simple rule, state it —
  beats accidental nondeterminism. (Real-time *text* needs OT/CRDTs; a
  todo list does not.)

## Key takeaway

Sync gets tractable the moment you stop shipping *state* and start
shipping *ordered events*: convergence, catch-up, optimistic UI, and
auditability all fall out of one design choice. This is the architecture
under Figma-style multiplayer, game networking, and every "offline-first"
app — built here from three projects you already understood.
