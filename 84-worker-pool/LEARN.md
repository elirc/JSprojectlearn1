# 📘 Learning Guide: Worker Pool

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that computes six slow things — `fib(32)`, `fib(34)`, `fib(33)`, `fib(35)`, `fib(32)`, `fib(34)` — while a progress ticker prints a dot every 100ms to show the app is alive.

The original does the work the obvious way and the ticker prints **nothing at all** for three seconds. Not slowly. Nothing.

```
main thread
  3256ms, ticker fired 0 times (expected ~32)
worker pool ..............
  3537ms, ticker fired 14 times (expected ~35)
```

The refactor moves the computing onto **worker threads** — separate JavaScript worlds running on other CPU cores — and keeps a *pool* of them fed from one queue. The ticker keeps ticking, and the answers come back in the order you asked for them.

## 2. Concepts you need first

### One thread, one call stack, one event loop

JavaScript in Node runs your code on **one thread**. A thread executes one thing at a time, tracking where it is on a **call stack**. When your code finishes and the stack empties, the **event loop** looks for the next queued callback — a timer that's due, a finished file read, a resolved promise — and runs it, and so on.

Everything follows from that: **while your function is running, nothing else can run.** No timer, no request handler, no promise callback. They queue up and wait for you to finish.

### `setInterval` doesn't promise time, it promises a queue slot

```js
setInterval(() => console.log('.'), 100);
```

This does *not* say "print every 100ms". It says "every 100ms, put this callback in the queue." If the stack is busy, the callbacks pile up — and Node collapses missed intervals rather than firing a burst. That's why the original reports **0 ticks** where ~30 were due.

### Blocking, and why it's worse than slow

**Blocking** means occupying the thread so nothing else can run. A slow program finishes late. A blocking program takes everything else down with it: in a server, every user's request waits behind your `fib(35)`. The word for that isn't "slow", it's "outage".

### Concurrency vs parallelism (the distinction the whole project rests on)

- **Concurrency** — several jobs *in progress*, taking turns on one worker. Like one cook alternating between two pans.
- **Parallelism** — several jobs *actually running at the same instant*, on different cores. Two cooks, two pans.

`async`/`await` gives you **concurrency**, and only for **waiting**. When you `await` a download, your function steps aside so other code can run *while the network takes its time*. But `fib(35)` isn't waiting for anything — it's computing — so there's nothing to step aside for. This is the sentence to remember: **async is for waiting, threads are for computing.**

### Worker threads

`node:worker_threads` gives you real OS threads, each running its own JavaScript world: its own event loop, its own memory, its own globals. They share **nothing** except messages you post:

```js
import { Worker } from 'node:worker_threads';
const worker = new Worker(new URL('./fib-worker.js', import.meta.url));
worker.postMessage({ index: 0, item: 35 });      // main -> worker
worker.on('message', (msg) => console.log(msg)); // worker -> main
```

and on the worker's side:

```js
import { parentPort } from 'node:worker_threads';
parentPort.on('message', ({ index, item }) => {
  parentPort.postMessage({ index, ok: true, value: fib(item) });
});
```

Because nothing is shared, the data-race bugs that make threads terrifying in other languages mostly can't happen here — there are no shared variables to corrupt. What you post is **structured-cloned** (copied), not shared.

### Why a pool, and why bounded

You could start one thread per item. Don't: each thread costs memory and takes real milliseconds to start, and more threads than cores just means the OS shuffles them around. A **pool** starts a fixed number of workers that pull from a shared queue until it's empty — the same bounded-concurrency idea as project 42, for a different reason.

`os.availableParallelism()` reports how many cores you can actually use. `defaultPoolSize()` here is that minus one (leave the main thread a core), capped at 4.

### Results in input order

Workers finish in whatever order they finish. If you `push` results as they arrive, the order is scrambled. Storing each result in its **original index** keeps the output aligned with the input:

```js
results[index] = { ok: true, value }; // not results.push(...)
```

### Result-style errors (project 30, again)

Every result is `{ ok: true, value }` or `{ ok: false, error }`. One bad item then costs one item, not the batch. `unwrap(results)` is there for when you *do* want the first failure to throw.

## 3. Walking through the original code

```js
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
```

Deliberately the slow way — an exponential number of calls, which is a compact way to buy several seconds of pure CPU.

```js
const ticker = setInterval(() => { ticks.push(...); process.stdout.write('.'); }, 100);
await new Promise((resolve) => setTimeout(resolve, 350));
console.log(`ticker before the work: ${ticks.length} ticks in 350ms`);
```

The ticker is proven to work first — 2 or 3 dots appear — so that when it goes silent you know the ticker isn't broken.

```js
const results = INPUTS.map(fib);   // <-- the event loop is now a hostage
```

One synchronous line, three seconds of stack. Afterwards the file lets the loop breathe (`setImmediate`) so any queued ticks can finally fire, then reports how many arrived: zero.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the process is frozen, not busy.** The ticker is a stand-in for everything else in a real program: health checks, request handlers, timeouts, a spinner in a UI. All of it stops. A user watching a frozen progress bar assumes the app crashed, and a load balancer *agrees with them*.

**Flaw 2: the instinctive fixes don't work.** Making `fib` `async` changes nothing — `async` only affects when a function *returns*, not whether it hogs the thread while running. `Promise.all(INPUTS.map(async (n) => fib(n)))` is still six blocking calls on one thread; it just looks parallel. `setTimeout(..., 0)` between items lets *queued* callbacks run, but each item still blocks for its whole duration.

**Flaw 3: seven idle cores.** The six jobs are completely independent — the definition of *embarrassingly parallel* — and the program uses one core, because one thread can only ever use one core.

**Flaw 4: no failure story.** If one input were garbage, the whole `map` would throw and take the five good answers with it.

