import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runWithLimit } from './pool.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Build tasks that RECORD how many run at once — the key instrument. */
function makeInstrumentedTasks(count, durationMs) {
  let active = 0;
  let peakActive = 0;
  const tasks = Array.from({ length: count }, (_, i) => async () => {
    active++;
    peakActive = Math.max(peakActive, active);
    await sleep(durationMs);
    active--;
    return i * 10;
  });
  return { tasks, peak: () => peakActive };
}

test('never exceeds the concurrency limit', async () => {
  const { tasks, peak } = makeInstrumentedTasks(12, 10);
  await runWithLimit(tasks, 3);
  assert.ok(peak() <= 3, `peak concurrency was ${peak()}`);
  assert.ok(peak() >= 2, 'should actually run tasks in parallel');
});

test('results come back in task order, not completion order', async () => {
  // Task 0 is SLOW, task 1 is fast — completion order is 1 then 0,
  // but results must stay [0's, 1's].
  const tasks = [
    async () => { await sleep(40); return 'slow'; },
    async () => 'fast',
  ];
  assert.deepEqual(await runWithLimit(tasks, 2), ['slow', 'fast']);
});

test('every task runs exactly once', async () => {
  const ran = new Set();
  const tasks = Array.from({ length: 10 }, (_, i) => async () => {
    assert.ok(!ran.has(i), `task ${i} ran twice`);
    ran.add(i);
    return i;
  });
  const results = await runWithLimit(tasks, 4);
  assert.equal(ran.size, 10);
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('a limit larger than the task count is fine', async () => {
  const { tasks } = makeInstrumentedTasks(2, 5);
  assert.deepEqual(await runWithLimit(tasks, 100), [0, 10]);
});

test('empty task list resolves to empty results', async () => {
  assert.deepEqual(await runWithLimit([], 5), []);
});

test('a task error rejects the whole run', async () => {
  const tasks = [
    async () => 'ok',
    async () => { throw new Error('boom'); },
    async () => 'never mind',
  ];
  await assert.rejects(() => runWithLimit(tasks, 2), /boom/);
});

test('nonsense limits are rejected', async () => {
  await assert.rejects(() => runWithLimit([], 0), RangeError);
});
