# 📘 Learning Guide: Promise Pool

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that fetches 20 user profiles from a (pretend) server, where each request takes about 100 milliseconds. Run the original and it prints two timings:

```
sequential (20 x ~100ms, one at a time): ~2000ms
unbounded (all 20 at once): ~100ms, but reckless
```

One at a time is 20× slower than needed. All at once is fast but would hammer a real server into banning you. What we actually want is a knob: "run at most 5 at a time." The refactor builds that knob — called a **promise pool** or **worker pool** — in about 15 lines.

## 2. Concepts you need first

### Asynchronous code

Most code runs top to bottom instantly. But some operations *take time* — a network request, a timer. **Asynchronous** (async) code starts such an operation and lets the program keep going instead of freezing while it waits.

### setTimeout

`setTimeout(fn, ms)` says "run this function after `ms` milliseconds":

```js
console.log("start");
setTimeout(() => console.log("later"), 100);
console.log("end");
// prints: start, end, later  — "later" comes AFTER "end"!
```

Note the order: JavaScript doesn't stop and wait; it schedules the callback and moves on.

### Promises

A **Promise** is an object representing "a value that will arrive later." It starts *pending*, then either **resolves** (succeeds with a value) or **rejects** (fails with an error):

```js
const p = new Promise((resolve) => {
  setTimeout(() => resolve(42), 100);
});
p.then((value) => console.log(value)); // prints (after 100ms): 42
```

The function you pass to `new Promise` gets a `resolve` function; calling it delivers the value.

### async / await

`async` before a function means it returns a Promise. Inside it, `await` pauses *that function* (not the whole program!) until a Promise settles, then hands you its value:

```js
async function demo() {
  const value = await new Promise((r) => setTimeout(() => r("hi"), 50));
  console.log(value); // prints: hi (after 50ms)
}
demo();
```

`await` reads like "wait here for the result" — but only this function waits; everything else keeps running.

### Promise.all

`Promise.all(arrayOfPromises)` waits for *all* of them and gives you an array of results in the same order. Crucially, all of those promises are already running **at the same time**:

```js
const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
console.log(await Promise.all([p1, p2])); // prints: [ 1, 2 ]
```

If any promise rejects, `Promise.all` rejects immediately with that error.

### Concurrency in a single-threaded language

JavaScript runs on **one thread** — it executes exactly one line at a time, never two at once. So how can 20 requests be "in flight" together? Because *waiting isn't executing*. While a request is out on the network, JavaScript is free to start others. **Concurrency** here means "many operations mid-flight," not "many lines running simultaneously." The key rule: an async function can only be interrupted **at an `await`** — between two awaits, its code runs uninterruptible, start to finish. (In multi-threaded languages, two threads incrementing one counter can collide — a **race condition**, prevented with **locks**. In JS, plain synchronous code can't be raced, so `nextIndex++` needs no lock.)

### Rate limits and why "all at once" is dangerous

Real servers defend themselves. Send 2,000 simultaneous requests and you'll hit **rate limits** (the server replies with error **429 Too Many Requests**), dropped connections, or your own machine running out of network **sockets** (the OS-level channels connections use). Flooding a server — even accidentally — is a **DoS** (denial of service).

### Array.from with a length

`Array.from({ length: n }, fn)` builds an n-element array by calling `fn(_, i)` for each index:

```js
console.log(Array.from({ length: 3 }, (_, i) => i * 2)); // prints: [ 0, 2, 4 ]
```

## 3. Walking through the original code

The fake API:

```js
function fetchProfile(id) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({ id: id, name: "user" + id });
    }, 100);
  });
}
```

Each "request" is a Promise that resolves after ~100ms with a little profile object. No real network needed — perfect for a plane.

**Approach 1 — sequential:**

```js
async function sequential() {
  var results = [];
  for (var i = 0; i < ids.length; i++) {
    results.push(await fetchProfile(ids[i])); // each await WAITS for the last
  }
  return results;
}
```

The `await` is *inside* the loop, so iteration 2 cannot start until iteration 1 finishes. Twenty independent requests, forced into single file: ~2000ms.

**Approach 2 — unbounded:**

```js
return Promise.all(ids.map(function (id) { return fetchProfile(id); }));
```

`ids.map(...)` calls `fetchProfile` for all 20 ids immediately — 20 promises, all in flight at once — then `Promise.all` waits for them. ~100ms total. Fast... and with 2,000 ids it's a machine-gun aimed at the server.

The file ends by naming the gap: "at most 5 in flight" — neither approach can say that.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: `await` in a loop serializes independent work.** Each profile fetch doesn't depend on the previous one — yet the loop makes each wait for the last. Here's how it bites you: your page needs 50 thumbnails; each takes 200ms. Sequential = 10 full seconds of spinner. Users leave. The rule of thumb: `await` inside a loop is a *queue*. Queues are right when step N needs step N−1's answer, and an accident otherwise.

**Flaw 2: `Promise.all` on everything has no ceiling.** All requests launch at the same instant. At 20 it works; at 2,000 the server rate-limits you (429s), drops connections, or your laptop exhausts its sockets. Here's how it bites you: your import script works fine in testing with 30 records, then a customer uploads 10,000 and the whole batch fails at 2 a.m. with cryptic network errors. The code was never wrong on small inputs — that's what makes it dangerous.

