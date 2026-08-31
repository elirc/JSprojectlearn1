// The focus trap's rules, tested in Node — no browser, no Tab key, no
// screen reader. THIS is why the decision was pulled out of the effect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOCUSABLE_SELECTOR,
  isFocusable,
  getFocusable,
  firstFocusable,
  lastFocusable,
  nextFocusIndex,
} from './focus.js';

/** A fake element: the fields the rules read, and nothing else. */
const el = (tag, extra = {}) => ({ tag, tabIndex: 0, ...extra });

/** The dialog from index.html, as a list: name input, save, cancel, close. */
const dialogElements = () => [
  el('input', { type: 'text', name: 'displayName' }),
  el('button', { name: 'save' }),
  el('button', { name: 'cancel' }),
  el('button', { name: 'close' }),
];

test('the selector covers the standard focusable tags', () => {
  for (const part of ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]']) {
    assert.ok(FOCUSABLE_SELECTOR.includes(part), `${part} missing from selector`);
  }
});

test('ordinary controls are focusable', () => {
  assert.ok(isFocusable(el('button')));
  assert.ok(isFocusable(el('input', { type: 'text' })));
  assert.ok(isFocusable(el('select')));
  assert.ok(isFocusable(el('textarea')));
  assert.ok(isFocusable(el('a', { href: '#settings' })));
  assert.ok(isFocusable(el('div', { tabIndex: 0 })), 'tabindex="0" opts a div in');
});

test('each way out of the tab order is rejected', () => {
  assert.equal(isFocusable(el('button', { disabled: true })), false, 'disabled');
  assert.equal(isFocusable(el('button', { hidden: true })), false, 'hidden attribute');
  assert.equal(isFocusable(el('button', { tabIndex: -1 })), false, 'tabindex="-1"');
  assert.equal(isFocusable(el('input', { type: 'hidden' })), false, 'input type=hidden');
  assert.equal(isFocusable(el('a')), false, 'anchor with no href is just text');
  assert.equal(isFocusable(el('button', { inHiddenSubtree: true })), false, 'display:none ancestor');
  assert.equal(isFocusable(null), false, 'nothing is not focusable');
});

test('getFocusable keeps DOM order and drops the rest', () => {
  const list = [
    el('button', { name: 'first' }),
    el('button', { name: 'skipped', disabled: true }),
    el('input', { name: 'second', type: 'text' }),
    el('input', { name: 'invisible', type: 'hidden' }),
    el('a', { name: 'third', href: '#help' }),
  ];
  assert.deepEqual(
    getFocusable(list).map((e) => e.name),
    ['first', 'second', 'third'],
  );
});

test('a dialog with nothing focusable yields an empty list', () => {
  assert.deepEqual(getFocusable([]), []);
  assert.deepEqual(getFocusable(undefined), [], 'a missing container is not a crash');
  assert.deepEqual(
    getFocusable([el('button', { disabled: true }), el('button', { disabled: true })]),
    [],
  );
});

test('first and last pick the ends of the real tab order, not of the raw list', () => {
  const list = [
    el('button', { name: 'ignored', disabled: true }),
    el('input', { name: 'name', type: 'text' }),
    el('button', { name: 'save' }),
    el('button', { name: 'alsoIgnored', tabIndex: -1 }),
  ];
  assert.equal(firstFocusable(list).name, 'name');
  assert.equal(lastFocusable(list).name, 'save');
  assert.equal(firstFocusable([]), null);
  assert.equal(lastFocusable([]), null);
});

test('Tab walks forward and wraps last -> first', () => {
  const count = getFocusable(dialogElements()).length; // 4
  assert.equal(nextFocusIndex(0, count), 1);
  assert.equal(nextFocusIndex(1, count), 2);
  assert.equal(nextFocusIndex(2, count), 3);
  assert.equal(nextFocusIndex(3, count), 0, 'the trap closes here');
});

test('Shift+Tab walks backward and wraps first -> last', () => {
  const count = 4;
  assert.equal(nextFocusIndex(3, count, { shift: true }), 2);
  assert.equal(nextFocusIndex(1, count, { shift: true }), 0);
  assert.equal(nextFocusIndex(0, count, { shift: true }), 3, 'and closes in this direction too');
});

test('one focusable element means Tab stays put', () => {
  assert.equal(nextFocusIndex(0, 1), 0);
  assert.equal(nextFocusIndex(0, 1, { shift: true }), 0);
});

test('focus outside the trap (-1) is pulled back in from the right side', () => {
  assert.equal(nextFocusIndex(-1, 4), 0, 'Tab enters at the top');
  assert.equal(nextFocusIndex(-1, 4, { shift: true }), 3, 'Shift+Tab enters at the bottom');
});

test('an empty dialog reports "nothing to focus" instead of an index', () => {
  assert.equal(nextFocusIndex(-1, 0), -1);
  assert.equal(nextFocusIndex(0, 0, { shift: true }), -1);
});

test('the result is never out of range, from any starting point', () => {
  const count = 4;
  for (const start of [-5, -1, 0, 1, 2, 3, 4, 99]) {
    for (const shift of [false, true]) {
      const next = nextFocusIndex(start, count, { shift });
      assert.ok(next >= 0 && next < count, `start=${start} shift=${shift} -> ${next}`);
    }
  }
});

test('the options argument is optional', () => {
  assert.equal(nextFocusIndex(0, 3), 1, 'no options object at all');
  assert.equal(nextFocusIndex(0, 3, {}), 1, 'an empty one means Tab, not Shift+Tab');
});
