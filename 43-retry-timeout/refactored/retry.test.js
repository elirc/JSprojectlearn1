import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retry, withTimeout, TimeoutError } from './retry.js';

/** A fn that fails `failures` times, then succeeds. */
function makeFlaky(failures, error = new Error('503 unavailable')) {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls <= failures) throw error;
    return 'success';
  };
  return { fn, calls: () => calls };
}

const instantSleep = () => Promise.resolve(); // no real waiting in tests
const recordingSleep = (log) => (ms) => { log.push(ms); return Promise.resolve(); };

test('succeeds immediately when nothing fails', async () => {
  const { fn, calls } = makeFlaky(0);
  assert.equal(await retry(fn, { sleep: instantSleep }), 'success');
  assert.equal(calls(), 1);
});

test('retries through failures and succeeds', async () => {
  const { fn, calls } = makeFlaky(2);
  assert.equal(await retry(fn, { attempts: 3, sleep: instantSleep }), 'success');
  assert.equal(calls(), 3);
});

test('gives up after the attempt budget, rethrowing the last error', async () => {
  const { fn, calls } = makeFlaky(99);
  await assert.rejects(
    () => retry(fn, { attempts: 4, sleep: instantSleep }),
    /503/,
  );
  assert.equal(calls(), 4); // exactly 4, then stop
});

test('backoff delays double: 100, 200, 400 (injectable sleep records them)', async () => {
  const delays = [];
  const { fn } = makeFlaky(3);
  await retry(fn, { attempts: 4, baseDelayMs: 100, sleep: recordingSleep(delays) });
  assert.deepEqual(delays, [100, 200, 400]);
});

test('shouldRetry: permanent errors are NOT retried (the 404 lesson)', async () => {
  const { fn, calls } = makeFlaky(99, new Error('404 no such customer'));
  await assert.rejects(
    () => retry(fn, {
      attempts: 5,
      sleep: instantSleep,
      shouldRetry: (err) => !err.message.startsWith('404'),
    }),
    /404/,
  );
  assert.equal(calls(), 1); // one attempt, no pointless hammering
});

test('withTimeout: a fast promise wins the race', async () => {
  assert.equal(await withTimeout(Promise.resolve('quick'), 1000), 'quick');
});

test('withTimeout: a hung promise loses to the deadline', async () => {
  const hung = new Promise(() => {}); // never settles — the original waited forever
  await assert.rejects(
    () => withTimeout(hung, 20),
    (err) => err instanceof TimeoutError,
  );
});

test('withTimeout passes real failures through unchanged', async () => {
  await assert.rejects(
    () => withTimeout(Promise.reject(new Error('boom')), 1000),
    /boom/,
  );
});

test('the composition: retry a timed-out flaky call', async () => {
  let calls = 0;
  const flakySlowApi = () => {
    calls++;
    if (calls === 1) return new Promise(() => {}); // first call hangs
    return Promise.resolve('data');
  };
  const result = await retry(
    () => withTimeout(flakySlowApi(), 20),
    { attempts: 3, sleep: instantSleep },
  );
  assert.equal(result, 'data');
  assert.equal(calls, 2); // hang -> timeout -> retry -> success
});
