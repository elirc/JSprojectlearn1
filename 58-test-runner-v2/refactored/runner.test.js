// Meta-testing: node:test runs OUR runner, which runs little fake
// suites, and we assert on the returned results. Only possible
// because createRunner() has no global state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner } from './runner.js';

const statuses = (results) => results.map((r) => `${r.name}:${r.status}`);

test('sync pass and fail are reported correctly', async () => {
  const r = createRunner();
  r.it('adds', () => assert.equal(1 + 1, 2));
  r.it('breaks', () => { throw new Error('nope'); });
  const results = await r.run();
  assert.deepEqual(statuses(results), ['adds:pass', 'breaks:fail']);
  assert.equal(results[1].error.message, 'nope');
});

test('THE FALSE-GREEN FIX: an async test that rejects FAILS', async () => {
  const r = createRunner();
  r.it('async failure', async () => {
    await new Promise((res) => setTimeout(res, 5));
    throw new Error('this failure is visible now');
  });
  const [result] = await r.run();
  assert.equal(result.status, 'fail'); // the original reported "ok"
  assert.match(result.error.message, /visible/);
});

test('nested beforeEach runs outermost-first; afterEach unwinds in reverse', async () => {
  const order = [];
  const r = createRunner();
  r.beforeEach(() => order.push('outer before'));
  r.afterEach(() => order.push('outer after'));
  r.describe('db', () => {
    r.beforeEach(() => order.push('inner before'));
    r.afterEach(() => order.push('inner after'));
    r.it('works', () => order.push('TEST'));
  });
  await r.run();
  assert.deepEqual(order, [
    'outer before', 'inner before', 'TEST', 'inner after', 'outer after',
  ]);
});

test('afterEach runs EVEN WHEN the test fails (cleanup is not optional)', async () => {
  const order = [];
  const r = createRunner();
  r.afterEach(() => order.push('cleanup'));
  r.it('explodes', () => { throw new Error('boom'); });
  const [result] = await r.run();
  assert.deepEqual(order, ['cleanup']);
  assert.equal(result.error.message, 'boom'); // and the REAL error survives the hook
});

test('beforeEach gives each test FRESH state (the isolation point of hooks)', async () => {
  const r = createRunner();
  let db;
  r.beforeEach(() => { db = { rows: [] }; });
  r.it('test A dirties the db', () => { db.rows.push('junk'); });
  r.it('test B still sees it clean', () => assert.equal(db.rows.length, 0));
  const results = await r.run();
  assert.deepEqual(statuses(results), ['test A dirties the db:pass', 'test B still sees it clean:pass']);
});

test('it.only: everything else is reported skipped, not silently dropped', async () => {
  const r = createRunner();
  r.it('normal', () => {});
  r.it.only('focused', () => {});
  r.describe('group', () => r.it('also skipped', () => {}));
  const results = await r.run();
  assert.deepEqual(statuses(results), [
    'normal:skip', 'focused:pass', 'group > also skipped:skip',
  ]);
});

test('it.skip skips, and full names include the describe path', async () => {
  const r = createRunner();
  r.describe('outer', () => {
    r.describe('inner', () => {
      r.it.skip('flaky thing', () => { throw new Error('never runs'); });
    });
  });
  const results = await r.run();
  assert.deepEqual(statuses(results), ['outer > inner > flaky thing:skip']);
});

test('async hooks are awaited too', async () => {
  const order = [];
  const r = createRunner();
  r.beforeEach(async () => {
    await new Promise((res) => setTimeout(res, 5));
    order.push('slow setup done');
  });
  r.it('runs after setup', () => order.push('test'));
  await r.run();
  assert.deepEqual(order, ['slow setup done', 'test']);
});

test('two runners in one process do not interfere (no module globals)', async () => {
  const a = createRunner();
  const b = createRunner();
  a.it('in a', () => {});
  b.it('in b', () => { throw new Error('b fails'); });
  const [resultsA, resultsB] = [await a.run(), await b.run()];
  assert.deepEqual(statuses(resultsA), ['in a:pass']);
  assert.deepEqual(statuses(resultsB), ['in b:fail']);
});
