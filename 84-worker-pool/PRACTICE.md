# 🏋️ Practice: Worker Pool

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in `refactored/pool.js` (and its worker files); add your checks to `refactored/pool.test.js` and run `node --test 84-worker-pool/refactored/pool.test.js`. Starting threads costs real milliseconds, so share pool runs between assertions and keep the fib inputs tiny.

## Exercises

### ⭐ 1. unwrapPartial — the other half of unwrap (warm-up)

`unwrap` throws on the first failure. Often you want the opposite: everything that worked, plus a report of what didn't. Write `unwrapPartial(results)` returning `{ values, failures, okCount, failCount }`, where each failure is `{ index, error }`. No threads needed — this is plain array work over Results.

What it practices: Results are just data, so "what do I do about failures?" becomes a *caller's* decision instead of the pool's. Two callers can want two different things from the same batch.

Hint: one `forEach` with the index, pushing into two arrays.

Check (in node): `[{ok:true,value:2},{ok:false,error:'boom'},{ok:true,value:6}]` gives `values: [2, 6]`, `failures: [{ index: 1, error: 'boom' }]`, and `unwrapPartial([])` gives empty arrays with zero counts.

### ⭐⭐ 2. onProgress — a progress bar that tells the truth (core)

Add an `onProgress` option called after each item completes with `{ done, total, index, ok }`. Use it in `cli.js` to print `[####------] 4/10` on one line (`process.stdout.write('\r...')`).

What it practices: the pool already knows everything a progress bar needs; exposing it as a callback beats returning a giant object nobody reads. Note *where* the call belongs — in `finishItem`, the one place an item can complete.

Hint: `done` must count completions, not dispatches, or your bar will hit 100% while work is still running.

Check (in node): six items through a pool of two produce exactly six calls, `done` counts `1,2,3,4,5,6` with no repeats, every call carries `total: 6`, and the six `index` values are 0–5 in some order.

### ⭐⭐ 3. A per-item timeout (core)

Add a `timeoutMs` option: if a worker doesn't answer within that time, kill it, record `{ ok: false, error: 'timed out after Nms' }` for that item, and start a **replacement** worker so the pool keeps its width. Two traps wait for you: (a) a thread takes hundreds of milliseconds to boot, and that time must not count against the first item's clock — so have the worker post `{ ready: true }` when it loads, and arm the timer only then; (b) a wedged worker cannot be interrupted, only terminated.

What it practices: timeouts are how you stop trusting a component you don't control. It's also a lesson in what "hung" means — you can't ask a stuck thread to stop, you can only kill it.

Hint: add `if (item?.hangs) return;` to `echo-worker.js` so a test can create a worker that never answers. Ignore any message without an `index` — that's the ready signal, not a result.

Check (in node): with six items where the **first two hang**, a pool of two, and `timeoutMs: 400`, both hanging items come back timed out and the other four still complete — which can only happen if the pool replaced both dead workers.

### ⭐⭐⭐ 4. Chunking — stop paying the postage (challenge)

Every item currently costs one round trip. When items are cheap, the messaging dominates. Write `chunk(items, chunkSize)` and `runPoolChunked(items, workerFile, size, chunkSize)`: send *arrays* of inputs, have a `chunk-fib-worker.js` return an array of Results, then flatten back to one result per original item, still in order. A dead chunk must fail only its own items.

What it practices: batching is the standard fix for per-message overhead — the same idea as bulk database inserts. It also forces you to keep two levels of ordering straight.

Hint: `flatMap` is exactly the right tool for the flattening, and when a whole chunk fails you must expand that one error back into `chunk.length` failed items so the output length still matches the input.

Check (in node): `chunk([1,2,3,4,5], 2)` is `[[1,2],[3,4],[5]]`; `runPoolChunked([10, 20, 5, 'x', 12], CHUNK_FIB, 2, 2)` gives `ok` flags `[true,true,true,false,true]` with fibs `55, 6765, 5, 144` and the bad item's own error message.

### ⭐⭐⭐ 5. A pool you can keep (challenge)

