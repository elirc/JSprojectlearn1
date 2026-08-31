// The menu's keyboard behaviour, tested in Node — no browser, no
// rendering, no pressing of actual keys. THIS is why "which item is
// active?" belongs in a pure function.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, MENU_KEYS } from './nav.js';

const COUNT = 4; // a four-item menu, used by most tests below

/** Press a sequence of keys, folding the active index through them. */
const press = (start, keys, count = COUNT, options = {}) =>
  keys.reduce((i, key) => nextIndex(i, key, count, options), start);

test('ArrowDown and ArrowUp move one step', () => {
  assert.equal(nextIndex(0, 'ArrowDown', COUNT), 1);
  assert.equal(nextIndex(2, 'ArrowDown', COUNT), 3);
  assert.equal(nextIndex(2, 'ArrowUp', COUNT), 1);
  assert.equal(nextIndex(1, 'ArrowUp', COUNT), 0);
});

test('movement wraps around at both ends', () => {
  assert.equal(nextIndex(COUNT - 1, 'ArrowDown', COUNT), 0, 'last -> first');
  assert.equal(nextIndex(0, 'ArrowUp', COUNT), COUNT - 1, 'first -> last');
});

test('Home and End jump to the ends', () => {
  assert.equal(nextIndex(2, 'Home', COUNT), 0);
  assert.equal(nextIndex(1, 'End', COUNT), COUNT - 1);
  assert.equal(nextIndex(-1, 'Home', COUNT), 0, 'works from nothing-active too');
});

test('-1 means nothing is active yet: down opens at the top, up at the bottom', () => {
  assert.equal(nextIndex(-1, 'ArrowDown', COUNT), 0);
  assert.equal(nextIndex(-1, 'ArrowUp', COUNT), COUNT - 1);
});

test('unknown keys are a no-op: same value in, same value out', () => {
  for (const key of ['a', 'Tab', 'Enter', 'Escape', ' ', 'PageDown', 'F5']) {
    assert.equal(nextIndex(2, key, COUNT), 2, `${key} must not move the cursor`);
  }
  assert.equal(nextIndex(-1, 'Tab', COUNT), -1);
});

test('MENU_KEYS lists exactly the keys that move the cursor', () => {
  for (const key of MENU_KEYS) {
    assert.notEqual(nextIndex(1, key, 3), 1, `${key} should be handled`);
  }
  assert.equal(MENU_KEYS.includes('Tab'), false, 'Tab must stay the browser\'s');
  assert.equal(MENU_KEYS.includes('Escape'), false, 'Escape closes, it does not move');
});

test('an empty menu has no active item', () => {
  for (const key of [...MENU_KEYS, 'x']) {
    assert.equal(nextIndex(-1, key, 0), -1);
    assert.equal(nextIndex(2, key, 0), -1, 'a stale index is not preserved');
  }
});

test('disabled items are skipped in the direction of travel', () => {
  const opts = { disabled: [1, 2] }; // items 0 and 3 are the only live ones
  assert.equal(nextIndex(0, 'ArrowDown', COUNT, opts), 3, 'down jumps the gap');
  assert.equal(nextIndex(3, 'ArrowUp', COUNT, opts), 0, 'up jumps it back');
});

test('a disabled item at either end is skipped by Home, End and the wrap', () => {
  const opts = { disabled: [0, COUNT - 1] };
  assert.equal(nextIndex(2, 'Home', COUNT, opts), 1, 'Home = first ENABLED');
  assert.equal(nextIndex(1, 'End', COUNT, opts), 2, 'End = last ENABLED');
  assert.equal(nextIndex(-1, 'ArrowDown', COUNT, opts), 1);
  assert.equal(nextIndex(-1, 'ArrowUp', COUNT, opts), 2);
});

test('wrapping onto a disabled item keeps going', () => {
  assert.equal(nextIndex(3, 'ArrowDown', COUNT, { disabled: [0] }), 1,
    'past the end, over the disabled first item, onto item 1');
  assert.equal(nextIndex(0, 'ArrowUp', COUNT, { disabled: [3] }), 2,
    'before the start, over the disabled last item, onto item 2');
});

test('the disabled option accepts a predicate as well as a list', () => {
  const evensOff = { disabled: (i) => i % 2 === 0 };
  assert.equal(nextIndex(1, 'ArrowDown', COUNT, evensOff), 3);
  assert.equal(nextIndex(1, 'Home', COUNT, evensOff), 1);
});

test('an all-disabled menu terminates and changes nothing', () => {
  const opts = { disabled: [0, 1, 2, 3] };
  for (const key of MENU_KEYS) {
    assert.equal(nextIndex(2, key, COUNT, opts), 2, `${key} must not hang or move`);
    assert.equal(nextIndex(-1, key, COUNT, opts), -1);
  }
});

test('loop: false turns the ends into walls', () => {
  const opts = { loop: false };
  assert.equal(nextIndex(COUNT - 1, 'ArrowDown', COUNT, opts), COUNT - 1, 'clamped at the bottom');
  assert.equal(nextIndex(0, 'ArrowUp', COUNT, opts), 0, 'clamped at the top');
  assert.equal(nextIndex(1, 'ArrowDown', COUNT, opts), 2, 'the middle still moves');
  assert.equal(nextIndex(-1, 'ArrowDown', COUNT, opts), 0, 'still opens at the top');
  assert.equal(nextIndex(-1, 'ArrowUp', COUNT, opts), COUNT - 1, 'still opens at the bottom');
});

test('loop: false clamps against a disabled item at the end', () => {
  const opts = { loop: false, disabled: [COUNT - 1] };
  assert.equal(nextIndex(COUNT - 2, 'ArrowDown', COUNT, opts), COUNT - 2,
    'nowhere legal below, so stay put');
});

test('a run of keys behaves like a fold over the rulebook', () => {
  const opts = { disabled: [2] };
  assert.equal(press(-1, ['ArrowDown', 'ArrowDown', 'ArrowDown'], COUNT, opts), 3);
  assert.equal(press(0, ['End', 'ArrowDown', 'Home'], COUNT, opts), 0);
});

test('nextIndex never mutates its options', () => {
  const opts = { disabled: [1], loop: true };
  const frozen = JSON.stringify(opts);
  nextIndex(0, 'ArrowDown', COUNT, opts);
  nextIndex(0, 'End', COUNT, opts);
  assert.equal(JSON.stringify(opts), frozen);
});
