# 📘 Learning Guide: Offline-First Notes

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A notes app: a list on the left, a title and a body on the right. Two
notes to start with. You can create, edit and delete.

Behind both versions is the same fake server, written into the page: it
takes up to about a second to answer and **fails 35% of the time, on
purpose**. That's not a cruel joke — it's a phone on a train, compressed
so you can feel it in thirty seconds instead of on a commute.

- **Original:** every action is a request. Clicking a note in the list
  makes a request. Saving makes two. While any request is in flight the
  whole page is greyed out and unclickable. And when a save fails you get
  an alert saying "your changes were not kept", and the editor snaps back
  to the server's copy, deleting the paragraph you just wrote.
- **Refactor:** everything is instant, with no save button and no
  spinner. A chip in the heading says `synced`, `2 pending` or
  `offline — 3 waiting`. Tick **offline**, keep working, untick it, and
  watch the chip count down. Refresh at any moment; nothing is lost.

Same server. Same failure rate. Different answer to one question: **which
copy of the data is the truth?**

## 2. Concepts you need first

### Source of truth

Every app has one place it believes. In the original it's the server: to
show a note, ask the server; to change a note, ask the server and wait
for permission. In the refactor it's this device: the screen renders from
local state, and the server is a *peer* you eventually reconcile with.
That single choice decides everything downstream — if the truth is over
the network, then latency, offline and failure are *your user's*
problems; if it's local, they're a background job's problems.

### Optimistic updates (project 39), scaled up

Project 39's like button applied the change first and rolled it back if
the server objected — one prediction about one action. Here *every*
write is applied locally first, so "rollback" stops being a special case
and becomes the ordinary merge that happens whenever the server answers.

### An operation ("op") and an outbox

An op is a small, serializable description of an edit:

```js
{ opId: 'k3f9x', type: 'upsert', noteId: 'n1', fields: { title: 'Milk' }, at: 1712... }
```

The **outbox** (or pending queue) is the list of ops that haven't reached
the server yet. Two things follow: an edit can never "fail" from the
user's point of view (it just sits in the outbox longer), and the queue
is plain data, so it can be saved to disk along with everything else.
This is js#38's event objects and project 13's actions, one step
further: an action you can *store and send*.

### Last-write-wins (LWW)

Two devices edit the same note; you need one rule for who wins. LWW says:
compare timestamps, newest wins. It's the simplest conflict resolution
that exists, and the right starting point because it's **total**
(there's always an answer) and **deterministic** (both devices compute
the same answer independently).

Its honest cost: the loser's edit vanishes without ceremony. Real
collaborative editors use CRDTs or operational transforms to merge
*within* a document — worth reaching for the day two people type in the
same paragraph, and a distraction before that day.

Ties matter more than they look. If two edits share a timestamp, "newest
wins" has no answer, so we pick a side (the server) and write it down.
An undecided tie is how two devices end up permanently disagreeing.

### Tombstones

If deleting a note just removed it from local state, the next merge with
the server would see "the server has this note, I don't" and helpfully
bring it back. So a delete leaves a marker:

```js
{ id: 'n1', title: 'Shopping', deleted: true, updatedAt: 60 }
```

Dead, dated, and still comparable. The UI filters tombstones out; the
merge needs them. This is why deleting is never simply "remove the key"
in a syncing system.

### Debouncing and dedupe

Typing generates an op per keystroke, and sending 200 requests for a
sentence would be absurd, so the queue **collapses** consecutive edits
to the same note into one merged op. That's project 24's debounce idea
moved from time to data: instead of "wait until they stop typing", it's
"keep only what still needs saying".

### `localStorage`, honestly

`localStorage.setItem(key, JSON.stringify(value))` — synchronous,
string-only, about 5MB, and it **throws** in private mode or when full.
Every read and write belongs in a `try/catch`, and the app must keep
working when it fails (you lose offline support, not the app).
Project 23 built the hook; this project shows what it's for.

## 3. Walking through the original code

The load, on mount:

```js
async function load() {
  setBusy(true);
  try { setNotes(await apiList()); }
  catch (e) { setError('Could not load your notes.'); }
  setBusy(false);
}
```

Reasonable-looking, and it means a failed first request leaves the user
staring at an error page with nothing on it — even though this device
may have shown them those notes yesterday.

Selecting a note — an action with no business touching the network:

```js
async function select(id) {
  setBusy(true);
  try {
    const note = await apiGet(id);
    setSelectedId(id);
    setDraft({ title: note.title, body: note.body });
  } catch (e) { alert('Could not open that note. Try again?'); }
  setBusy(false);
}
```

And the one that hurts — the `catch` inside `save`:

```js
catch (e) {
  alert('Save failed. Your changes were not kept.');
  const server = notes[selectedId];
  setDraft({ title: server.title, body: server.body });   // your paragraph, deleted
}
```

