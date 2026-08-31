# 🏋️ Practice: Offline-First Notes

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The pure-logic exercises can be checked with `node --test`; the rest are checkable by reading and reasoning about your code — run the page later when you have internet, since React loads from a CDN.)

Exercises 3, 4 and 5 change `refactored/sync.js` and `refactored/sync.test.js` (and the copy of the rules inside `refactored/index.html`); 1 and 2 are about `refactored/index.html`.

## Exercises

### ⭐ 1. Undo a delete (warm-up)

Add an **undo delete** button that brings back the most recently deleted note. You already have everything you need — deleted notes are still in state, wearing a tombstone.

**Practices:** discovering that a design decision made for the *sync* engine ("keep dated markers so merges work") quietly handed you a user-facing feature.

**Hint:** find the tombstone with the newest `updatedAt`, and revive it with an ordinary `upsert` op carrying no fields at all. Look at what `applyOp`'s upsert case does to `deleted` and you'll see why that's enough.

**Expected:** delete a note, press undo, and it returns with its title and body intact — because a tombstone kept them. The revival is a normal op, so it queues, syncs, and wins on the server by last-write-wins like any other edit. In the original this feature is impossible: the note was `delete`d from a database on another machine.

### ⭐⭐ 2. Predict the queue, the state, and the renders (core)

**Part A, on paper.** Start from `n1` (title `Shopping`, body `milk, bread`, `updatedAt: 1`) and `n2` (`Ideas`, `updatedAt: 2`), with an empty outbox. Apply, in order:

```js
edit('n1', { title: 'Shop' })          // at 10
edit('n1', { body: 'x' })              // at 11
remove('n2')                           // at 12
edit('n1', { title: 'Shopping list' }) // at 13
```

Write down: how many ops are in the outbox, in what order, with what `fields` and `at`; and what `visibleNotes(state)` returns.

**Part B, on paper.** The sync then succeeds, and the server's reply contains `n1` exactly as it was at `updatedAt: 1`, `n2` at `updatedAt: 2`, and a new `n9` from another device. What does the merged state contain, and what does the list show?

**Part C, on paper.** In the refactor, which components re-render when you type one character into the body? Compare with the original, and say what *else* the original does on that keystroke that the refactor doesn't.

**Practices:** running the three pure functions in your head, which is the only way to be sure you understand a sync engine — and noticing that "the server answered with stale data" is a case the design has already handled rather than a bug waiting to happen.

**Hint:** for Part A, `enqueueOp` merges upserts for the same note *in place*. For Part B, remember the last line of `mergeServerState` and what it does with the outbox.

**Expected:** four user actions leave **two** ops in the outbox. After the merge, the note you renamed still says what you typed, the note you deleted stays deleted, and the laptop's note appears — even though the server's answer disagreed with all three.

### ⭐⭐ 3. Back off when the server is unhappy (core)

Right now a failed sync retries 700ms later, forever, at the same pace. Add exponential backoff: on each consecutive failure wait twice as long, up to a ceiling; on success, reset. Make the delay a pure `backoffDelay(attempt)` with tests, and add a **retry now** button that skips the wait.

**Practices:** extracting the one decision from a retry loop. "How long should I wait?" is arithmetic; "wait, then try" is plumbing.

**Hint:** `Math.min(cap, base * 2 ** attempt)`. Keep the attempt count in state so the effect re-runs, and reset it to 0 in the success path — a backoff that never resets is a bug that only shows up after a bad hour.

**Expected:** `backoffDelay` returns 700, 1400, 2800, 5600, 11200 and then sticks at 20000. With `FAILURE_RATE = 1` the chip stays `N pending` while the gaps between attempts visibly stretch, and "retry now" fires one immediately. Nothing about the user's ability to keep typing changes.

### ⭐⭐ 4. Show which notes aren't saved yet (core)

Put a small dot next to every note in the list that has an op waiting in the outbox, and a tooltip saying how many. Derive it — do not add a `saved: false` field to notes.

**Practices:** project 09's rule under pressure. "Is this note saved?" *feels* like a property of a note, and storing it there would be wrong: you'd then have to remember to clear it in the sync loop, in the merge, and after a failed drain.

