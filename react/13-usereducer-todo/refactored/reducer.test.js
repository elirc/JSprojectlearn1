// The app's rules, tested in Node — no browser, no rendering, no
// clicking. THIS is why the reducer pattern matters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todosReducer, initialState } from './reducer.js';

/** Replay a list of actions from the initial state. */
const replay = (actions) => actions.reduce(todosReducer, initialState);

test('adding todos assigns ids and trims text', () => {
  const state = replay([{ type: 'added', text: '  buy milk  ' }]);
  assert.deepEqual(state.todos, [{ id: 1, text: 'buy milk', done: false }]);
  assert.equal(state.nextId, 2);
});

test('empty or whitespace text is rejected (state unchanged)', () => {
  const state = replay([{ type: 'added', text: '   ' }]);
  assert.equal(state, initialState); // same reference: nothing happened
});

test('toggling flips exactly one todo', () => {
  const state = replay([
    { type: 'added', text: 'a' },
    { type: 'added', text: 'b' },
    { type: 'toggled', id: 1 },
  ]);
  assert.deepEqual(state.todos.map((t) => t.done), [true, false]);
});

test('deleting removes by id and never reuses old ids', () => {
  const state = replay([
    { type: 'added', text: 'a' },
    { type: 'deleted', id: 1 },
    { type: 'added', text: 'b' },
  ]);
  assert.deepEqual(state.todos, [{ id: 2, text: 'b', done: false }]);
});

test('the toggle-all business rule, both directions', () => {
  const mixed = replay([
    { type: 'added', text: 'a' },
    { type: 'added', text: 'b' },
    { type: 'toggled', id: 1 },
  ]);
  const allDone = todosReducer(mixed, { type: 'toggledAll' });
  assert.ok(allDone.todos.every((t) => t.done), 'mixed -> all done');

  const allUndone = todosReducer(allDone, { type: 'toggledAll' });
  assert.ok(allUndone.todos.every((t) => !t.done), 'all done -> none done');
});

test('clear done keeps only unfinished todos', () => {
  const state = replay([
    { type: 'added', text: 'a' },
    { type: 'added', text: 'b' },
    { type: 'toggled', id: 1 },
    { type: 'clearedDone' },
  ]);
  assert.deepEqual(state.todos.map((t) => t.text), ['b']);
});

test('the reducer never mutates its input', () => {
  const before = replay([{ type: 'added', text: 'a' }]);
  const frozen = JSON.stringify(before);
  todosReducer(before, { type: 'toggled', id: 1 });
  todosReducer(before, { type: 'clearedDone' });
  assert.equal(JSON.stringify(before), frozen);
});

test('unknown actions throw instead of silently no-oping', () => {
  assert.throws(() => todosReducer(initialState, { type: 'exploded' }), /Unknown action/);
});
