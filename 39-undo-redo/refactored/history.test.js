import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History } from './history.js';

test('push moves the present forward', () => {
  const history = new History('');
  history.push('Hello');
  history.push('Hello world');
  assert.equal(history.present, 'Hello world');
});

test('undo and redo walk the timeline', () => {
  const history = new History('');
  history.push('Hello');
  history.push('Hello world');
  assert.equal(history.undo(), 'Hello');
  assert.equal(history.undo(), '');
  assert.equal(history.redo(), 'Hello');
  assert.equal(history.redo(), 'Hello world');
});

test('THE original bug: a new action after undo kills the old future', () => {
  const history = new History('');
  history.push('Hello');
  history.push('Hello world');
  history.undo();               // back to "Hello"
  history.push('Hello!!!');     // new timeline chosen

  assert.equal(history.undo(), 'Hello');
  assert.equal(history.redo(), 'Hello!!!');
  assert.equal(history.canRedo, false);        // "Hello world" is GONE
  assert.equal(history.redo(), 'Hello!!!');    // redo past the end: no-op
});

test('undo at the beginning and redo at the end are safe no-ops', () => {
  const history = new History('start');
  assert.equal(history.undo(), 'start');
  assert.equal(history.redo(), 'start');
});

test('canUndo/canRedo drive UI button states', () => {
  const history = new History('');
  assert.equal(history.canUndo, false);
  history.push('a');
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
  history.undo();
  assert.equal(history.canRedo, true);
});

test('snapshots can be objects (the editor state, the whole cart...)', () => {
  const history = new History({ text: '', cursor: 0 });
  history.push({ text: 'Hi', cursor: 2 });
  history.undo();
  assert.deepEqual(history.present, { text: '', cursor: 0 });
});
