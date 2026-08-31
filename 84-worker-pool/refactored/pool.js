import { Worker } from 'node:worker_threads';
import os from 'node:os';

/**
 * A worker pool: run CPU-heavy work on several threads at once, with a
 * fixed number of threads, and get the answers back IN INPUT ORDER.
 *
 * Why threads and not async? `await` interleaves WAITING (a download, a
 * disk read). CPU work isn't waiting — it's using the one thread the
 * event loop runs on — so no amount of async can make two computations
 * overlap. Another core needs another thread. (Project 42 is the async
 * version of this same pool; the shape is identical, the reason is not.)
 *
 * Why a POOL and not one thread per item? Threads cost memory and
 * startup time, and more threads than cores just means the OS shuffles
 * them around. `size` workers pull from a shared queue until it's empty.
 *
 * Errors are values, not explosions: every result is `{ ok: true, value }`
 * or `{ ok: false, error }` (project 30's Result style), so one bad item
 * can never lose the other ninety-nine.
 */

/** Leave a core for the main thread, and don't get greedy. */
export function defaultPoolSize() {
  return Math.max(1, Math.min(4, os.availableParallelism() - 1));
}

export function runPool(items, workerFile, size = defaultPoolSize(), options = {}) {
  const { onActive } = options;
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`size must be a positive integer, got ${size}`);
  }

  return new Promise((resolve, reject) => {
    const results = new Array(items.length);
    if (items.length === 0) {
      resolve(results);
      return;
    }

    let nextIndex = 0;  // the next item nobody has claimed
    let completed = 0;
    let active = 0;     // items currently being chewed on
    let finished = false;
    const workers = new Set();

    const settle = (finish, argument) => {
      if (finished) return;
      finished = true;
      for (const worker of workers) worker.terminate(); // threads don't stop themselves
      finish(argument);
    };

    const finishItem = (index, result) => {
      results[index] = result; // the item's ORIGINAL slot: order preserved
      completed++;
      active--;
      onActive?.(active);
      if (completed === items.length) settle(resolve, results);
    };

    for (let i = 0; i < Math.min(size, items.length); i++) {
      const worker = new Worker(workerFile);
      workers.add(worker);
      let current = -1; // which item this worker is holding, for crash cleanup

      const dispatch = () => {
        current = -1;
        if (nextIndex >= items.length) return; // queue empty: idle until terminated
        current = nextIndex++;
        active++;
        onActive?.(active);
        worker.postMessage({ index: current, item: items[current] });
      };

      worker.on('message', (message) => {
        if (finished) return;
        current = -1;
        finishItem(
          message.index,
          message.ok ? { ok: true, value: message.value } : { ok: false, error: message.error },
        );
        if (!finished) dispatch(); // this worker immediately takes the next item
      });

      // A worker can also die outright — a syntax error, an OOM, a call
      // to process.exit. That must cost us ONE item, not the batch.
      const die = (reason) => {
        if (finished) return;
        workers.delete(worker);
        worker.terminate();
        if (current !== -1) {
          const index = current;
          current = -1;
          finishItem(index, { ok: false, error: reason });
        }
        if (!finished && workers.size === 0 && completed < items.length) {
          settle(reject, new Error(
            `the pool lost every worker with ${items.length - completed} items unfinished`,
          ));
        }
      };

      worker.on('error', (error) => die(error.message));
      worker.on('exit', (code) => { if (code !== 0) die(`worker exited with code ${code}`); });

      dispatch();
    }
  });
}

/** Convenience: the values, throwing on the first failure (Promise.all semantics). */
export function unwrap(results) {
  return results.map((result, index) => {
    if (!result.ok) throw new Error(`item ${index} failed: ${result.error}`);
    return result.value;
  });
}
