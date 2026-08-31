# 84 — Worker pool

**Lesson: `async` interleaves *waiting*, not *computing*. CPU work needs another
thread — and a pool of them, so the queue is bounded and the results stay ordered.**

## Run it

```
node 84-worker-pool/original.js          (watch the ticker die)
node 84-worker-pool/refactored/cli.js    (watch it survive)
node --test 84-worker-pool/refactored/pool.test.js
```

## What's wrong with the original?

Six CPU-heavy jobs and a progress ticker that fires every 100ms. Run it and read
the last two lines:

```
ticks expected during the work: ~30
ticks that actually arrived:     0
```

The ticker wasn't slow, it was **frozen**. `setInterval` doesn't promise "every
100ms"; it promises "queued every 100ms, run when the call stack is empty" — and
`INPUTS.map(fib)` never empties the call stack. For those three seconds *everything*
in the process is frozen: timers, promise callbacks, incoming HTTP requests. In a
server that isn't "slow", it's **down**, and your load balancer will say so.

Two follow-on points the file makes in comments:

1. **`async`/`await` cannot fix this.** Awaiting yields while you *wait* for
   something (a download, a disk read). This code isn't waiting — it's computing.
   There is nothing to yield to.
2. **Eight cores, one of them busy.** The work is embarrassingly parallel (six
   independent inputs) and the machine is 7/8 idle throughout.

## What changed in the refactor

- **`runPool(items, workerFile, size)`** starts `size` worker threads that pull from
  one shared queue until it's empty. Not one thread per item: threads cost memory and
  startup time, and more threads than cores just makes the OS shuffle them.
- **Results land in their *original* slot** (`results[index] = ...`), so completion
  order never leaks into the answer — the same trick as project 42's promise pool,
  which is this code's async twin. Read them side by side: identical shape, different
  reason for existing.
- **Errors are values** (project 30's Result style). Each result is `{ ok: true,
  value }` or `{ ok: false, error }`, so one bad input can't lose the other ninety-
  nine. The pool survives *two* kinds of failure: a worker catching a throw, and a
  worker dying outright — a hard crash costs exactly one item, and the remaining
  threads finish the batch.
- **`defaultPoolSize()` = `availableParallelism() - 1`, capped at 4** — leave the main
  thread a core, and don't get greedy on a 64-core box.
- **The tests measure concurrency *inside* the workers**: each worker reports the
  wall-clock window it was busy, and the test computes the peak overlap. That's real
  parallelism observed, not bookkeeping trusted.
- **The CLI runs both versions back to back**, and reports something most tutorials
  hide: how long *starting the threads* took. On six quick jobs a pool can be slower
  end to end. It wins on long batches — and it always wins on responsiveness.

## Key takeaway

Before reaching for threads, ask which kind of slow you have. Waiting on I/O? Async
already handles it, and threads add nothing. Burning CPU? No amount of `await` will
help, because the event loop is one thread and it's the one you're using. Then reach
for a *pool* rather than a thread per item, keep the results indexed by input
position, and turn failures into values so one bad item can't take the batch with it.