**The missing piece:** a *concurrency limit* — full speed, but never more than N in flight. Neither pattern has a place to put that number.

## 5. Try it yourself first!

1. **Vague hint:** You want exactly 5 things running at once. What if you started exactly 5 "runners," each of which keeps grabbing the next unstarted job?
2. **Warmer:** Keep a shared counter `nextIndex = 0`. Each runner loops: claim `const i = nextIndex++`, then `await tasks[i]()`, then loop again. When `nextIndex` passes the end, that runner stops.
3. **Warmer still:** the runners are just async functions. Start `limit` of them and `await Promise.all(runners)` — the pool is done when all runners are done.
4. **Result order:** store each answer with `results[i] = ...` (the claimed index), not `results.push(...)`. Why? Runners finish in scrambled order; slots keep results in task order.
5. **Sanity checks:** what should happen with an empty task list? A limit of 0? A limit bigger than the task count? Decide before you code.

## 6. Understanding the refactored solution

The whole engine:

```js
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
```

**The worker-pool idea in three sentences.** Start `limit` workers. Each worker claims the next unclaimed task index, awaits that task, stores the result in the task's original slot, and repeats until nothing is left. Concurrency can't exceed `limit` *by construction* — there are only `limit` workers to do anything.

**Why `nextIndex++` is safe without a lock.** Two workers "grabbing the same task" would be a disaster — but it can't happen here. JavaScript is single-threaded: workers only swap in and out **at `await` points**. `const index = nextIndex++` is plain synchronous code between awaits, so it always runs whole. Truly understanding this line is understanding async JavaScript: interleaving happens *between* awaits, never inside a synchronous stretch.

**`results[index] = await ...` keeps task order.** Task 0 might be slow and task 1 fast — completion order scrambles — but each result lands in its task's original slot, so the returned array matches the input order. There's a test proving it with a deliberately slow task 0.

**Small hardening:** the limit is validated (`RangeError` for 0 or 2.5), `Math.min(limit, tasks.length)` avoids starting pointless extra workers, and a task that throws rejects the whole run (same policy as `Promise.all`).

**The tests instrument concurrency itself.** The clever bit in `makeInstrumentedTasks`: every task increments a shared `active` counter when it starts, records the peak, and decrements when done. Then the test asserts `peak <= 3` — it measures the *actual promise of the abstraction* ("never more than 3 at once"), not just the return values. It also asserts `peak >= 2`, catching the opposite bug (accidentally sequential). Other tests: order preservation, every-task-runs-exactly-once, empty list, oversized limit, and error propagation via `assert.rejects`.

## 7. Words you learned (glossary)

- **Asynchronous (async)** — starting slow work without freezing the program.
- **setTimeout** — run a function after a delay in milliseconds.
- **Promise** — an object standing for a value that arrives later.
- **resolve / reject** — a Promise succeeding with a value / failing with an error.
- **async / await** — mark a function as promise-returning / pause it until a promise settles.
- **Promise.all** — wait for many promises; results in input order; rejects on first failure.
- **Single-threaded** — one line executes at a time, never two at once.
- **Concurrency** — many operations mid-flight (waiting counts, executing doesn't).
- **Race condition** — two threads colliding over shared data (impossible in JS's synchronous stretches).
- **Lock** — a multi-threading tool JS doesn't need here.
- **Serialization (accidental)** — forcing independent work into single file with `await` in a loop.
- **Rate limit / 429** — a server's cap on requests, and the error code for exceeding it.
- **Socket** — the OS-level channel a network connection uses.
- **DoS** — denial of service: overwhelming a server with requests.
- **Worker pool** — N runners sharing a queue of tasks; N is the concurrency knob.
- **Instrumented test** — a test that measures behavior (peak concurrency) rather than just outputs.
- **RangeError** — the error type for numbers outside the allowed range.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the knob.** Copy `runWithLimit` into a scratch file with the `fetchProfile` simulator and 20 ids. Wrap calls in `console.time`/`console.timeEnd` with limits 1, 5, and 20. Expected: ~2000ms, ~400ms, ~100ms — limit 1 is the sequential original, limit 20 is the unbounded one; the pool contains both as special cases.
2. **Watch the interleaving.** Add `console.log("worker got task", index)` right after `const index = nextIndex++`. Run with limit 3. Expected: tasks 0, 1, 2 claimed immediately, then a new claim each time one finishes.
3. **Break the ordering on purpose.** Change `results[index] = await tasks[index]()` to `results.push(await tasks[index]())` and run the "results come back in task order" test idea by hand (slow task first). Expected: `['fast', 'slow']` — scrambled. Undo it.
4. **Prove the claim-line safety.** Try to construct two workers grabbing the same index: add `await sleep(0)` *between* reading `nextIndex` and incrementing it (split `nextIndex++` into `const index = nextIndex; await sleep(0); nextIndex = index + 1`). Expected: tasks now run twice — you manufactured a race by putting an await inside the claim. That's why the real code keeps the claim synchronous.
5. **Change the error policy.** Wrap `await tasks[index]()` in try/catch and store `{ error: e.message }` in the slot instead of letting it reject. Expected: the "task error rejects the whole run" test would fail, but you get all successful results plus error markers — the `Promise.allSettled` philosophy. Both policies are legitimate; the point is choosing one on purpose.
