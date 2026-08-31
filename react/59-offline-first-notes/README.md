# React 59 — Offline-first notes

**Lesson: decide which copy of the data is the truth. Point at the server
and every click is a coin flip; point at the device and the network
becomes a background chore that's allowed to fail.**

## Run it

Open `original.html`, type a paragraph, press **save** a few times. The
fake server is slow and fails 35% of the time, so before long an alert
eats your paragraph — and every click freezes the page while you wait.
Open `refactored/index.html` and do the same: everything is instant,
failures are invisible, and you can tick **offline**, keep working, and
untick it to watch the queue drain.

```
node --test react/59-offline-first-notes/refactored/sync.test.js
```

## What's wrong with the original?

1. **The server is the only truth**, so the app can't answer a single
   question without a round trip. Even *selecting* a note is a request
   that can fail.
2. **Failure destroys work.** `save()` catches the error and resets the
   editor to the server's last known copy — the paragraph you just typed
   is gone, and the app is technically behaving correctly.
3. **`busy` disables the whole page.** One in-flight request means no
   typing, no clicking, no reading. On a train the app is simply off.
4. **Every action is two round trips** (write, then re-read "to be
   sure"), doubling both the wait and the chance of failure.
5. **The only copy of an unsaved edit is a React state variable.**
   Refresh, or close the tab, and it never existed.
6. **Nothing is testable.** Whether an edit survives a failed request is
   currently a question you answer by clicking and hoping.

## What changed in the refactor

- **Local state is the truth.** The app renders from a `localStorage`
  cache on the very first frame, before the network is consulted. There
  is no loading spinner because there is nothing to wait for.
- **Every edit is two lines**: `applyOp` changes what the user sees, and
  `enqueueOp` adds it to an outbox. Neither can fail, so there is no
  error path in the editor at all — and no save button, because there is
  nothing left to save.
- **A sync loop drains the outbox** in the background. A failure isn't
  an error the user sees; the queue just stays full and it tries again.
- **The queue collapses what the server never needs**: a hundred
  keystrokes on one note become one op, and a delete cancels the edits
  before it. The outbox is a set of intentions, not a transcript.
- **`applyOp`, `enqueueOp` and `mergeServerState` are pure and extracted**
  — 21 Node tests covering op ordering, dedupe, tombstones, and
  last-write-wins with ties going to the server. The fake server runs
  `applyOp` too: one rulebook, both sides of the wire.
- **Tombstones, not holes.** A deleted note stays as a dated marker, or
  the next merge would see "the server has it, I don't" and resurrect it.
- **A status chip instead of a modal** — `synced` / `2 pending` /
  `offline — 3 waiting`, derived (project 09) from three facts.
- **This is project 39's optimistic update, promoted to an
  architecture.** There it was one like button predicting one response;
  here every write is optimistic and the rollback became a merge.

## Key takeaway

"Offline-first" isn't a feature you add for aeroplanes — it's a decision
about *which copy of the data your UI is a function of*. Point at the
network and every interaction inherits the network's latency and failure
rate. Point at the device, and syncing becomes a queue you can retry,
batch, dedupe, and unit-test. The hard part was never `fetch`; it's the
three questions — what does this edit mean, what still needs sending,
whose copy wins — and all three are pure functions.