The CLI showed that starting threads costs real time — and `runPool` throws its workers away after every batch. Write `createPool(workerFile, size)` returning `{ size, run(items), close() }` that starts its workers **once** and reuses them across batches. `run` must reject if the pool is closed or already busy, and must remove its message listeners when the batch ends.

What it practices: object lifetime. A pool that outlives a batch is faster and more dangerous — it can leak listeners, and it keeps the process alive until `close()`.

Hint: `worker.on('message', listener)` in `run`, `worker.off('message', listener)` when the batch finishes. Without the `off`, batch two's results also reach batch one's handler and the counts go haywire.

Check (in node): two batches of six through a `createPool(ECHO, 2)` give the right doubled values, and the `threadId` set is **identical** across both batches — proof the same two threads did both. `run([])` returns `[]`, and calling `run` after `close()` rejects with "pool is closed".

## Solutions

### 1. unwrapPartial

```js
export function unwrapPartial(results) {
  const values = [];
  const failures = [];
  results.forEach((result, index) => {
    if (result.ok) values.push(result.value);
    else failures.push({ index, error: result.error });
  });
  return { values, failures, okCount: values.length, failCount: failures.length };
}
```

WHY: keeping the `index` on each failure is what makes this useful — "item 37 failed" lets you retry exactly that input, while a bare list of error strings only lets you shrug. This is the whole argument for Result values over exceptions in a batch: an exception unwinds the stack and destroys the context of the ninety-nine items that were fine, whereas a value sits quietly in a slot until someone decides what it means. Verified by running: two values, two indexed failures, and zeroes for an empty batch.

### 2. onProgress

```js
// in runPool's finishItem — the one place an item can complete:
onProgress?.({ done: completed, total: items.length, index, ok: result.ok });

// in cli.js:
const bar = ({ done, total }) => {
  const filled = Math.round((done / total) * 20);
  process.stdout.write(`\r[${'#'.repeat(filled)}${'-'.repeat(20 - filled)}] ${done}/${total}`);
};
await runPool(INPUTS, FIB_WORKER, defaultPoolSize(), { onProgress: bar });
```

WHY: putting the call in `finishItem` rather than in the message handler means it fires for *every* way an item can end — a normal result, a caught throw, a dead worker, a timeout — so the bar can't stall at 9/10 because one item failed in an unusual way. That's the payoff of having funnelled all four endings through one function. `?.` keeps the option optional with no `if`. And notice the progress bar is only possible because the main thread is free: in `original.js` it would have printed nothing at all until the work was over. Verified by running: exactly six calls, `done` 1→6 with no repeats, all six indices present.

### 3. A per-item timeout

```js
// echo-worker.js gains one line at the top of the handler...
if (item?.hangs) return; // never answers
// ...and one at the very end of the file:
parentPort.postMessage({ ready: true });

// in pool.js's spawn():
let ready = timeoutMs === undefined; // no clock, no need to wait

const armTimer = () => {
  if (timeoutMs === undefined || current === -1 || !ready) return;
  const index = current;
  timer = setTimeout(() => {
    current = -1;
    workers.delete(worker);
    worker.terminate();                       // a wedged thread can only be killed
    if (!finished) finishItem(index, { ok: false, error: `timed out after ${timeoutMs}ms` });
    if (!finished && nextIndex < items.length) spawn(); // keep the pool wide
  }, timeoutMs);
};

worker.on('message', (message) => {
  if (finished) return;
  if (message.index === undefined) { ready = true; armTimer(); return; } // the worker booted
  clearTimer();
  ...
});
```

WHY: the `ready` handshake is the part you'd never guess and would spend an evening debugging. Arm the timer at dispatch and every *first* item fails on a cold pool, because booting a thread here can take longer than a reasonable timeout — you'd have built a pool that reliably kills its own workers. Measuring from "the thread is up" makes the timeout mean what it says: how long this *item* may take. The second subtlety is `spawn()` on expiry: without it, each timeout permanently narrows the pool, and enough timeouts leave you with zero workers and a batch that never finishes. Also note `worker.terminate()` rather than any polite request — a thread spinning in a loop never checks its messages, which is precisely why it's stuck. Verified by running: two hanging items out of six, a pool of two, `timeoutMs: 400` — both hangs reported, all four remaining items completed by the replacement workers.

