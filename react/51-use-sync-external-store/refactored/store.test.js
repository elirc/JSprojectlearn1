// The subscription contract, tested in Node — no browser, no
// rendering, no clicking. Every rule useSyncExternalStore relies on is
// a plain assertion about a plain object.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, store } from './store.js';

/** A listener that remembers how many times it was called. */
function spy() {
  const fn = () => { fn.calls += 1; };
  fn.calls = 0;
  return fn;
}

test('getSnapshot returns the current value', () => {
  const s = createStore(0);
  assert.equal(s.getSnapshot(), 0);
  s.update(7);
  assert.equal(s.getSnapshot(), 7);
});

test('getSnapshot is reference-stable when nothing changed (rule 1)', () => {
  const s = createStore({ items: [] });
  const first = s.getSnapshot();
  const second = s.getSnapshot();
  assert.equal(first, second);            // same object, not merely equal
  assert.ok(Object.is(first, second));

  s.update({ items: ['a'] });
  assert.notEqual(s.getSnapshot(), first); // a real change IS a new reference
});

test('update notifies every subscriber', () => {
  const s = createStore(0);
  const a = spy();
  const b = spy();
  s.subscribe(a);
  s.subscribe(b);
  s.update(1);
  assert.equal(a.calls, 1);
  assert.equal(b.calls, 1);
});

test('update accepts an updater function of the current value', () => {
  const s = createStore(10);
  s.update((n) => n + 5);
  s.update((n) => n * 2);
  assert.equal(s.getSnapshot(), 30);
});

test('a no-op update notifies nobody', () => {
  const s = createStore(3);
  const listener = spy();
  s.subscribe(listener);

  assert.equal(s.update(3), false);        // same value: nothing happened
  assert.equal(s.update((n) => n), false);
  assert.equal(listener.calls, 0);

  assert.equal(s.update(4), true);         // a real change reports true
  assert.equal(listener.calls, 1);
});

test('unsubscribe stops that listener only', () => {
  const s = createStore(0);
  const stays = spy();
  const leaves = spy();
  s.subscribe(stays);
  const unsubscribe = s.subscribe(leaves);

  s.update(1);
  unsubscribe();
  s.update(2);

  assert.equal(stays.calls, 2);
  assert.equal(leaves.calls, 1);          // heard the first update only
});

test('unsubscribing twice is safe', () => {
  const s = createStore(0);
  const listener = spy();
  const unsubscribe = s.subscribe(listener);

  unsubscribe();
  assert.doesNotThrow(unsubscribe);
  assert.doesNotThrow(unsubscribe);

  s.update(1);
  assert.equal(listener.calls, 0);
  assert.equal(s.listenerCount(), 0);
});

test('listenerCount tracks subscribe and unsubscribe', () => {
  const s = createStore(0);
  assert.equal(s.listenerCount(), 0);

  const first = s.subscribe(spy());
  const second = s.subscribe(spy());
  assert.equal(s.listenerCount(), 2);

  first();
  assert.equal(s.listenerCount(), 1);
  second();
  assert.equal(s.listenerCount(), 0);     // this is what React does on unmount
});

test('the same listener subscribed twice counts once (Set semantics)', () => {
  const s = createStore(0);
  const listener = spy();
  s.subscribe(listener);
  s.subscribe(listener);
  assert.equal(s.listenerCount(), 1);
  s.update(1);
  assert.equal(listener.calls, 1);
});

test('unsubscribing during a notification does not break the round', () => {
  const s = createStore(0);
  const order = [];
  let stopSecond;

  s.subscribe(() => { order.push('first'); stopSecond(); });
  stopSecond = s.subscribe(() => order.push('second'));
  s.subscribe(() => order.push('third'));

  s.update(1);
  // `first` removed `second` mid-round, so `second` never ran — and
  // `third`, further down the copied list, ran normally.
  assert.deepEqual(order, ['first', 'third']);
  assert.equal(s.listenerCount(), 2);
});

test('subscribing during a notification waits for the next round', () => {
  const s = createStore(0);
  const latecomer = spy();
  let subscribed = false;

  s.subscribe(() => {
    if (subscribed) return;
    subscribed = true;
    s.subscribe(latecomer);
  });

  s.update(1);
  assert.equal(latecomer.calls, 0);       // not called in the round it joined
  s.update(2);
  assert.equal(latecomer.calls, 1);
});

test('stores created by the factory are independent', () => {
  const a = createStore(0);
  const b = createStore(0);
  const listener = spy();
  a.subscribe(listener);

  b.update(99);
  assert.equal(a.getSnapshot(), 0);
  assert.equal(listener.calls, 0);
});

test('the shared store export starts at 0 with no listeners', () => {
  assert.equal(store.getSnapshot(), 0);
  assert.equal(store.listenerCount(), 0);
});
