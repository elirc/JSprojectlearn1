# 🏋️ Practice: Collaborative Todo List

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. pendingCount (warm-up)

Write `pendingCount(state)` returning how many todos are still optimistic placeholders (`pending: true`) — the number the page could show as "syncing…". Check: two `optimisticAdd`s give a count of 2; after `applyEvent` confirms one of them (its `originTag` in `myTags`), the count drops to 1; `initialState()` gives 0.

What it practices: reading the state shape — pending is a visible state, so it should be countable.

Hint: `filter` on the `pending` flag, then `.length`.

### ⭐⭐ 2. optimisticDelete (core)

`sync.js` has `optimisticAdd` and `optimisticToggle` but no delete. Write `optimisticDelete(state, id)` — pure, immutable — that removes the row instantly. Simplest correct design: just filter it out; if the server later rejects the write, rollback is "re-sync from the log," so no tombstone bookkeeping is needed. Check: the row disappears from the new state while the *old* state still contains it, and when the server's `{ type: 'deleted' }` echo arrives, `applyEvent` leaves the list empty and advances `version`.

What it practices: extending the optimistic layer in the file's own style — new state out, old state kept for rollback.

Hint: `state.todos.filter((t) => t.id !== id)`, spread the rest.

### ⭐⭐ 3. Deleting a ghost — version must still advance (core)

Add a test for an edge `sync.test.js` skips: a `deleted` event for an id this client never had (someone else added *and* deleted it while you were offline, and your `?since=` replay starts after the add… or the log was compacted). Assert the todos are untouched **and** `state.version` still becomes the event's version — then prove why it matters by applying a following version-3 upsert and asserting it lands rather than being treated as out of sequence.

What it practices: the invariant that version tracks *events processed*, not *rows changed*.

Hint: `applyEvent` runs the delete branch before any "did we have it?" check — `filter` on a missing id is a no-op that still returns `{ todos, version: event.version }`.

### ⭐⭐ 4. planFor — spotting a gap in the stream (core)

Events arrive numbered, so a client can *detect* lost messages: write `planFor(state, event)` returning `'ignore'` when `event.version <= state.version` (stale/duplicate), `'apply'` when it's exactly `state.version + 1`, and `'resync'` when it jumps further ahead — meaning events were missed and the client should refetch `/events?since=`. Check all five: state at version 3 with events versioned 2, 3, 4, 6 → `ignore`, `ignore`, `apply`, `resync`; a fresh client seeing version 1 → `apply`.

What it practices: turning the versioned log into a self-diagnosing stream — the same `?since=` idea, driven from the client side.

Hint: three comparisons, in the order stale → next → gap.

### ⭐⭐⭐ 5. Compact the log (challenge)

