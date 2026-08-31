// Six CPU-heavy jobs, and a progress ticker that is supposed to prove
// the app is still alive while they run. Watch what actually happens.

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2); // deliberately the slow way
}

const INPUTS = [33, 35, 34, 36, 33, 35];

const started = Date.now();
const ticks = [];
const ticker = setInterval(() => {
  ticks.push(Date.now() - started);
  process.stdout.write('.');
}, 100);

// Proof that the ticker works when nothing is in its way:
await new Promise((resolve) => setTimeout(resolve, 350));
console.log(`\nticker before the work: ${ticks.length} ticks in 350ms`);

// ---- the blocking part ---------------------------------------------
const workStarted = Date.now();
const ticksBefore = ticks.length;
const results = INPUTS.map(fib);   // <-- the event loop is now a hostage
const workMs = Date.now() - workStarted;

// Let the event loop breathe, so any queued ticks can finally fire.
await new Promise((resolve) => setImmediate(resolve));
clearInterval(ticker);

console.log(`results: ${results.join(', ')}`);
console.log(`CPU work took ${workMs}ms`);
console.log(`ticks expected during the work: ~${Math.floor(workMs / 100)}`);
console.log(`ticks that actually arrived:     ${ticks.length - ticksBefore}`);

// The ticker was not slow. It was FROZEN. `setInterval` doesn't
// promise "every 100ms"; it promises "queued every 100ms, run when
// the call stack is empty" — and `INPUTS.map(fib)` never empties it.
//
// Everything else in the process is frozen too: incoming HTTP
// requests, timers, promise callbacks, Ctrl-C handling. In a server
// this is not "slow", it is DOWN.
//
// And the machine? Eight cores, one of them busy. `async`/`await`
// cannot help: they interleave WAITING, and this code isn't waiting
// on anything — it's computing. To use another core you need another
// thread (project 84's refactor) or another process.
console.log(`cores available: ${(await import('node:os')).availableParallelism()}, cores used: 1`);
