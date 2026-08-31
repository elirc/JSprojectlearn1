import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPoolSize, runPool, unwrap } from './pool.js';

// Worker files must be addressed absolutely — a worker starts in its
// own world and doesn't inherit this file's location.
const FIB = new URL('./fib-worker.js', import.meta.url);
const ECHO = new URL('./echo-worker.js', import.meta.url);

// Starting a thread costs real milliseconds, so these tests share as
// few pool runs as possible and keep the fib inputs tiny. (Speed is a
// design constraint on tests too: a slow suite stops being run.)

/**
 * How many items were genuinely being computed AT THE SAME MOMENT?
 *
 * The windows are half-open — [start, end) — and ties are resolved
 * ends-first. That matters: Date.now() ticks about every 15ms on
 * Windows, so one worker's item can *end* on the same millisecond its
 * next item *begins*, and counting both would invent an overlap that
 * never happened.
 */
function peakOverlap(values) {
  const edges = values.flatMap((v) => [[v.startedAt, 1], [v.endedAt, -1]]);
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]); // -1 before +1
  let active = 0;
  let peak = 0;
  for (const [, delta] of edges) {
    active += delta;
    peak = Math.max(peak, active);
  }
  return peak;
}

test('results keep INPUT order, and a bad item is a value not a crash', async () => {
  // Item 0 is the slowest, so it finishes last — and must still be first.
  const results = await runPool([26, 'twelve', 10, 20, -1], FIB, 2);

  assert.deepEqual(results.map((r) => r.ok), [true, false, true, true, false]);
  assert.deepEqual([results[0], results[2], results[3]].map((r) => r.value.fib), [121393, 55, 6765]);
  assert.match(results[1].error, /non-negative integer, got "twelve"/);
  assert.match(results[4].error, /non-negative integer, got -1/);
  assert.throws(() => unwrap(results), /item 1 failed/);
});

test('every item runs exactly once, and the pool size is respected', async (t) => {
  // Each worker reports the wall-clock window it was busy, so the
  // overlap below is measured INSIDE the threads, not inferred.
  const items = Array.from({ length: 10 }, (_, i) => ({ n: i, busyMs: 30 }));
  const seenActive = [];
  const values = unwrap(await runPool(items, ECHO, 2, { onActive: (n) => seenActive.push(n) }));

  assert.deepEqual(values.map((v) => v.doubled), items.map((i) => i.n * 2));
  assert.equal(new Set(values.map((v) => v.threadId)).size, 2, 'both workers took part');
  assert.equal(Math.max(...seenActive), 2, 'two items were in flight at once');
  assert.ok(peakOverlap(values) <= 2, `2 workers, but ${peakOverlap(values)} items overlapped`);

  // Whether those two in-flight items also overlap on the CLOCK depends
  // on the machine: if the second thread is slow to boot, the first can
  // drain the queue alone. Concurrency is ours to guarantee; parallelism
  // is the OS's to grant — so this one is reported, not asserted.
  t.diagnostic(`peak wall-clock overlap: ${peakOverlap(values)} of 2`);
});

test('failures cost one item each — a throw AND a hard crash', async () => {
  const items = [{ n: 1 }, { throws: true, id: 'bad' }, { crash: true }, { n: 4 }, { n: 5 }, { n: 6 }];
  const results = await runPool(items, ECHO, 2);

  assert.deepEqual(results.map((r) => r.ok), [true, false, false, true, true, true]);
  assert.match(results[1].error, /boom on item bad/);   // the worker caught it
  assert.match(results[2].error, /exited with code 3/); // the worker DIED
  for (const index of [0, 3, 4, 5]) {
    assert.equal(results[index].value.doubled, items[index].n * 2, `item ${index} still ran`);
  }
});

test('a size larger than the batch just uses fewer workers', async () => {
  const results = await runPool([{ n: 7 }], ECHO, 8);
  assert.equal(results.length, 1);
  assert.equal(results[0].value.doubled, 14);
});

test('an empty batch starts no threads at all', async () => {
  assert.deepEqual(await runPool([], FIB, 4), []);
});

test('silly pool sizes are rejected before any thread is created', () => {
  assert.throws(() => runPool([1], FIB, 0), RangeError);
  assert.throws(() => runPool([1], FIB, 2.5), RangeError);
  assert.throws(() => runPool('nope', FIB, 2), TypeError);
});

test('defaultPoolSize leaves the main thread a core and caps at 4', () => {
  const size = defaultPoolSize();
  assert.ok(Number.isInteger(size));
  assert.ok(size >= 1 && size <= 4, `got ${size}`);
});
