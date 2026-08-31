/**
 * Offline-first syncing, as pure functions. No React, no fetch, no
 * localStorage — those are the "doing". This file is the "deciding":
 *
 *   applyOp(state, op)                    what does this edit mean?
 *   enqueueOp(pending, op)                what still needs sending?
 *   mergeServerState(local, server, ops)  whose copy wins?
 *
 * Shapes:
 *   note   { id, title, body, updatedAt, deleted }
 *   state  { notes: { [id]: note } }
 *   op     { opId, type: 'upsert' | 'delete', noteId, fields?, at }
 *
 * `deleted` is a TOMBSTONE, not a bug: a deleted note has to stay in
 * state as a dated marker, or the next merge with the server would see
 * "the server has it, I don't" and cheerfully bring it back.
 */
export const emptyState = { notes: {} };

/** Apply one edit to local state. Pure; unknown ops change nothing. */
export function applyOp(state, op) {
  const existing = state.notes[op.noteId];
  switch (op.type) {
    case 'upsert': {
      const base = existing || { id: op.noteId, title: '', body: '', deleted: false };
      return {
        ...state,
        notes: {
          ...state.notes,
          [op.noteId]: { ...base, ...op.fields, deleted: false, updatedAt: op.at },
        },
      };
    }
    case 'delete': {
      const base = existing || { id: op.noteId, title: '', body: '' };
      return {
        ...state,
        notes: { ...state.notes, [op.noteId]: { ...base, deleted: true, updatedAt: op.at } },
      };
    }
    default:
      return state; // same reference in, same reference out
  }
}

/**
 * Add an op to the outbox, collapsing what the server never needs to see.
 *
 * - Two upserts of the same note become one, merged, IN ITS ORIGINAL
 *   PLACE — typing 200 characters must not become 200 requests, and the
 *   queue's order is the order things happened. The merged op takes the
 *   NEW `opId`: a sync that's already in flight sent the old op, and it
 *   must not be allowed to acknowledge away the keystrokes that landed
 *   while it was travelling.
 * - A delete cancels every pending edit to that note. Sending "rename
 *   it, then delete it" would be honest and pointless.
 */
export function enqueueOp(pending, op) {
  if (op.type === 'delete') {
    return [...pending.filter((queued) => queued.noteId !== op.noteId), op];
  }
  if (op.type === 'upsert') {
    const index = pending.findIndex(
      (queued) => queued.type === 'upsert' && queued.noteId === op.noteId,
    );
    if (index === -1) return [...pending, op];
    const next = [...pending];
    next[index] = { ...pending[index], ...op, fields: { ...pending[index].fields, ...op.fields } };
    return next;
  }
  return pending;
}

/**
 * Reconcile the copy on this device with the copy the server just sent,
 * then re-apply anything still waiting in the outbox.
 *
 * The rules, in order:
 * 1. Start from the server. It's what everyone else can see.
 * 2. Per note, LAST WRITE WINS on `updatedAt` — a strictly newer local
 *    copy replaces the server's. Ties go to the server, so the rule is
 *    total and two devices merging the same pair always agree.
 * 3. A note that exists only locally survives only if the outbox still
 *    mentions it. Otherwise it was synced once and has since been
 *    deleted by someone else, and keeping it would resurrect it.
 * 4. Replay the outbox on top. Those edits have never reached the
 *    server, so nothing in the server's answer can be a response to
 *    them — the user's unsent intent always wins locally.
 */
export function mergeServerState(local, server, pendingOps = []) {
  const unsent = new Set(pendingOps.map((op) => op.noteId));
  const notes = { ...server.notes };

  for (const id of Object.keys(local.notes)) {
    const mine = local.notes[id];
    const theirs = server.notes[id];
    if (!theirs) {
      if (unsent.has(id)) notes[id] = mine; // never sent: not the server's to delete
      continue;
    }
    notes[id] = mine.updatedAt > theirs.updatedAt ? mine : theirs;
  }

  return pendingOps.reduce(applyOp, { ...local, notes });
}

/** The notes a human should see: alive, newest first. */
export function visibleNotes(state) {
  return Object.values(state.notes)
    .filter((note) => !note.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** What the status chip says. Derived, never stored (project 09). */
export function syncStatus({ online, pendingCount, syncing }) {
  if (!online) return pendingCount > 0 ? `offline — ${pendingCount} waiting` : 'offline';
  if (syncing) return 'syncing…';
  if (pendingCount > 0) return `${pendingCount} pending`;
  return 'synced';
}
