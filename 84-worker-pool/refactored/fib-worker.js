import { parentPort, threadId } from 'node:worker_threads';

// A worker is a whole separate JavaScript world: its own event loop,
// its own memory, its own globals. It shares NOTHING with the main
// thread except the messages you post. That isolation is why threads
// here can't corrupt each other's variables — there are no shared
// variables to corrupt.

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2); // deliberately the slow way
}

parentPort.on('message', ({ index, item }) => {
  const startedAt = Date.now();
  try {
    if (!Number.isInteger(item) || item < 0) {
      throw new RangeError(`fib needs a non-negative integer, got ${JSON.stringify(item)}`);
    }
    parentPort.postMessage({
      index, // ALWAYS echo the index back: it is how the pool reorders
      ok: true,
      value: { n: item, fib: fib(item), threadId, startedAt, endedAt: Date.now() },
    });
  } catch (error) {
    // A bad item is a value, not an explosion: report it and stay alive
    // for the next one.
    parentPort.postMessage({ index, ok: false, error: error.message });
  }
});
