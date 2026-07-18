import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLatestOnly, STALE } from './latest.js';

/** An async fn whose resolution WE control, per call. */
function controllable() {
  const pending = [];
  const fn = (label) =>
    new Promise((resolve, reject) => pending.push({ label, resolve, reject }));
  return { fn, pending };
}

test('a single call just works', async () => {
  const latest = makeLatestOnly(async (q) => `results for ${q}`);
  assert.equal(await latest('ban'), 'results for ban');
});

test('THE race: older call resolving LAST comes back STALE, not wrong data', async () => {
  const { fn, pending } = controllable();
  const latest = makeLatestOnly(fn);

  const first = latest('ba');   // slow query, fired first
  const second = latest('ban'); // fast query, fired second

  pending[1].resolve('results for ban'); // newer resolves FIRST
  pending[0].resolve('results for ba');  // older limps in last

  assert.equal(await second, 'results for ban'); // winner delivers
  assert.equal(await first, STALE);              // loser is neutralized
});

test('three overlapping calls: only the newest delivers', async () => {
  const { fn, pending } = controllable();
  const latest = makeLatestOnly(fn);
  const calls = [latest('b'), latest('ba'), latest('ban')];

  // resolve in scrambled order
  pending[2].resolve('ban!');
  pending[0].resolve('b!');
  pending[1].resolve('ba!');

  assert.deepEqual(await Promise.all(calls), [STALE, STALE, 'ban!']);
});

test('an error from an ABANDONED call is swallowed as STALE', async () => {
  const { fn, pending } = controllable();
  const latest = makeLatestOnly(fn);
  const old = latest('ba');
  const fresh = latest('ban');

  pending[0].reject(new Error('timeout')); // stale request failing = noise
  pending[1].resolve('ok');

  assert.equal(await old, STALE);
  assert.equal(await fresh, 'ok');
});

test('an error from the NEWEST call still throws (real failures surface)', async () => {
  const { fn, pending } = controllable();
  const latest = makeLatestOnly(fn);
  const call = latest('ban');
  pending[0].reject(new Error('server down'));
  await assert.rejects(() => call, /server down/);
});

test('sequential (non-overlapping) calls all deliver', async () => {
  const latest = makeLatestOnly(async (q) => q.toUpperCase());
  assert.equal(await latest('a'), 'A');
  assert.equal(await latest('b'), 'B');
});