**Hint:** `const unsaved = new Set(pending.map((op) => op.noteId));` computed during render. One line, always right, impossible to forget to update.

**Expected:** dots appear the instant you type and vanish when the chip reaches `synced` — including on notes edited while offline. Go offline, edit three notes, and exactly three dots show. Now imagine maintaining a stored `saved` flag through a failed sync that partially drained: that's the bug you just didn't write.

### ⭐⭐⭐ 5. Tell the user when they lost (challenge)

Last-write-wins is quiet: when the server's copy is newer, your text is replaced and nothing says so. Make `mergeServerState` also report which notes were overwritten, and show a dismissible line: *"'Shopping' was updated on another device."*

Change the signature to return `{ state, conflicts }`, update every caller and every test, and be precise about what counts as a conflict.

**Practices:** changing a pure function's contract on purpose — and finding out that the blast radius is one file plus its tests, because nothing else knew how the merge worked.

**Hint:** a conflict is "the server won **and** the two copies actually differed". Identical text with different timestamps is not a conflict, and a note *you* won is not one either. Compare `title`, `body` and `deleted` — and remember the outbox replay still runs afterwards, so a reported conflict can still end with your text on screen (which is correct: your unsent edit is newer than both).

**Expected:** press "simulate another device", wait for the sync, and a line appears naming the note. Editing that same note yourself and syncing again produces **no** conflict, because your copy is newer. Two devices saving identical text produce no conflict either. And every existing merge test still passes once you change `merged.notes` to `merged.state.notes` — the *behaviour* didn't move, only the shape of the return.

## Solutions

### 1. Undo a delete

```jsx
const lastDeleted = Object.values(state.notes)
  .filter((note) => note.deleted)
  .sort((a, b) => b.updatedAt - a.updatedAt)[0];

<button disabled={!lastDeleted}
        onClick={() => { edit(lastDeleted.id, {}); setSelectedId(lastDeleted.id); }}>
  undo delete
</button>
```

**Why:** `edit(id, {})` queues `{ type: 'upsert', noteId: id, fields: {} }`, and `applyOp`'s upsert case spreads `deleted: false` over whatever was there. So "revive" needed no new op type, no new case, and no new test — the resurrection semantics were already implied by "editing a note un-deletes it", which is what you'd want if a note came back from another device anyway. Notice the shape of the win: the tombstone was added for the *merge*, purely so the sync engine wouldn't resurrect deleted notes, and it turns out to be exactly the data an undo needs. Features get cheap when the state model is honest about what happened rather than only about what's currently visible. The original can't offer this at any price: it sent `DELETE` and the row is gone from a database on another machine.

### 2. Predict the queue, the state, and the renders

**Part A.** Two ops:

```js
[ { type: 'upsert', noteId: 'n1', fields: { title: 'Shopping list', body: 'x' }, at: 13 },
  { type: 'delete', noteId: 'n2', at: 12 } ]
```

The three `n1` edits collapsed into one op that kept **position 0** (where the first one landed) but carries the **latest** fields and `at: 13`. The delete came third in time and sits second in the queue, which is the order things happened to *different* notes. Local state has `n1` as `{ title: 'Shopping list', body: 'x', updatedAt: 13 }` and `n2` tombstoned; `visibleNotes(state)` returns `['n1']`.

**Part B.** After `mergeServerState(state, server, queue)`:

- `n1` still says `Shopping list` at `updatedAt: 13`. Two rules protected it — local's 13 beats the server's 1 under last-write-wins, and even if it hadn't, the outbox replay runs afterwards.
- `n2` is still a tombstone, for the same two reasons.
- `n9` appears: it's in the server's copy and nowhere in the local one, so it arrives untouched.
- The list shows `['n1', 'n9']`, newest first.

**Part C.** In the refactor, `state` lives in `App`, so a keystroke re-renders `App` and its whole subtree — this is a single-component app with a list and an editor, and that's fine. What matters is what *doesn't* happen: no request, no `await`, no error path, no disabled UI. The sync effect will re-run because `pending` changed, but `enqueueOp` merged the op into the existing one, so the queue length usually doesn't move and the debounce timer simply restarts.

