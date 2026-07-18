import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, undoable } from './history-reducer.js';

// A trivial inner reducer to wrap: a counter.
const counter = (state, action) =>
  action.type === 'add' ? state + action.amount : state;

const reducer = undoable(counter);
const replay = (actions) => actions.reduce(reducer, createHistory(0));

test('normal actions pass through to the inner reducer', () => {
  const h = replay([{ type: 'add', amount: 5 }, { type: 'add', amount: 2 }]);
  assert.equal(h.present, 7);
  assert.deepEqual(h.past, [0, 5]);
});

test('undo and redo walk the timeline', () => {
  const h = replay([
    { type: 'add', amount: 5 },
    { type: 'add', amount: 2 },
    { type: 'undo' },
  ]);
  assert.equal(h.present, 5);
  assert.deepEqual(h.future, [7]);

  const redone = reducer(h, { type: 'redo' });
  assert.equal(redone.present, 7);
});

test('js#39\'s classic: a new action after undo kills the old future', () => {
  const h = replay([
    { type: 'add', amount: 5 },
    { type: 'undo' },
    { type: 'add', amount: 100 },
  ]);
  assert.equal(h.present, 100);
  assert.deepEqual(h.future, []); // the "5" future is gone
});

test('undo at the beginning and redo at the end are safe no-ops', () => {
  const start = createHistory(0);
  assert.equal(reducer(start, { type: 'undo' }), start);
  assert.equal(reducer(start, { type: 'redo' }), start);
});

test('no-op inner actions do not pollute history', () => {
  const h = replay([{ type: 'irrelevant' }]);
  assert.deepEqual(h.past, []); // nothing changed, nothing recorded
});