A server that never restarts grows its log forever, yet a *new* client only needs enough events to rebuild the current list. Write `compact(log)` producing a minimal equivalent log: for each id keep only the **latest** upsert, drop upserts whose todo was later deleted, drop the delete events themselves (a fresh client can't have the row anyway), and renumber versions 1…n. Prove equivalence: `applyEvents(initialState(), compact(log))` must yield **exactly the same `todos` array** (same order!) as replaying the full log — including a log where a todo is deleted and then re-added under the same id. Also check: an empty log and an everything-deleted log both compact to `[]`.

What it practices: the log-vs-state duality — compaction is deriving the minimal history that produces the same state.

Hint: one pass with a `Map` from id → latest upsert, calling `.delete(id)` on deletes; a `Map` keeps first-insertion order, and re-adding after a delete moves the id to the end — exactly matching full-replay order.

### ⭐⭐⭐ 6. flushOutbox — writes queued while offline (challenge)

LEARN.md's kill-the-server experiment shows writes just fail while disconnected. Design the fix's core: an outbox array of queued operations and `async flushOutbox(outbox, send)` that sends them **in order**, one at a time (`await` each), stops at the first `send` that resolves `false` (still offline), and returns the array of operations not yet sent — without mutating the input. Check with fakes: an always-true `send` receives ops in order and returns `[]`; a `send` failing on the second call leaves ops 2 and 3 queued in order; flushing the returned remainder with a working `send` drains it.

What it practices: retry-friendly queue logic — pure enough to test with a fake `send`, exactly like the server tests fake a browser.

Hint: copy the array, `while` it's non-empty `await send(remaining[0])`, `shift()` on success, `break` on failure.

## Solutions

### 1. pendingCount

```js
export function pendingCount(state) {
  return state.todos.filter((t) => t.pending).length;
}
```

WHY: The refactor's rule is that *pending* is a real, visible state — placeholder rows render dimmed — so it must be derivable from state, not scattered in DOM classes. Confirmed rows lose the flag when `applyEvent` swaps in the server's todo, so the count falls to zero exactly when the client is fully in sync: a free "all changes saved" indicator.

### 2. optimisticDelete

```js
export function optimisticDelete(state, id) {
  return { ...state, todos: state.todos.filter((t) => t.id !== id) };
}
```

WHY: It follows the file's contract — new state out, input untouched — so the pre-delete state remains available, and true rollback is "rebuild from the log," the same answer as every other rejection. No `pending` tombstone is needed because the server's `deleted` echo finds the row already gone: `filter` on an absent id changes nothing, and only the version advances. Removal being idempotent is what makes optimistic-then-confirm safe here without originTag gymnastics.

### 3. The ghost-delete test

```js
test('deleting an id we never had: list untouched, version still advances', () => {
  const seed = { version: 1, type: 'upsert', originTag: 's', todo: { id: 1, title: 'a', done: false } };
  let s = applyEvent(initialState(), seed, new Set());
  s = applyEvent(s, { version: 2, type: 'deleted', originTag: 'x', todoId: 99 }, new Set());
  assert.deepEqual(s.todos.map((t) => t.title), ['a']);
  assert.equal(s.version, 2); // the invariant under test
  // and the stream keeps flowing — version 3 is not "out of sequence":
  s = applyEvent(s, { version: 3, type: 'upsert', originTag: 'y', todo: { id: 2, title: 'b', done: false } }, new Set());
  assert.deepEqual(s.todos.map((t) => t.title), ['a', 'b']);
});
```

WHY: `version` means "I have processed the log up to here" — it must advance for every accepted event, even ones that change no rows. If a ghost delete left `version` at 1, this client would *ignore* nothing (later events still exceed it) but any gap-detection or `?since=` logic would silently mis-report; the follow-up upsert assertion makes the consequence concrete instead of theoretical.

### 4. planFor

```js
export function planFor(state, event) {
  if (event.version <= state.version) return 'ignore';
  if (event.version === state.version + 1) return 'apply';
  return 'resync';
}
```

WHY: The numbered log makes the stream self-describing: any client can classify an incoming event with two comparisons, no server round-trip. `applyEvent` already survives stale events, but a *jump* means missed history that no local logic can invent — the only honest response is refetching `/events?since=`, and this function is the decision point the reconnect path already implements implicitly.

### 5. compact

```js
export function compact(log) {
  const lastUpsert = new Map(); // id -> latest surviving upsert
  for (const event of log) {
    if (event.type === 'deleted') lastUpsert.delete(event.todoId);
    else lastUpsert.set(event.todo.id, event);
  }
  return [...lastUpsert.values()].map((event, i) => ({ ...event, version: i + 1 }));
}
```

WHY: Compaction works because state is a *fold* over the log — any shorter log with the same fold result is equivalent for a fresh client, and "latest upsert per surviving id" is the minimal such log. The `Map` earns its place with ordering: it remembers first-insertion position for updated keys, and `delete` + re-`set` moves a re-added id to the end — both matching exactly how `applyEvent` orders the todos array during a full replay, which is why the same-order assertion passes. Real systems (Kafka compaction, Redux snapshotting) ship this exact idea; renumbering only works for a *fresh* client, since existing clients' versions refer to the old numbering.

### 6. flushOutbox

```js
export async function flushOutbox(outbox, send) {
  const remaining = [...outbox];
  while (remaining.length > 0) {
    const ok = await send(remaining[0]);
    if (!ok) break; // still offline — keep the rest, in order
    remaining.shift();
  }
  return remaining;
}
```

WHY: Order is the whole game — the server assigns versions in arrival order, so flushing out of order could commit "toggle" before the "add" it targets; one-at-a-time `await` preserves the user's intent sequence. Stopping at the first failure (rather than skipping ahead) keeps the queue a clean prefix-drained structure, and returning the remainder instead of mutating lets the caller retry later with the same function — the same "return the new value, keep the old" discipline as every pure function in `sync.js`. Fake `send` functions make all three behaviors testable offline, mirroring how `server.test.js` fakes a browser.