## 5. Try it yourself first!

1. **Vague hint:** the problem is that computing happens on the thread that also runs everything else. Where else could it happen?
2. **Warmer:** read the docs for `node:worker_threads`. Start *one* worker that computes `fib(35)` and posts the answer back, and keep the ticker running. Watch the dots continue.
3. **Warmer still:** now do six. One worker per item works — but time it, and count the threads on a 4-core laptop. What would happen with six *thousand* items?
4. **Almost the answer:** start N workers. Keep a `nextIndex` counter; when a worker sends a result back, hand it the next un-started item. Stop when every item has come home.
5. **The detail everyone gets wrong:** store each result at the index it *came from*, not by pushing. Test it with a slow first item and a fast second.
6. **Design question:** if one item throws inside a worker, what should the batch do? Write your answer down before reading `pool.js`, then compare — and notice there are *two* failure modes, not one (a caught throw, and a worker that dies).

## 6. Understanding the refactored solution

**`runPool` in one paragraph.** It creates `Math.min(size, items.length)` workers. Each has a `dispatch()` that claims the next item (`nextIndex++`) and posts it. When a result comes back, the pool files it in `results[index]`, decrements the in-flight count, and immediately calls `dispatch()` again for that worker. When `completed === items.length`, it terminates every worker and resolves.

**Claiming work is safe without a lock:**

```js
current = nextIndex++;
```

In a language with real shared memory, two threads doing this could grab the same item. Here they can't: `nextIndex` lives only on the main thread, and the main thread runs one callback at a time. The event loop *is* the lock.

**Order comes from the index round trip.** The pool posts `{ index, item }` and the worker echoes `index` back untouched. That's why results are ordered without any sorting.

**Two failure modes, handled separately:**

```js
worker.on('error', (error) => die(error.message));
worker.on('exit', (code) => { if (code !== 0) die(`worker exited with code ${code}`); });
```

A *caught* error inside the worker comes back as a normal message with `ok: false`. A worker that dies — a crash, an OOM, a `process.exit` — never sends anything, so `die()` looks at the item that worker was holding (`current`), fails just that one, drops the worker, and lets the survivors finish. Only if *every* worker dies with items outstanding does the whole promise reject. The test at "failures cost one item each" checks both paths in one batch.

**`settle` terminates the workers.** Threads don't stop themselves; a forgotten worker keeps the process alive forever. The `finished` flag makes settling idempotent, which matters because terminating a worker itself fires an `exit` event.

**The tests measure, rather than trust.** Each worker records `startedAt` / `endedAt` and its `threadId`, and `peakOverlap` computes how many items were genuinely in flight at the same instant. Asserting `<= 2` proves the limit; asserting `>= 2` proves it's actually parallel. Both matter: a "pool" that silently ran everything sequentially would pass the first check alone.

**The CLI is honest about the cost.** It separates thread startup from computing and prints both, plus "cores' worth" (`CPU time / clock time`). On six quick jobs, startup can eat the whole gain. That's not a flaw in the pool; it's the actual trade-off, and knowing it is the difference between engineering and cargo-culting.

## 7. Words you learned (glossary)

- **Thread** — an independent line of execution with its own call stack.
- **Call stack** — the record of which functions are currently running.
- **Event loop** — the loop that runs queued callbacks once the stack empties.
- **Blocking** — occupying the thread so nothing else can run.
- **Concurrency** — several jobs in progress, taking turns.
- **Parallelism** — several jobs running at the same instant, on different cores.
- **CPU-bound / I/O-bound** — limited by computing / limited by waiting.
- **Worker thread** — a separate JavaScript world you talk to by messages.
- **`postMessage` / `parentPort`** — send to a worker / the worker's channel home.
- **Structured clone** — the copy made when data crosses a thread boundary.
- **Worker pool** — a fixed set of workers pulling from a shared queue.
- **Queue / dispatch** — the pending items / handing one to a worker.
- **In flight** — started but not finished.
- **`availableParallelism()`** — how many cores this process may really use.
- **Embarrassingly parallel** — work that splits with no coordination needed.
- **Race condition** — a bug from two threads touching one thing at once.
- **Speedup** — sequential time ÷ parallel time.

## 8. Experiments to try on the plane (no internet needed)

1. **Prove `async` doesn't help.** Copy `original.js` and make `fib` `async`, then `await Promise.all(INPUTS.map((n) => fib(n)))`. Expected: exactly the same freeze — awaiting a function that never yields is just a slower way to call it.
2. **Change the pool size.** Run the CLI with `defaultPoolSize()` replaced by `1`, then `2`, then `8`. Expected: `1` behaves like the original (but the ticker still ticks — the main thread is free either way), gains flatten out once the size passes your core count, and the "cores' worth" line tells you where the ceiling is on *your* machine.
3. **Watch a crash cost one item.** In `echo-worker.js`, add `if (item?.n === 3) process.exit(9);` and run a batch of ten through the pool. Expected: item 3 comes back `{ ok: false, error: 'worker exited with code 9' }` and the other nine are fine.
4. **Break the ordering on purpose.** In `pool.js`, replace `results[index] = result` with `results.push(result)`. Expected: the "INPUT order" test fails, because the fastest item now arrives first — the exact bug that makes parallel code so hard to debug when it isn't tested.
5. **Feel the startup cost.** Time `runPool([1], FIB_WORKER, 1)` — one trivial item. Expected: hundreds of milliseconds, nearly all of it starting the thread. That number is your break-even point: a batch worth less CPU time than this is a batch you should compute on the main thread.
6. **Find the real core count.** `node -e "console.log(require('os').availableParallelism())"`, then run the CLI and compare with the "cores' worth" number. Expected: less than you hoped — other programs are using the machine too, which is exactly why the pool leaves a core free.