In the original, the same keystroke re-renders `App` too — and additionally, every *save* is two round trips, the page is disabled while they run, and a failure resets the editor to the server's copy. The difference isn't render count; it's that in the original a keystroke is the start of a transaction that can fail, and in the refactor it's a fact that has already happened.

**Why:** the interesting part of Part B is that the server's answer was *wrong in three different ways* — stale `n1`, resurrected `n2`, unknown `n9` — and the merge handled all three without a special case, because each is covered by one of the four ordered rules. That's the payoff for writing the rules down as a pure function instead of scattering `if (response.notes[id])` checks through an effect. And the answer to Part A is the one to keep: four user actions, two requests. The queue is a set of intentions, not a transcript.

### 3. Back off when the server is unhappy

```js
/** How long to wait before retry number `attempt` (0-based). */
export function backoffDelay(attempt, { base = 700, cap = 20000 } = {}) {
  return Math.min(cap, base * 2 ** attempt);
}
```

```js
test('backoff doubles and then stops', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map((a) => backoffDelay(a)),
    [700, 1400, 2800, 5600, 11200, 20000, 20000]);
  assert.equal(backoffDelay(0, { base: 100, cap: 300 }), 100);
  assert.equal(backoffDelay(9, { base: 100, cap: 300 }), 300);
});
```

```jsx
const [attempt, setAttempt] = useState(0);

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
      setAttempt(0);                                  // reset on success
    } catch (e) {
      if (!cancelled) setAttempt((a) => a + 1);       // and try again, later
    } finally {
      if (!cancelled) setSyncing(false);
    }
  }, backoffDelay(attempt));
  return () => { cancelled = true; clearTimeout(timer); };
}, [online, syncing, pending, attempt]);

<button onClick={() => setAttempt(0)}>retry now</button>
```

**Why:** the whole feature is `Math.min(cap, base * 2 ** attempt)` plus one state variable, because the retry *mechanism* already existed — the effect re-runs whenever its dependencies change, so incrementing `attempt` both records the failure and schedules the next attempt. That's the shape to notice: in a well-built effect, "retry with a delay" is a dependency, not a loop. Three details earn their place. Resetting to 0 on success is the bug people ship without: a counter that only goes up means one bad hour leaves the app checking every 20 seconds for the rest of the session. The cap exists because doubling is exponential and the tenth failure would otherwise schedule a retry in twelve days. And "retry now" is `setAttempt(0)` — a button that changes a *number*, not a button that performs a network request, which is why it can't double-fire or race with the loop.

Real clients add **jitter** (a random 0–30%) so that ten thousand phones that lost signal at the same moment don't all reconnect on the same second and knock the server over again. One line, `delay * (1 + Math.random() * 0.3)`, and a genuinely different failure mode avoided.

### 4. Show which notes aren't saved yet

```jsx
const unsaved = new Set(pending.map((op) => op.noteId));   // derived, every render
...
<li key={note.id} className={note.id === selectedId ? 'active' : ''}>
  {unsaved.has(note.id) && (
    <span title="not sent yet" style={{ color: '#c08a00' }}>● </span>
  )}
  {note.title || '(untitled)'}
</li>
```

```js
test('the unsaved set is exactly the notes the outbox mentions', () => {
  const pending = [
    { type: 'upsert', noteId: 'n1', fields: {}, at: 1 },
    { type: 'delete', noteId: 'n2', at: 2 },
  ];
  assert.deepEqual([...new Set(pending.map((op) => op.noteId))], ['n1', 'n2']);
});
```

**Why:** one line, computed during render, and it cannot be wrong. Compare with the alternative that feels natural — a `saved: false` field on the note — and count the places you'd have to remember to update it: when queueing an op, when a sync succeeds (but only for the ops actually acknowledged), when a sync fails (don't touch it), when the merge brings a note back from the server, when a delete cancels pending edits, and when the app reloads from cache. Six chances to forget, and the symptom of forgetting is a dot that lies about whether your work is safe. Project 09's rule — "storing what you can compute is the #1 React smell" — is usually taught with a `total` field on a cart; this is the version that bites, because the derived value is a *promise to the user*.