### 4. Chunking

```js
export function chunk(items, chunkSize) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError(`chunkSize must be a positive integer, got ${chunkSize}`);
  }
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) chunks.push(items.slice(i, i + chunkSize));
  return chunks;
}

export async function runPoolChunked(items, workerFile, size, chunkSize, options) {
  const chunks = chunk(items, chunkSize);
  const chunkResults = await runPool(chunks, workerFile, size, options);
  return chunkResults.flatMap((result, i) =>
    result.ok ? result.value : chunks[i].map(() => ({ ok: false, error: result.error })));
}
```

```js
// chunk-fib-worker.js — one message in, an array of Results out
parentPort.on('message', ({ index, item: inputs }) => {
  const value = inputs.map((n) => {
    try { ... return { ok: true, value: { n, fib: fib(n) } }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  parentPort.postMessage({ index, ok: true, value });
});
```

WHY: the pool didn't change at all — chunking is a *caller-side* decision, because `runPool` never cared what an "item" is. That's the reward for making it generic over `items` and a worker file rather than hard-coding fib. The delicate line is the failure branch: when a whole chunk dies (a crashed worker, a timeout) you must expand that single error into one failure per input, or the returned array is shorter than the input and every index afterwards is silently wrong — a much nastier bug than the crash that caused it. Chunk size is a real trade-off: bigger chunks amortise the message cost but coarsen the failure granularity and can leave one worker holding the last fat chunk while the others idle. Verified by running: correct order across chunk boundaries, and the bad input failing alone inside its chunk.

### 5. A pool you can keep

```js
export function createPool(workerFile, size = defaultPoolSize()) {
  const workers = Array.from({ length: size }, () => new Worker(workerFile));
  let closed = false;
  let busy = false;

  return {
    get size() { return workers.length; },

    run(items) {
      if (closed) return Promise.reject(new Error('pool is closed'));
      if (busy) return Promise.reject(new Error('pool is already running a batch'));
      busy = true;
      return new Promise((resolve) => {
        const results = new Array(items.length);
        if (items.length === 0) { busy = false; resolve(results); return; }
        let nextIndex = 0;
        let completed = 0;
        const listeners = new Map();
        const cleanup = () => {
          for (const [worker, listener] of listeners) worker.off('message', listener);
          busy = false;
        };
        for (const worker of workers.slice(0, Math.min(size, items.length))) {
          const dispatch = () => {
            if (nextIndex >= items.length) return;
            const index = nextIndex++;
            worker.postMessage({ index, item: items[index] });
          };
          const listener = (message) => {
            results[message.index] = message.ok
              ? { ok: true, value: message.value }
              : { ok: false, error: message.error };
            completed++;
            if (completed === items.length) { cleanup(); resolve(results); return; }
            dispatch();
          };
          listeners.set(worker, listener);
          worker.on('message', listener);
          dispatch();
        }
      });
    },

    close() {
      closed = true;
      return Promise.all(workers.map((worker) => worker.terminate()));
    },
  };
}
```

WHY: `worker.off(...)` in `cleanup` is the line that matters. Listeners accumulate silently — batch three's worker would still be feeding batch one's `completed` counter — and this class of leak is why long-lived event emitters are a classic source of "it gets slower the longer it runs". The `busy` flag is an honest admission of a limitation: this simple version can't interleave two batches, so it says so loudly instead of corrupting both. `close()` is not optional politeness either: a live worker keeps the whole process alive, so a forgotten pool is a program that never exits. Note what's deliberately missing compared to `runPool` — crash and timeout handling — which is the exercise's real lesson: a warm pool needs a *worker replacement* policy, because a dead worker is now dead for every future batch too. Verified by running: identical `threadId` sets across two batches, `run([])` → `[]`, and `run` after `close()` rejecting.
