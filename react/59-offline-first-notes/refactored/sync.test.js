// The hard part of an offline-first app is not the network code — it's
// the three questions about ownership of data. All three are pure
// functions here, so all three have tests that run in milliseconds with
// no server, no browser and no waiting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOp,
  enqueueOp,
  mergeServerState,
  visibleNotes,
  syncStatus,
  emptyState,
} from './sync.js';

const upsert = (noteId, fields, at) => ({ opId: `${noteId}@${at}`, type: 'upsert', noteId, fields, at });
const del = (noteId, at) => ({ opId: `${noteId}!${at}`, type: 'delete', noteId, at });
const note = (id, title, updatedAt, extra = {}) =>
  ({ id, title, body: '', deleted: false, updatedAt, ...extra });

// ---- applyOp ------------------------------------------------------------

test('an upsert creates a note that did not exist', () => {
  const state = applyOp(emptyState, upsert('n1', { title: 'Milk' }, 10));
  assert.deepEqual(state.notes.n1,
    { id: 'n1', title: 'Milk', body: '', deleted: false, updatedAt: 10 });
});

test('an upsert merges fields and stamps the time', () => {
  const first = applyOp(emptyState, upsert('n1', { title: 'Milk', body: 'two' }, 10));
  const second = applyOp(first, upsert('n1', { body: 'three' }, 20));
  assert.deepEqual(second.notes.n1,
    { id: 'n1', title: 'Milk', body: 'three', deleted: false, updatedAt: 20 });
});

test('a delete leaves a dated tombstone, not a hole', () => {
  const created = applyOp(emptyState, upsert('n1', { title: 'Milk' }, 10));
  const deleted = applyOp(created, del('n1', 20));
  assert.equal(deleted.notes.n1.deleted, true);
  assert.equal(deleted.notes.n1.updatedAt, 20);
  assert.equal(deleted.notes.n1.title, 'Milk', 'the content is still there to merge with');
});

test('an unknown op changes nothing at all', () => {
  const state = applyOp(emptyState, { type: 'teleport', noteId: 'n1', at: 1 });
  assert.equal(state, emptyState); // same reference
});

test('applying ops never mutates the state it was given', () => {
  const before = applyOp(emptyState, upsert('n1', { title: 'Milk' }, 10));
  const snapshot = JSON.stringify(before);
  applyOp(before, upsert('n1', { title: 'Bread' }, 20));
  applyOp(before, del('n1', 30));
  assert.equal(JSON.stringify(before), snapshot);
});

test('a list of ops replays into the same state every time', () => {
  const ops = [upsert('n1', { title: 'a' }, 1), upsert('n2', { title: 'b' }, 2), del('n1', 3)];
  assert.deepEqual(ops.reduce(applyOp, emptyState), ops.reduce(applyOp, emptyState));
});

// ---- enqueueOp ----------------------------------------------------------

test('ops for different notes queue up in order', () => {
  let pending = [];
  pending = enqueueOp(pending, upsert('n1', { title: 'a' }, 1));
  pending = enqueueOp(pending, upsert('n2', { title: 'b' }, 2));
  assert.deepEqual(pending.map((op) => op.noteId), ['n1', 'n2']);
});

test('typing collapses into ONE pending op, keeping its place in line', () => {
  let pending = [];
  pending = enqueueOp(pending, upsert('n1', { title: 'M' }, 1));
  pending = enqueueOp(pending, upsert('n2', { title: 'other' }, 2));
  pending = enqueueOp(pending, upsert('n1', { title: 'Mi' }, 3));
  pending = enqueueOp(pending, upsert('n1', { body: 'x' }, 4));

  assert.equal(pending.length, 2, '4 keystrokes, 2 requests');
  assert.deepEqual(pending.map((op) => op.noteId), ['n1', 'n2'], 'order preserved');
  assert.deepEqual(pending[0].fields, { title: 'Mi', body: 'x' }, 'fields merged');
  assert.equal(pending[0].at, 4, 'stamped with the latest edit');
  assert.equal(pending[0].opId, 'n1@4', 'a merged op gets a NEW id');
});

test('a merged op keeps a new id so an in-flight sync cannot swallow it', () => {
  // The app sends [op@1], then the user types again while it is in the air.
  const sent = upsert('n1', { title: 'M' }, 1);
  const queue = enqueueOp([sent], upsert('n1', { title: 'Milk' }, 2));
  const stillWaiting = queue.filter((op) => op.opId !== sent.opId);
  assert.equal(stillWaiting.length, 1, 'the newer keystrokes stay queued');
  assert.equal(stillWaiting[0].fields.title, 'Milk');
});

