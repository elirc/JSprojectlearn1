import os from 'node:os';
import { defaultPoolSize, runPool, unwrap } from './pool.js';

// The same six jobs as original.js, twice: once on the main thread,
// once through the pool — with the same progress ticker watching.

const INPUTS = [33, 35, 34, 36, 33, 35];
const FIB_WORKER = new URL('./fib-worker.js', import.meta.url);

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

function startTicker() {
  const ticks = [];
  const started = Date.now();
  const id = setInterval(() => {
    ticks.push(Date.now() - started);
    process.stdout.write('.');
  }, 100);
  return {
    ticks,
    stop() {
      clearInterval(id);
      return Date.now() - started;
    },
  };
}

console.log(`${os.availableParallelism()} cores available, pool size ${defaultPoolSize()}\n`);

// ---- 1. the original's way: everything on the main thread ----------
process.stdout.write('main thread ');
const blocking = startTicker();
const blockingResults = INPUTS.map((n) => fib(n));
await new Promise((resolve) => setImmediate(resolve)); // let queued ticks fire
const blockingMs = blocking.stop();
console.log(`\n  ${blockingMs}ms, ticker fired ${blocking.ticks.length} times ` +
  `(expected ~${Math.floor(blockingMs / 100)})`);

// ---- 2. the pool: the main thread only hands out work --------------
process.stdout.write('worker pool ');
const pooled = startTicker();
const results = await runPool(INPUTS, FIB_WORKER, defaultPoolSize());
const pooledMs = pooled.stop();
console.log(`\n  ${pooledMs}ms, ticker fired ${pooled.ticks.length} times ` +
  `(expected ~${Math.floor(pooledMs / 100)})`);

// ---- 3. what actually happened ------------------------------------
const values = unwrap(results);
console.log(`\nsame answers: ${JSON.stringify(values.map((v) => v.fib)) === JSON.stringify(blockingResults)}`);

// The workers report when they started and stopped, so we can separate
// "computing" from "starting up" — and starting a thread is NOT free.
const computeMs = Math.max(...values.map((v) => v.endedAt)) - Math.min(...values.map((v) => v.startedAt));
const cpuMs = values.reduce((sum, v) => sum + (v.endedAt - v.startedAt), 0);

console.log(`\n  main thread : ${blockingMs}ms`);
console.log(`  worker pool : ${pooledMs}ms  = ${pooledMs - computeMs}ms starting ` +
  `${defaultPoolSize()} threads + ${computeMs}ms computing`);
console.log(`  speedup on the computing part: ${(blockingMs / computeMs).toFixed(2)}x`);
console.log(`  CPU time spent: ${cpuMs}ms in ${computeMs}ms of clock time ` +
  `(${(cpuMs / computeMs).toFixed(2)} cores' worth)`);
console.log(`  (that last number is the honest one: it says how many cores this`);
console.log(`   machine actually gave us. On a busy laptop it will be near 1.)`);

console.log('\nper item:');
for (const value of values) {
  console.log(`  fib(${value.n}) = ${String(value.fib).padStart(8)}  ` +
    `thread ${value.threadId}  ${String(value.endedAt - value.startedAt).padStart(5)}ms`);
}

// Two lessons, and the second one is the one people skip:
//
// 1. The ticker didn't get faster — it got a CHANCE TO RUN. In the
//    first run the main thread was computing; in the second it was
//    idle, waiting for messages, which is what an event loop is for.
//
// 2. Threads cost real time to start (look at the number above). On
//    six quick jobs the pool can easily be SLOWER end-to-end; it wins
//    on long batches, or when what you care about is the process
//    staying responsive. Measure before you parallelise — "it uses all
//    my cores" is not the same claim as "it finished sooner".
