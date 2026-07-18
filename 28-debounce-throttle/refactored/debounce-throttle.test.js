// These tests use Node's MOCK TIMERS: time doesn't pass for real —
// we advance a fake clock with tick(). Tests of timing code run in
// milliseconds and never flake. (Same injectable-dependency idea as
// project 06's rng, provided by the test runner itself.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debounce, throttle } from './debounce-throttle.js';

test('debounce: only the last of a burst fires, after the quiet period', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const search = debounce((q) => calls.push(q), 300);

  search('c');
  search('ca');
  search('cat');

  t.mock.timers.tick(299);
  assert.deepEqual(calls, []); // still waiting for quiet
  t.mock.timers.tick(1);
  assert.deepEqual(calls, ['cat']); // last args win, exactly once
});

test('debounce: a new call during the wait restarts the clock', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const save = debounce((v) => calls.push(v), 100);

  save('a');
  t.mock.timers.tick(90);
  save('b'); // 90ms in — deadline pushed back
  t.mock.timers.tick(90);
  assert.deepEqual(calls, []); // 180ms total, but never 100ms of QUIET
  t.mock.timers.tick(10);
  assert.deepEqual(calls, ['b']);
});

test('two debounced functions are independent (the original bug)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const log = [];
  const searchDebounced = debounce((q) => log.push(`search:${q}`), 300);
  const checkUser = debounce((u) => log.push(`user:${u}`), 300);

  searchDebounced('cat');
  checkUser('kim'); // must NOT cancel the pending search

  t.mock.timers.tick(300);
  assert.deepEqual(log.sort(), ['search:cat', 'user:kim']); // both fired
});

test('throttle: first call immediate, spam during cooldown dropped', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const calls = [];
  const track = throttle((x) => calls.push(x), 100);

  track(1); // fires
  track(2); // dropped
  t.mock.timers.tick(50);
  track(3); // still cooling down — dropped
  t.mock.timers.tick(50);
  track(4); // 100ms since last fire — fires
  assert.deepEqual(calls, [1, 4]);
});
