import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveItem } from './move.js';

const LIST = ['a', 'b', 'c', 'd', 'e'];

test('moving an item down lands it exactly at the target index', () => {
  assert.deepEqual(moveItem(LIST, 0, 2), ['b', 'c', 'a', 'd', 'e']);
  assert.equal(moveItem(LIST, 0, 2)[2], 'a'); // the contract, spelled out
});

test('moving an item up lands it exactly at the target index', () => {
  assert.deepEqual(moveItem(LIST, 4, 1), ['a', 'e', 'b', 'c', 'd']);
  assert.equal(moveItem(LIST, 4, 1)[1], 'e');
});

test('first to last and last to first', () => {
  assert.deepEqual(moveItem(LIST, 0, 4), ['b', 'c', 'd', 'e', 'a']);
  assert.deepEqual(moveItem(LIST, 4, 0), ['e', 'a', 'b', 'c', 'd']);
});

test('neighbours swap', () => {
  assert.deepEqual(moveItem(LIST, 1, 2), ['a', 'c', 'b', 'd', 'e']);
  assert.deepEqual(moveItem(LIST, 2, 1), ['a', 'c', 'b', 'd', 'e']);
});

test('from === to is a no-op — but still a fresh array', () => {
  const result = moveItem(LIST, 2, 2);
  assert.deepEqual(result, LIST);
  assert.notEqual(result, LIST); // a copy, so callers never share memory by accident
});

test('indexes past the ends are clamped, not errors', () => {
  assert.deepEqual(moveItem(LIST, 0, 99), ['b', 'c', 'd', 'e', 'a']); // "drop below the last row"
  assert.deepEqual(moveItem(LIST, 3, -7), ['d', 'a', 'b', 'c', 'e']); // "drop above the first row"
  assert.deepEqual(moveItem(LIST, 99, 0), ['e', 'a', 'b', 'c', 'd']); // dragging the last row
});

test('the input array is never touched', () => {
  const original = ['a', 'b', 'c'];
  const copy = [...original];
  moveItem(original, 0, 2);
  assert.deepEqual(original, copy); // this is what makes undo one variable
});

test('tiny lists behave', () => {
  assert.deepEqual(moveItem([], 0, 1), []);
  assert.deepEqual(moveItem(['only'], 0, 3), ['only']);
  assert.deepEqual(moveItem(['a', 'b'], 1, 0), ['b', 'a']);
});

test('nonsense indexes throw instead of guessing', () => {
  assert.throws(() => moveItem(LIST, 1.5, 0), TypeError);
  assert.throws(() => moveItem(LIST, '2', 0), TypeError); // a string from dataTransfer
  assert.throws(() => moveItem(LIST, 0, NaN), TypeError); // indexOf on a missing node
  assert.throws(() => moveItem(LIST, undefined, 0), TypeError);
});

test('every move keeps the same items, just reordered', () => {
  for (let from = 0; from < LIST.length; from++) {
    for (let to = 0; to < LIST.length; to++) {
      const result = moveItem(LIST, from, to);
      assert.equal(result.length, LIST.length);
      assert.deepEqual([...result].sort(), [...LIST].sort());
      assert.equal(result[to], LIST[from], `item should end up at ${to}`);
    }
  }
});

test('a move can always be undone by moving it back', () => {
  for (let from = 0; from < LIST.length; from++) {
    for (let to = 0; to < LIST.length; to++) {
      assert.deepEqual(moveItem(moveItem(LIST, from, to), to, from), LIST);
    }
  }
});

test('it works on objects, not just strings — ids stay attached', () => {
  const items = [{ id: 1, text: 'wake' }, { id: 2, text: 'coffee' }, { id: 3, text: 'code' }];
  const moved = moveItem(items, 2, 0);
  assert.deepEqual(moved.map((item) => item.id), [3, 1, 2]);
  assert.equal(moved[0], items[2]); // the same object, not a clone
});