The one honest limit: this says "in the outbox", not "on the server". An op removed from the queue is acknowledged, so the dot disappearing does mean saved — but only because the sync loop removes ops *after* the response, never before. That ordering is load-bearing; swap those two lines and the dot becomes a lie during every failure.

### 5. Tell the user when they lost

```js
export function mergeServerState(local, server, pendingOps = []) {
  const unsent = new Set(pendingOps.map((op) => op.noteId));
  const notes = { ...server.notes };
  const conflicts = [];

  for (const id of Object.keys(local.notes)) {
    const mine = local.notes[id];
    const theirs = server.notes[id];
    if (!theirs) {
      if (unsent.has(id)) notes[id] = mine;
      continue;
    }
    const localWins = mine.updatedAt > theirs.updatedAt;
    const differs =
      mine.title !== theirs.title ||
      mine.body !== theirs.body ||
      Boolean(mine.deleted) !== Boolean(theirs.deleted);
    if (!localWins && differs) conflicts.push(id);
    notes[id] = localWins ? mine : theirs;
  }

  return { state: pendingOps.reduce(applyOp, { ...local, notes }), conflicts };
}
```

```js
test('a conflict is the server winning against a copy that actually differed', () => {
  const overwritten = mergeServerState(
    { notes: { n1: note('n1', 'mine', 10) } },
    { notes: { n1: note('n1', 'theirs', 20) } });
  assert.deepEqual(overwritten.conflicts, ['n1']);
  assert.equal(overwritten.state.notes.n1.title, 'theirs');

  const identical = mergeServerState(
    { notes: { n1: note('n1', 'same', 10) } },
    { notes: { n1: note('n1', 'same', 20) } });
  assert.deepEqual(identical.conflicts, [], 'same text is not a conflict');

  const iWon = mergeServerState(
    { notes: { n1: note('n1', 'mine', 30) } },
    { notes: { n1: note('n1', 'theirs', 20) } });
  assert.deepEqual(iWon.conflicts, [], 'winning is not a conflict');
});

test('a conflict is reported even when the outbox then wins it back', () => {
  const merged = mergeServerState(
    { notes: { n1: note('n1', 'mine', 10) } },
    { notes: { n1: note('n1', 'theirs', 20) } },
    [{ opId: 'x', type: 'upsert', noteId: 'n1', fields: { title: 'mine' }, at: 25 }]);
  assert.deepEqual(merged.conflicts, ['n1']);
  assert.equal(merged.state.notes.n1.title, 'mine');
});
```

```jsx
const [conflicts, setConflicts] = useState([]);
...
const { state: nextState, conflicts: hit } = mergeServerState(s, server, remaining);
setState(nextState);
if (hit.length) setConflicts(hit);
...
{conflicts.length > 0 && (
  <p className="banner">
    {conflicts.map((id) => `“${state.notes[id]?.title || 'a note'}”`).join(', ')}
    {conflicts.length === 1 ? ' was' : ' were'} updated on another device.
    <button onClick={() => setConflicts([])}>dismiss</button>
  </p>
)}
```

**Why:** the definition is the whole exercise, and the two exclusions are what stop the feature from becoming noise. Identical text with different timestamps happens constantly — two devices syncing the same edit, a re-save, a replayed op — and reporting those would train the user to ignore the banner within a day. A note *you* won isn't a conflict either: nothing of yours was lost, and telling someone "your change won" is a notification about nothing. What's left is precisely the case the user needs to know about, and it's expressible in two comparisons.

The fourth test is the subtle one. A conflict can be reported and *then* undone by the outbox replay, and both halves are correct: the server did overwrite the copy that was on this device, and your unsent edit — newer than both — then wins on top. Reporting it is still right, because the version that got overwritten was real and is now gone from the merge. Being precise about that beats the tempting alternative of "report a conflict only if the final state doesn't match what I had", which quietly hides real losses whenever a pending op happens to touch the same note.

Finally, notice the cost of changing a pure function's *contract* rather than its behaviour: one call site and one line per test (`merged.notes` → `merged.state.notes`). Nothing else in the app knew how merging worked, so nothing else had to be told it changed. That containment is what you buy when the decision lives in its own file, and it's the same property that made project 58's search engine survive a rewrite.