Plus the guard that turns latency into paralysis — `<div className={'row'
+ (busy ? ' busy' : '')}>`, where `.busy` is `pointer-events: none`.

## 4. What's wrong with it (in beginner terms)

**Every click is a coin flip.** With a 35% failure rate, four actions in
a row succeed about 18% of the time. The app isn't *broken*; it's
correctly reporting that the network is bad — and the user didn't ask to
be told about the network, they asked to write a note.

**Failure destroys work.** The `catch` block does the most defensible
thing available to it — "the save didn't happen, so show the truth" — and
the result is that the app deletes your paragraph. That's not a bug in
the catch block. It's a consequence of the server being the truth: if the
server didn't get it, it didn't happen, so what you typed isn't real.

**The app is unusable while it waits.** `busy` disables everything, so a
1.2 second request is 1.2 seconds of frozen app. Lose signal entirely
and the app is simply off.

**Two round trips per action.** Save writes, then re-reads the whole list
"to be sure" — doubling the wait and the failure surface for a fact the
client already knew.

**An unsaved edit exists in exactly one place: React state.** Refresh,
crash, close the tab, and it's gone. There is no reason for that; the
device has a disk.

**None of the important questions can be tested.** Does a failed save
keep your text? Does deleting a note on another device remove it here?
Is a rename applied on top of a stale server copy? Every one of those is
currently answered by clicking and hoping.

## 5. Try it yourself first!

1. **Vague:** the app can't show a note without asking the server. Where
   else could the notes live so the first frame needs no network at all?
2. **Warmer:** put the notes in `localStorage` and render from there.
   Now the screen is instant. But what happens to a change the server
   hasn't heard about yet — how does the app remember to tell it?
3. **The outbox:** keep a list of pending *ops* — small objects
   describing edits. Every user action does two things: apply the op
   locally, and push it onto the queue. Notice what's missing from that
   sentence: `await`, `try`, and `catch`.
4. **The loop:** write an effect that, when online and the queue isn't
   empty, sends it and removes what was acknowledged. What should it do
   when the request fails? (The answer is "nothing" — work out why.)
5. **The merge:** the server's answer and your local copy will disagree.
   Write `mergeServerState(local, server, pendingOps)` as a pure
   function and decide three things on paper first: who wins a conflict,
   who wins a tie, and what happens to a note that only exists locally.
6. **The trap:** a note you deleted locally is still on the server. If
   your merge takes "everything the server has", what comes back?
7. **The other trap:** the user keeps typing while a sync is in flight.
   When the response arrives, how do you remove *only* the ops you
   actually sent?

## 6. Understanding the refactored solution

**Three pure functions, and they're the entire design.** First,
`applyOp(state, op)` — what does this edit mean?

```js
case 'upsert': {
  const base = existing || { id: op.noteId, title: '', body: '', deleted: false };
  return { ...state, notes: { ...state.notes,
    [op.noteId]: { ...base, ...op.fields, deleted: false, updatedAt: op.at } } };
}
```

Partial fields merge onto whatever's there, so an op can carry just a
title. Note `deleted: false` on upsert — editing a tombstone revives it,
which is what "I undeleted it by typing in it" should mean. And the
`default: return state` case hands back the *same object*, the no-op
contract this track keeps using.

`enqueueOp(pending, op)` — what still needs sending?

```js
const next = [...pending];
next[index] = { ...pending[index], ...op, fields: { ...pending[index].fields, ...op.fields } };
```

Two rules with real consequences. Consecutive upserts to one note merge
**in place**, so 200 keystrokes are one request and the queue keeps the
order things happened in. And the merged op takes the **new** `opId` —
that's the answer to try-it-yourself #7: a sync already in flight sent
the *old* id, so when it comes back, "remove everything I sent" can't
accidentally acknowledge keystrokes that landed while it was travelling.

`mergeServerState(local, server, pendingOps)` — whose copy wins?

```js
notes[id] = mine.updatedAt > theirs.updatedAt ? mine : theirs;   // LWW, ties to the server
if (!theirs) { if (unsent.has(id)) notes[id] = mine; }           // never sent: keep it
return pendingOps.reduce(applyOp, { ...local, notes });          // replay the outbox on top
```

Four rules, in order: start from the server, last write wins, keep
local-only notes only while the outbox still mentions them, then replay
the outbox on top. That last line guarantees the original's cardinal sin
can't happen — an unsent edit is applied *after* the merge, every time,
so no server response can overwrite what the user just typed. It's
justified rather than defensive: those ops never reached the server, so
nothing in its answer can be a reply to them.

**Every user action is now two lines and cannot fail:**

