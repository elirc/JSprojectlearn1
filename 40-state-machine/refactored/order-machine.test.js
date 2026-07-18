import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSITIONS, INITIAL_STATE, transition, allowedEvents } from './order-machine.js';

test('the happy path: pending -> paid -> shipped -> delivered', () => {
  let state = INITIAL_STATE;
  state = transition(state, 'pay');
  state = transition(state, 'ship');
  state = transition(state, 'deliver');
  assert.equal(state, 'delivered');
});

test('cancelling before shipping works from pending and paid', () => {
  assert.equal(transition('pending', 'cancel'), 'cancelled');
  assert.equal(transition('paid', 'cancel'), 'cancelled');
});

test('THE original bug: shipping a cancelled order is impossible', () => {
  assert.throws(() => transition('cancelled', 'ship'), /Cannot "ship".*cancelled/);
});

test('delivering an unpaid order is impossible', () => {
  assert.throws(() => transition('pending', 'deliver'), /Cannot "deliver"/);
});

test('cancelling after shipping is impossible', () => {
  assert.throws(() => transition('shipped', 'cancel'), /allowed: deliver/);
});

test('terminal states allow nothing', () => {
  assert.deepEqual(allowedEvents('delivered'), []);
  assert.deepEqual(allowedEvents('cancelled'), []);
});

test('allowedEvents tells a UI which buttons to show', () => {
  assert.deepEqual(allowedEvents('paid'), ['ship', 'cancel']);
});

test('EXHAUSTIVE: every transition in the table lands on a defined state', () => {
  // A structural test of the rulebook itself: no typo'd target state
  // can hide in the table. Add a state or event and this still holds.
  for (const [state, events] of Object.entries(TRANSITIONS)) {
    for (const [event, target] of Object.entries(events)) {
      assert.ok(
        target in TRANSITIONS,
        `${state} --${event}--> ${target}, but "${target}" is not a defined state`,
      );
    }
  }
});