test('a delete cancels the edits nobody will ever see', () => {
  let pending = [];
  pending = enqueueOp(pending, upsert('n1', { title: 'a' }, 1));
  pending = enqueueOp(pending, upsert('n2', { title: 'b' }, 2));
  pending = enqueueOp(pending, del('n1', 3));
  assert.deepEqual(pending.map((op) => [op.noteId, op.type]), [['n2', 'upsert'], ['n1', 'delete']]);
});

test('enqueueing never mutates the queue it was given', () => {
  const pending = [upsert('n1', { title: 'a' }, 1)];
  const next = enqueueOp(pending, upsert('n1', { title: 'ab' }, 2));
  assert.equal(pending.length, 1);
  assert.equal(pending[0].fields.title, 'a');
  assert.notEqual(next, pending);
});

// ---- mergeServerState ---------------------------------------------------

test('last write wins, in both directions', () => {
  const local = { notes: { n1: note('n1', 'mine', 20) } };
  const server = { notes: { n1: note('n1', 'theirs', 10) } };
  assert.equal(mergeServerState(local, server).notes.n1.title, 'mine');

  const older = { notes: { n1: note('n1', 'mine', 5) } };
  assert.equal(mergeServerState(older, server).notes.n1.title, 'theirs');
});

test('a tie goes to the server, so two devices never disagree', () => {
  const local = { notes: { n1: note('n1', 'mine', 10) } };
  const server = { notes: { n1: note('n1', 'theirs', 10) } };
  assert.equal(mergeServerState(local, server).notes.n1.title, 'theirs');
});

test('notes only the server has arrive', () => {
  const merged = mergeServerState(emptyState, { notes: { n9: note('n9', 'from a laptop', 1) } });
  assert.equal(merged.notes.n9.title, 'from a laptop');
});

test('a local-only note survives while it is still unsent', () => {
  const local = { notes: { draft: note('draft', 'not sent yet', 30) } };
  const pending = [upsert('draft', { title: 'not sent yet' }, 30)];
  assert.equal(mergeServerState(local, emptyState, pending).notes.draft.title, 'not sent yet');
});

test('a local-only note with nothing pending was deleted elsewhere — let it go', () => {
  const local = { notes: { n1: note('n1', 'synced ages ago', 10) } };
  assert.equal(mergeServerState(local, emptyState, []).notes.n1, undefined);
});

test('unsent edits are replayed on top and never lost to a refresh', () => {
  // The server answers with an older copy while the user is mid-sentence.
  const local = { notes: { n1: note('n1', 'Shopping list!!', 50) } };
  const server = { notes: { n1: note('n1', 'Shopping', 40) } };
  const pending = [upsert('n1', { title: 'Shopping list!!' }, 50)];
  const merged = mergeServerState(local, server, pending);
  assert.equal(merged.notes.n1.title, 'Shopping list!!');
  assert.equal(merged.notes.n1.updatedAt, 50);
});

test('a pending delete survives a server answer that still has the note', () => {
  const local = { notes: { n1: note('n1', 'gone', 60, { deleted: true }) } };
  const server = { notes: { n1: note('n1', 'gone', 40) } };
  const merged = mergeServerState(local, server, [del('n1', 60)]);
  assert.equal(merged.notes.n1.deleted, true);
});

test('merging never mutates either side', () => {
  const local = { notes: { n1: note('n1', 'mine', 20) } };
  const server = { notes: { n1: note('n1', 'theirs', 10), n2: note('n2', 'other', 5) } };
  const snapshot = JSON.stringify([local, server]);
  mergeServerState(local, server, [upsert('n1', { title: 'mine' }, 20)]);
  assert.equal(JSON.stringify([local, server]), snapshot);
});

// ---- the derived bits ---------------------------------------------------

test('tombstones stay in state and out of sight, newest first', () => {
  const state = { notes: {
    a: note('a', 'old', 1),
    b: note('b', 'new', 3),
    c: note('c', 'deleted', 2, { deleted: true }),
  } };
  assert.deepEqual(visibleNotes(state).map((n) => n.id), ['b', 'a']);
});

test('the status chip is derived from three facts', () => {
  assert.equal(syncStatus({ online: true, pendingCount: 0, syncing: false }), 'synced');
  assert.equal(syncStatus({ online: true, pendingCount: 2, syncing: false }), '2 pending');
  assert.equal(syncStatus({ online: true, pendingCount: 2, syncing: true }), 'syncing…');
  assert.equal(syncStatus({ online: false, pendingCount: 0, syncing: false }), 'offline');
  assert.equal(syncStatus({ online: false, pendingCount: 3, syncing: false }), 'offline — 3 waiting');
});
