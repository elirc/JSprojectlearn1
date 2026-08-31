// The feed's rules, tested in Node — no browser, no scrolling, no waiting
// 500ms for a fake request. The bug this project is about (two loads for
// one page) is a rule violation, and rule violations are unit-testable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedReducer, initialFeedState, canLoadMore } from './feed.js';

/** Replay a list of actions from the initial state (project 13's helper). */
const replay = (actions) => actions.reduce(feedReducer, initialFeedState);

/** Twenty ids per page, matching the demo page: page 1 -> 1..20. */
const pageItems = (page, size = 20) =>
  Array.from({ length: size }, (_, i) => ({ id: (page - 1) * size + i + 1 }));

test('a fresh feed is idle, empty, and allowed to load', () => {
  assert.equal(initialFeedState.status, 'idle');
  assert.deepEqual(initialFeedState.items, []);
  assert.equal(initialFeedState.page, 0);
  assert.equal(canLoadMore(initialFeedState), true);
});

test('loadStarted moves idle -> loading', () => {
  const state = replay([{ type: 'loadStarted' }]);
  assert.equal(state.status, 'loading');
  assert.equal(canLoadMore(state), false);
});

test('loadStarted while already loading is a no-op — SAME reference', () => {
  const loading = replay([{ type: 'loadStarted' }]);
  const again = feedReducer(loading, { type: 'loadStarted' });
  // Same object, not merely equal: React sees "nothing happened" and the
  // component never starts a second request. This assertion IS the fix.
  assert.equal(again, loading);
});

test('pageLoaded appends items and counts the page', () => {
  const state = replay([
    { type: 'loadStarted' },
    { type: 'pageLoaded', items: pageItems(1), hasMore: true },
  ]);
  assert.equal(state.items.length, 20);
  assert.equal(state.page, 1);
  assert.equal(state.status, 'idle');
  assert.equal(canLoadMore(state), true);
});

test('the guard makes duplicate pages impossible', () => {
  // Exactly what the original does: the scroll handler fires three times
  // before any state lands, so three loads for page 1 begin, and all three
  // replies get appended. Replay that sequence through the rulebook.
  const state = replay([
    { type: 'loadStarted' },
    { type: 'loadStarted' }, // no-op
    { type: 'loadStarted' }, // no-op
    { type: 'pageLoaded', items: pageItems(1), hasMore: true },
    { type: 'pageLoaded', items: pageItems(1), hasMore: true }, // late twin: dropped
  ]);
  assert.equal(state.items.length, 20, 'twenty items, not forty or sixty');
  assert.equal(state.page, 1, 'one page loaded, not three');

  const ids = state.items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, 'every id appears exactly once');
});

test('a reply that nobody is waiting for is dropped', () => {
  const idle = replay([
    { type: 'loadStarted' },
    { type: 'pageLoaded', items: pageItems(1), hasMore: true },
  ]);
  const late = feedReducer(idle, { type: 'pageLoaded', items: pageItems(2) });
  assert.equal(late, idle); // same reference: status wasn't 'loading'
});

test('the happy path runs out of data and stops for good', () => {
  let state = initialFeedState;
  for (let page = 1; page <= 5; page++) {
    state = feedReducer(state, { type: 'loadStarted' });
    state = feedReducer(state, {
      type: 'pageLoaded',
      items: pageItems(page),
      hasMore: page < 5,
    });
  }
  assert.equal(state.items.length, 100);
  assert.equal(state.page, 5);
  assert.equal(state.status, 'done');
  assert.equal(canLoadMore(state), false);

  // "Done" is permanent: further requests change nothing at all.
  assert.equal(feedReducer(state, { type: 'loadStarted' }), state);
  assert.equal(feedReducer(state, { type: 'retried' }), state);
});

test('canLoadMore says no at every status except idle-with-more', () => {
  const base = initialFeedState;
  assert.equal(canLoadMore({ ...base, status: 'idle' }), true);
  assert.equal(canLoadMore({ ...base, status: 'loading' }), false);
  assert.equal(canLoadMore({ ...base, status: 'error' }), false);
  assert.equal(canLoadMore({ ...base, status: 'done' }), false);
  assert.equal(canLoadMore({ ...base, status: 'idle', hasMore: false }), false);
});

test('errors are recoverable, and only from an error', () => {
  const failed = replay([
    { type: 'loadStarted' },
    { type: 'loadFailed', error: 'offline' },
  ]);
  assert.equal(failed.status, 'error');
  assert.equal(failed.error, 'offline');
  assert.equal(canLoadMore(failed), false); // don't hammer a dead server

  const retried = feedReducer(failed, { type: 'retried' });
  assert.equal(retried.status, 'idle');
  assert.equal(retried.error, null);
  assert.equal(canLoadMore(retried), true);

  // 'retried' is not a second name for 'loadStarted'.
  assert.equal(feedReducer(retried, { type: 'retried' }), retried);
});

test('a failure keeps the items already on screen', () => {
  const state = replay([
    { type: 'loadStarted' },
    { type: 'pageLoaded', items: pageItems(1), hasMore: true },
    { type: 'loadStarted' },
    { type: 'loadFailed', error: 'boom' },
  ]);
  assert.equal(state.items.length, 20);
  assert.equal(state.page, 1);
});

test('reset returns the initial state itself', () => {
  const state = replay([
    { type: 'loadStarted' },
    { type: 'pageLoaded', items: pageItems(1), hasMore: false },
    { type: 'reset' },
  ]);
  assert.equal(state, initialFeedState);
});

test('the reducer never mutates its input', () => {
  const before = replay([
    { type: 'loadStarted' },
    { type: 'pageLoaded', items: pageItems(1), hasMore: true },
  ]);
  const frozen = JSON.stringify(before);
  feedReducer(before, { type: 'loadStarted' });
  feedReducer(before, { type: 'reset' });
  feedReducer(feedReducer(before, { type: 'loadStarted' }), {
    type: 'pageLoaded',
    items: pageItems(2),
    hasMore: true,
  });
  assert.equal(JSON.stringify(before), frozen);
});

test('unknown actions throw instead of silently no-oping', () => {
  assert.throws(
    () => feedReducer(initialFeedState, { type: 'scrolledABit' }),
    /Unknown action/,
  );
});
