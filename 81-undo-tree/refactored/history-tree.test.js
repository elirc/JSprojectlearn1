import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HistoryTree } from './history-tree.js';

test('a fresh history is just the root', () => {
  const history = new HistoryTree('');
  assert.equal(history.present, '');
  assert.equal(history.currentId, 0);
  assert.equal(history.size, 1);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('commit, undo and redo along a single line', () => {
  const history = new HistoryTree('');
  history.commit('a');
  history.commit('ab');
  assert.equal(history.present, 'ab');
  assert.equal(history.undo(), 'a');
  assert.equal(history.undo(), '');
  assert.equal(history.redo(), 'a');
  assert.equal(history.redo(), 'ab');
});

test('undo at the root and redo at a leaf are safe no-ops', () => {
  const history = new HistoryTree('start');
  assert.equal(history.undo(), 'start');
  assert.equal(history.undo(), 'start'); // mashing Ctrl+Z is not an error
  history.commit('next');
  assert.equal(history.redo(), 'next');
  assert.equal(history.redo(), 'next');
  assert.equal(history.size, 2);
});

test('THE point: committing after an undo keeps the abandoned branch', () => {
  const history = new HistoryTree('');
  history.commit('Fast, safe, cheap');
  const pickTwo = history.commit('Fast, safe, cheap — pick two');

  history.undo();
  const allThree = history.commit('Fast, safe, cheap. Yes, all three.');

  // The original deleted "pick two" here. It's still a version.
  assert.equal(history.size, 4);
  assert.deepEqual(history.children(1).sort(), [pickTwo, allThree].sort());
  assert.equal(history.node(pickTwo).state, 'Fast, safe, cheap — pick two');
  assert.equal(history.present, 'Fast, safe, cheap. Yes, all three.');
});

test('...and jumpTo walks straight back into the abandoned branch', () => {
  const history = new HistoryTree('');
  history.commit('Fast, safe, cheap');
  const pickTwo = history.commit('Fast, safe, cheap — pick two');
  history.undo();
  history.commit('Fast, safe, cheap. Yes, all three.');

  assert.equal(history.jumpTo(pickTwo), 'Fast, safe, cheap — pick two');
  assert.equal(history.currentId, pickTwo);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false); // it was a leaf, and still is
});

test('redo returns to the branch you were most recently on', () => {
  const history = new HistoryTree('');
  history.commit('a');
  const first = history.commit('a-first');
  history.undo();
  const second = history.commit('a-second'); // a fork: 'a' now has two children

  assert.equal(history.undo(), 'a');
  assert.equal(history.redo(), 'a-second'); // the newest branch...
  history.undo();
  history.jumpTo(first);                    // ...until you visit the other one
  assert.equal(history.undo(), 'a');
  assert.equal(history.redo(), 'a-first');
  assert.equal(history.children(1).length, 2);
  assert.notEqual(first, second);
});

test('redo(childId) picks a branch on purpose', () => {
  const history = new HistoryTree('');
  history.commit('a');
  const first = history.commit('a-first');
  history.undo();
  history.commit('a-second');
  history.undo();

  assert.equal(history.redo(first), 'a-first');
  assert.equal(history.currentId, first);
});

test('asking for a version that is not a child (or not there) throws', () => {
  const history = new HistoryTree('');
  const a = history.commit('a');
  history.commit('b');
  history.undo();
  assert.throws(() => history.redo(999), RangeError);
  assert.throws(() => history.redo(a), RangeError); // a is where we ARE, not a child
  assert.throws(() => history.jumpTo(42), RangeError);
  assert.throws(() => history.children(42), RangeError);
  assert.throws(() => history.node(42), RangeError);
});

test('path() is the route from the root to here', () => {
  const history = new HistoryTree('');
  history.commit('a');
  history.commit('b');
  assert.deepEqual(history.path(), [0, 1, 2]);
  history.undo();
  assert.deepEqual(history.path(), [0, 1]);
  const branch = history.commit('c');
  assert.deepEqual(history.path(), [0, 1, branch]);
});

test('a branch of a branch: three timelines all survive', () => {
  const history = new HistoryTree('');
  history.commit('a');          // 1
  const b = history.commit('b'); // 2
  history.undo();
  const c = history.commit('c'); // 3, branching off 1
  history.undo();
  const d = history.commit('d'); // 4, branching off 1 again

  assert.equal(history.size, 5);
  assert.deepEqual(history.children(1).sort((x, y) => x - y), [b, c, d].sort((x, y) => x - y));
  for (const [id, state] of [[b, 'b'], [c, 'c'], [d, 'd']]) {
    assert.equal(history.jumpTo(id), state);
  }
});

test('states are stored as handed over — snapshots, not copies', () => {
  const history = new HistoryTree({ text: '', caret: 0 });
  const editing = { text: 'hello', caret: 5 };
  history.commit(editing);
  assert.equal(history.present, editing); // same object: cheap, and fine IF states are immutable
  history.undo();
  assert.deepEqual(history.present, { text: '', caret: 0 });
  history.redo();
  assert.deepEqual(history.present, { text: 'hello', caret: 5 });
});

test('a long chain: 50 commits, 50 undos, 50 redos', () => {
  const history = new HistoryTree(0);
  for (let i = 1; i <= 50; i++) history.commit(i);
  assert.equal(history.present, 50);
  assert.equal(history.path().length, 51);

  for (let i = 0; i < 50; i++) history.undo();
  assert.equal(history.present, 0);
  assert.equal(history.canUndo, false);

  for (let i = 0; i < 50; i++) history.redo();
  assert.equal(history.present, 50);
  assert.equal(history.size, 51);
});

test('toTree gives the whole shape as plain data', () => {
  const history = new HistoryTree('root');
  history.commit('a');
  history.commit('b');
  history.undo();
  history.commit('c');

  assert.deepEqual(history.toTree(), {
    id: 0, state: 'root', current: false,
    children: [{
      id: 1, state: 'a', current: false,
      children: [
        { id: 2, state: 'b', current: false, children: [] },
        { id: 3, state: 'c', current: true, children: [] },
      ],
    }],
  });
});

test('the tree cannot be corrupted from outside', () => {
  const history = new HistoryTree('root');
  history.commit('a');
  history.children(0).push(999);        // a copy — the tree keeps its own
  history.node(0).childIds.push(999);
  assert.deepEqual(history.children(0), [1]);
});
