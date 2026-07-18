import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, optimisticAdd, optimisticToggle, applyEvent, applyEvents,
} from './sync.js';

const titles = (s) => s.todos.map((t) => t.title);

test('optimistic add shows instantly, marked pending', () => {
  const s = optimisticAdd(initialState(), { tag: 'a1', title: 'call the bank' });
  assert.deepEqual(titles(s), ['call the bank']);
  assert.equal(s.todos[0].pending, true);
});

test('our own event replaces the placeholder — no duplicate, no flicker', () => {
  let s = optimisticAdd(initialState(), { tag: 'a1', title: 'call the bank' });
  s = applyEvent(s, {
    version: 1, type: 'upsert', originTag: 'a1',
    todo: { id: 7, title: 'call the bank', done: false },
  }, new Set(['a1']));
  assert.deepEqual(s.todos, [{ id: 7, title: 'call the bank', done: false }]);
  assert.equal(s.version, 1);
});

test("someone ELSE's event upserts by id", () => {
  let s = applyEvent(initialState(), {
    version: 1, type: 'upsert', originTag: 'bob-1',
    todo: { id: 1, title: 'buy milk', done: false },
  }, new Set());
  s = applyEvent(s, {
    version: 2, type: 'upsert', originTag: 'bob-2',
    todo: { id: 1, title: 'buy milk', done: true },
  }, new Set());
  assert.deepEqual(s.todos, [{ id: 1, title: 'buy milk', done: true }]);
});

test('stale and duplicate events are ignored (replays are harmless)', () => {
  const e1 = { version: 1, type: 'upsert', originTag: 'x', todo: { id: 1, title: 'a', done: false } };
  let s = applyEvent(initialState(), e1, new Set());
  const again = applyEvent(applyEvent(s, e1, new Set()), e1, new Set());
  assert.deepEqual(again, s);
});

test("THE ORIGINAL'S LOST UPDATE, FIXED: alice's add and bob's toggle both survive", () => {
  // server order: alice's add is version 2, bob's toggle version 3
  const events = [
    { version: 1, type: 'upsert', originTag: 'seed', todo: { id: 1, title: 'buy milk', done: false } },
    { version: 2, type: 'upsert', originTag: 'alice-1', todo: { id: 2, title: 'alice: call the bank', done: false } },
    { version: 3, type: 'upsert', originTag: 'bob-1', todo: { id: 1, title: 'buy milk', done: true } },
  ];

  // alice saw her own add optimistically first; bob toggled optimistically first
  let alice = applyEvent(initialState(), events[0], new Set());
  alice = optimisticAdd(alice, { tag: 'alice-1', title: 'alice: call the bank' });
  alice = applyEvents(alice, events.slice(1), new Set(['alice-1']));

  let bob = applyEvent(initialState(), events[0], new Set());
  bob = optimisticToggle(bob, 1);
  bob = applyEvents(bob, events.slice(1), new Set(['bob-1']));

  // CONVERGENCE: same events, same order -> identical state, nothing lost
  assert.deepEqual(alice.todos, bob.todos);
  assert.deepEqual(titles(alice).sort(), ['alice: call the bank', 'buy milk']);
  assert.equal(alice.todos.find((t) => t.id === 1).done, true);
});

test('true conflict: two clients toggle the same todo — last write wins, both agree', () => {
  const seed = { version: 1, type: 'upsert', originTag: 's', todo: { id: 1, title: 'x', done: false } };
  // both toggles hit the server; server orders them: done:true then done:false
  const events = [
    { version: 2, type: 'upsert', originTag: 'a', todo: { id: 1, title: 'x', done: true } },
    { version: 3, type: 'upsert', originTag: 'b', todo: { id: 1, title: 'x', done: false } },
  ];
  const a = applyEvents(applyEvent(initialState(), seed, new Set()), events, new Set(['a']));
  const b = applyEvents(applyEvent(initialState(), seed, new Set()), events, new Set(['b']));
  assert.deepEqual(a.todos, b.todos); // they disagree with ONE user's intent,
  assert.equal(a.todos[0].done, false); // but never with each other
});

test('delete events remove; catch-up replay after reconnect works from any version', () => {
  const log = [
    { version: 1, type: 'upsert', originTag: 'x', todo: { id: 1, title: 'a', done: false } },
    { version: 2, type: 'upsert', originTag: 'x', todo: { id: 2, title: 'b', done: false } },
    { version: 3, type: 'deleted', originTag: 'x', todoId: 1 },
  ];
  // a client that disconnected after version 1 replays 2..3:
  let s = applyEvent(initialState(), log[0], new Set());
  s = applyEvents(s, log.filter((e) => e.version > s.version), new Set());
  assert.deepEqual(titles(s), ['b']);
  assert.equal(s.version, 3);
});