```js
function dispatchOp(op) {
  setState((s) => applyOp(s, op));      // what they see
  setPending((p) => enqueueOp(p, op));  // what we owe the server
}
```

No `try`, no `catch`, no `await`, and no save button — saving isn't an
action the user performs any more.

**The sync loop is the only place that knows about the network:**

```js
useEffect(() => {
  if (!online || syncing || pending.length === 0) return;
  let cancelled = false;
  const timer = setTimeout(async () => {
    setSyncing(true);
    const batch = pending;
    try {
      const server = await serverSync(batch);
      if (cancelled) return;
      const sent = new Set(batch.map((op) => op.opId));
      const remaining = pendingRef.current.filter((op) => !sent.has(op.opId));
      setPending(remaining);
      setState((s) => mergeServerState(s, server, remaining));
    } catch (e) {
      /* keep the queue; the next tick retries */
    } finally { if (!cancelled) setSyncing(false); }
  }, 700);
  return () => { cancelled = true; clearTimeout(timer); };
}, [online, syncing, pending]);
```

Three pieces of discipline. The empty `catch` is deliberate and should
be commented like this one: a failed sync leaves the queue exactly as it
was, and the effect re-runs when anything changes, so retrying is
automatic and needs no code. The `cancelled` flag plus cleanup is
project 19's race guard. And `pendingRef` (project 26) holds the
*current* queue, so acknowledging a batch can't discard ops that arrived
while it was in the air.

**The persistence is four lines**, wrapping `localStorage` in a
`try/catch` because private mode throws. Losing the cache loses offline
support, not the app.

**The fake server runs `applyOp` too.** Not a shortcut for the demo —
it's the reason the design works. One rulebook, applied on both sides of
the wire, is what makes "replay these ops" a safe thing to say.

**The status chip is derived** (project 09):
`syncStatus({ online, pendingCount, syncing })` is a unit-tested pure
function of three facts, with no fourth state variable to fall out of
step with reality.

## 7. Words you learned (glossary)

- **Source of truth:** the copy of the data the UI is a function of.
- **Offline-first:** local state is the truth; the network syncs it.
- **Optimistic update:** apply the change before the server confirms
  (project 39).
- **Op (operation):** a small serializable description of one edit.
- **Outbox / pending queue:** ops not yet acknowledged by the server.
- **Drain:** send the queued ops and remove what was acknowledged.
- **Dedupe / collapse:** merging repeated edits into one op.
- **Last-write-wins (LWW):** conflict resolution by newest timestamp.
- **Tombstone:** a dated "this was deleted" marker kept in state.
- **Merge / reconcile:** combining the server's copy with the local one.
- **Race guard:** a flag that stops a stale response being applied (19).
- **Monotonic clock:** a timestamp source that never repeats, so "newest"
  is never a coin toss.
- **CRDT:** a structure that merges concurrent edits without a central
  referee — what you graduate to when LWW isn't enough.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load.

1. **Feel the difference in ten clicks.** In `original.html`, type a
   sentence and hit save repeatedly until an alert appears. Expected:
   your text is replaced by the server's older copy. Do the same in the
   refactor — there's no save button, so instead tick **offline**, type a
   paragraph, refresh the page, and untick offline. Expected: your
   paragraph is still there and the chip counts down to `synced`.
2. **Turn the failure rate to 1.** Set `FAILURE_RATE = 1` in the
   refactor. Expected: the app is completely unaffected — you can create,
   edit and delete all day. The chip sticks at `N pending` and never
   reaches `synced`, which is exactly the right amount of honesty.
3. **Break the tombstone.** In `applyOp`, make the `delete` case remove
   the key instead: `const notes = { ...state.notes }; delete
   notes[op.noteId]; return { ...state, notes };`. Expected: the note
   disappears, then reappears after the next successful sync, because
   the merge sees a note the server has and you don't. Then run
   `node --test react/59-offline-first-notes/refactored/sync.test.js`
   and read which test names the problem.
4. **Break last-write-wins.** Change the merge to always prefer the
   server (`notes[id] = theirs`). Expected: press "simulate another
   device", then type — and watch your typing get overwritten every time
   the sync completes. The cursor jumping backwards is what a bad merge
   rule feels like.
5. **Watch the dedupe work.** Add `console.log('sending', batch.length,
   'ops')` in the sync loop and type a long sentence quickly. Expected:
   one op, however many characters. Then delete the collapse branch from
   `enqueueOp` and try again — one op per keystroke.
6. **Add a "conflict" indicator.** Have `mergeServerState` also return a
   list of note ids where the server's copy won over a differing local
   one, and show a small note in the UI. Expected: it fires when you
   press "simulate another device" while an old local edit exists — the
   first step from LWW toward telling the user the truth, and a good
   place to feel why real collaboration eventually needs CRDTs.
