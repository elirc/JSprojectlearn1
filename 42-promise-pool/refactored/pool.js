/**
 * Run async tasks with AT MOST `limit` in flight — the middle ground
 * between "one at a time" (slow) and "all at once" (reckless).
 *
 * The worker-pool idea, in three sentences: start `limit` workers.
 * Each worker grabs the next un-started task, awaits it, stores the
 * result in the task's ORIGINAL slot, and repeats until no tasks
 * remain. `nextIndex++` can safely hand out tasks because workers
 * only interleave at `await` points — JavaScript is single-threaded,
 * so the increment itself can't be raced.
 *
 * tasks: array of zero-arg async functions (() => Promise).
 * Returns results in the same order as tasks.
 * Rejects on the first task error (Promise.all semantics).
 */
export async function runWithLimit(tasks, limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }

  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++; // claim a task
      results[index] = await tasks[index]();
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
