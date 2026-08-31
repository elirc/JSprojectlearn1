import { parentPort, threadId } from 'node:worker_threads';

// A worker used only by pool.test.js. It can, on request: burn CPU for
// a while, double a number, throw, or die outright — so the tests can
// check what the pool does in each case.

/** Real CPU work, not a sleep: a sleeping thread proves nothing. */
function burn(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

parentPort.on('message', ({ index, item }) => {
  const startedAt = Date.now();
  try {
    if (item?.crash) process.exit(3); // kills THIS thread, not the process
    if (item?.throws) throw new Error(`boom on item ${item.id}`);
    burn(item?.busyMs ?? 0);
    parentPort.postMessage({
      index,
      ok: true,
      value: { doubled: (item?.n ?? 0) * 2, threadId, startedAt, endedAt: Date.now() },
    });
  } catch (error) {
    parentPort.postMessage({ index, ok: false, error: error.message });
  }
});
